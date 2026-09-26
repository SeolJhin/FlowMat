package org.myweb.flowmat.domain.production.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.bom.api.dto.response.BomRequirementResponse;
import org.myweb.flowmat.domain.bom.application.BomService;
import org.myweb.flowmat.domain.bom.domain.entity.BomHeader;
import org.myweb.flowmat.domain.bom.repository.BomHeaderRepository;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.domain.entity.LotMaster;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.inventory.repository.LotMasterRepository;
import org.myweb.flowmat.domain.production.api.dto.response.WorkOrderReadinessResponse;
import org.myweb.flowmat.domain.production.api.dto.response.WorkOrderReadinessResponse.Check;
import org.myweb.flowmat.domain.production.api.dto.response.WorkOrderReadinessResponse.Material;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.myweb.flowmat.domain.production.domain.entity.WorkOrder;
import org.myweb.flowmat.domain.production.domain.enums.WorkOrderStatus;
import org.myweb.flowmat.domain.production.repository.ProductionRunRepository;
import org.myweb.flowmat.domain.production.repository.WorkOrderRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.domain.workflow.repository.WorkflowRevisionRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Read-only check of whether a work order can run now (docs/domain/work-order-readiness.md). It deliberately has no
 * surrounding transaction: a failing BOM calculation is reported as a failed check instead of rolling anything back.
 */
@Service
@RequiredArgsConstructor
public class WorkOrderReadinessService {

    static final String OK = "ok";
    static final String WARN = "warn";
    static final String FAIL = "fail";
    private static final String NOT_DELETED = "N";

    private final WorkOrderRepository workOrderRepository;
    private final ProductionRunRepository productionRunRepository;
    private final WorkflowRevisionRepository workflowRevisionRepository;
    private final BomHeaderRepository bomHeaderRepository;
    private final BomService bomService;
    private final ItemRepository itemRepository;
    private final InventoryRepository inventoryRepository;
    private final LotMasterRepository lotMasterRepository;
    private final OpenRunInputs openRunInputs;

    /** LOTs expiring within this many days are called out (same setting as the stock alerts). */
    @Value("${app.stock-alert.expiry-warning-days:7}")
    private int expiryWarningDays;
    private final ProjectAccessService projectAccessService;

    public WorkOrderReadinessResponse check(String workOrderId) {
        WorkOrder order = workOrderRepository.findByWorkOrderIdAndDeletedYn(workOrderId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        projectAccessService.requireProjectReadAccess(order.getProjectId());
        List<Check> checks = new ArrayList<>();

        WorkOrderStatus status = WorkOrderServiceImpl.status(order);
        if (status.acceptsRuns()) {
            checks.add(new Check("status", OK, "Work order is " + order.getWorkOrderStatus() + "."));
        } else if (status == WorkOrderStatus.DRAFT) {
            checks.add(new Check("status", FAIL, "Approve the work order before starting a run."));
        } else {
            checks.add(new Check("status", FAIL, "Work order is " + order.getWorkOrderStatus() + "; it takes no more runs."));
        }

        if (order.getWorkflowId() == null) {
            checks.add(new Check("workflow", FAIL, "Choose the workflow the order runs on."));
        } else {
            checks.add(workflowRevisionRepository.findTopByWorkflowIdAndStatusOrderByRevisionNoDesc(order.getWorkflowId(), "published")
                .map(revision -> new Check("workflow", OK, "Runs start on workflow revision v" + revision.getRevisionNo() + "."))
                .orElseGet(() -> new Check("workflow", WARN,
                    "The workflow has no published revision; publish one so runs are fixed to a version.")));
        }

        BigDecimal remaining = remainingQuantity(order);
        if (order.getTargetItemId() == null) {
            checks.add(new Check("target", WARN, "No target item; what the runs produce is not checked."));
        }
        if (remaining == null) {
            checks.add(new Check("quantity", WARN, "No target quantity; materials are not checked."));
        } else if (remaining.signum() <= 0) {
            checks.add(new Check("quantity", WARN, "The target quantity has already been produced."));
        } else {
            checks.add(new Check("quantity", OK, "Still to produce: " + plain(remaining) + "."));
        }

        List<Material> materials = new ArrayList<>();
        BomHeader bom = order.getBomId() == null
            ? null
            : bomHeaderRepository.findByBomIdAndDeletedYn(order.getBomId(), NOT_DELETED).orElse(null);
        if (order.getBomId() == null) {
            checks.add(new Check("bom", WARN, "No BOM; materials are neither planned nor checked."));
        } else if (bom == null) {
            checks.add(new Check("bom", FAIL, "The work order's BOM no longer exists."));
        } else if (!"approved".equals(bom.getBomStatus())) {
            checks.add(new Check("bom", FAIL,
                "BOM " + bom.getBomName() + " v" + bom.getBomVersion() + " is " + bom.getBomStatus() + "; approve it first."));
        } else {
            checks.add(new Check("bom", OK, "BOM " + bom.getBomName() + " v" + bom.getBomVersion() + " is approved."));
            if (remaining != null && remaining.signum() > 0) {
                materials = materials(order, bom, remaining, checks);
            }
        }

        boolean ready = checks.stream().noneMatch(check -> FAIL.equals(check.status()));
        return new WorkOrderReadinessResponse(order.getWorkOrderId(), ready, remaining, checks, materials);
    }

    private List<Material> materials(WorkOrder order, BomHeader bom, BigDecimal remaining, List<Check> checks) {
        BomRequirementResponse requirement;
        try {
            requirement = bomService.requirementsForRun(bom.getBomId(), order.getProjectId(), order.getTargetItemId(), remaining);
        } catch (BusinessException exception) {
            checks.add(new Check("materials", FAIL, "Materials could not be calculated: " + exception.getMessage()));
            return List.of();
        }

        List<Inventory> stock = inventoryRepository.findAllByProjectIdAndDeletedYnOrderByCreatedAtAsc(order.getProjectId(), NOT_DELETED);
        Set<String> lotIds = new HashSet<>();
        stock.forEach(row -> {
            if (row.getLotId() != null) {
                lotIds.add(row.getLotId());
            }
        });
        Map<String, String> lotStatus = new HashMap<>();
        Set<String> expiredLots = new HashSet<>();
        Map<String, LotMaster> lotsById = new HashMap<>();
        LocalDate today = LocalDate.now();
        lotMasterRepository.findAllById(lotIds).forEach(lot -> {
            lotsById.put(lot.getLotId(), lot);
            lotStatus.put(lot.getLotId(), lot.getLotStatus() == null ? "" : lot.getLotStatus());
            if (lot.isExpiredOn(today)) {
                expiredLots.add(lot.getLotId());
            }
        });
        // Usable LOTs that expire within the warning window: counted, but worth using first.
        Map<String, String> expiringSoon = new java.util.LinkedHashMap<>();

        List<Material> materials = new ArrayList<>();
        List<String> shortages = new ArrayList<>();
        // What this order's unfinished runs already put in has left stock, so it is not needed again.
        Map<String, BigDecimal> alreadyUsed = openRunInputs.forOrder(order.getWorkOrderId());
        for (BomRequirementResponse.Line line : requirement.lines()) {
            Item item = itemRepository.findByItemIdAndDeletedYn(line.childItemId(), NOT_DELETED).orElse(null);
            boolean lotTracked = item != null && "Y".equals(item.getLotManageYn());
            BigDecimal available = BigDecimal.ZERO;
            Set<String> usableLots = new HashSet<>();
            for (Inventory row : stock) {
                if (!line.childItemId().equals(row.getItemId()) || "quarantined".equals(row.getInventoryStatus())) {
                    continue;
                }
                if (row.getLotId() != null && ("closed".equals(lotStatus.get(row.getLotId())) || expiredLots.contains(row.getLotId()))) {
                    continue;
                }
                BigDecimal free = zeroIfNull(row.getQuantity()).subtract(zeroIfNull(row.getReservedQuantity()));
                if (free.signum() > 0) {
                    available = available.add(free);
                    if (row.getLotId() != null) {
                        usableLots.add(row.getLotId());
                        LotMaster lot = lotsById.get(row.getLotId());
                        if (lot != null && lot.getExpiryDate() != null && !lot.getExpiryDate().isAfter(today.plusDays(expiryWarningDays))) {
                            expiringSoon.putIfAbsent(lot.getLotId(), "LOT " + lot.getLotNo() + " of "
                                + (item != null ? item.getItemCode() : line.childItemId()) + " expires on " + lot.getExpiryDate());
                        }
                    }
                }
            }
            BigDecimal required = line.requiredItemQuantity().subtract(alreadyUsed.getOrDefault(line.childItemId(), BigDecimal.ZERO))
                .max(BigDecimal.ZERO);
            BigDecimal shortage = required.subtract(available).max(BigDecimal.ZERO).setScale(4, RoundingMode.HALF_UP);
            String code = item != null ? item.getItemCode() : line.childItemId();
            if (shortage.signum() > 0) {
                shortages.add(code + " (need " + plain(required) + " " + line.itemUnit() + ", available " + plain(available) + ")");
            }
            materials.add(new Material(line.childItemId(), code, item != null ? item.getItemName() : null, required,
                line.itemUnit(), available, shortage, lotTracked, lotTracked ? usableLots.size() : 0));
        }
        checks.add(shortages.isEmpty()
            ? new Check("materials", OK, "Materials for " + plain(remaining) + " are in stock.")
            : new Check("materials", FAIL, "Short of " + String.join(", ", shortages) + "."));
        if (!expiringSoon.isEmpty()) {
            List<String> soon = new ArrayList<>(expiringSoon.values());
            String listed = String.join("; ", soon.subList(0, Math.min(3, soon.size())))
                + (soon.size() > 3 ? "; and " + (soon.size() - 3) + " more" : "");
            checks.add(new Check("expiry", WARN, listed + ". Use these first."));
        }
        // What the remaining quantity's materials cost at today's unit costs (docs/domain/material-cost.md).
        checks.add(new Check("cost", OK, "Estimated material cost: " + plain(requirement.materialCost())
            + (requirement.costComplete() ? "." : " (some materials have no unit cost, so they are left out).")));
        return materials;
    }

    /** Target minus what finished runs of this order produced; null without a target quantity. */
    private BigDecimal remainingQuantity(WorkOrder order) {
        if (order.getTargetQuantity() == null) {
            return null;
        }
        BigDecimal produced = productionRunRepository.findAllByWorkOrderIdInAndDeletedYn(List.of(order.getWorkOrderId()), NOT_DELETED)
            .stream()
            .filter(run -> "finished".equalsIgnoreCase(run.getRunStatus()))
            .map(ProductionRun::getActualOutputQty)
            .filter(qty -> qty != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return order.getTargetQuantity().subtract(produced);
    }

    private static BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static String plain(BigDecimal value) {
        return zeroIfNull(value).stripTrailingZeros().toPlainString();
    }
}
