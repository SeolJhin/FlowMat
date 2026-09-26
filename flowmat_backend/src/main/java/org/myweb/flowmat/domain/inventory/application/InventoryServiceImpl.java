package org.myweb.flowmat.domain.inventory.application;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.application.ItemStatusRule;
import org.myweb.flowmat.domain.inventory.domain.enums.InventoryTransactionType;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.inventory.api.dto.request.InventoryAdjustRequest;
import org.myweb.flowmat.domain.inventory.api.dto.response.InventoryResponse;
import org.myweb.flowmat.domain.rule.application.FlowRuleEngineService;
import org.myweb.flowmat.domain.rule.application.RuleEvaluationContext;
import org.myweb.flowmat.domain.rule.application.RuleTarget;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.inventory.repository.LotMasterRepository;
import org.myweb.flowmat.domain.inventory.domain.entity.LotMaster;
import org.myweb.flowmat.domain.inventory.domain.enums.LotStatus;
import java.util.stream.Collectors;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryServiceImpl implements InventoryService {

    private static final String NOT_DELETED = "N";
    private static final String DELETED = "Y";

    private final InventoryRepository inventoryRepository;
    private final ProjectAccessService projectAccessService;
    private final ItemRepository itemRepository;
    private final InventoryCommandService inventoryCommandService;
    private final FlowRuleEngineService flowRuleEngineService;
    private final IdGenerator idGenerator;
    private final LotService lotService;
    private final LotMasterRepository lotMasterRepository;

    @Override
    public List<InventoryResponse> listInventories(String projectId) {
        projectAccessService.requireProjectReadAccess(projectId);
        List<Inventory> rows = inventoryRepository.findAllByProjectIdAndDeletedYnOrderByCreatedAtAsc(projectId, NOT_DELETED);
        Map<String, String> lotNos = lotMasterRepository.findAllById(
                rows.stream().map(Inventory::getLotId).filter(Objects::nonNull).distinct().toList())
            .stream().collect(Collectors.toMap(LotMaster::getLotId, LotMaster::getLotNo));
        return rows.stream().map(row -> toResponse(row, lotNos.get(row.getLotId()))).toList();
    }

    @Override
    @Transactional
    public InventoryResponse createInventory(InventoryAdjustRequest request) {
        projectAccessService.requireProjectWriteAccess(request.projectId());
        Item item = findActiveItem(request.itemId());
        validateSameProject(request.projectId(), item.getProjectId());
        ItemStatusRule.requireActive(item, "receive stock");
        evaluateRules(
            request.projectId(),
            List.of(
                new RuleTarget("project", request.projectId()),
                new RuleTarget("item", item.getItemId())
            ),
            Map.of(
                "operation", "inventory_create",
                "request", request,
                "item", item
            )
        );

        // LOT-tracked items hold stock per LOT; everything else never names one.
        String lotId = trimToNull(request.lotId());
        if ("Y".equals(item.getLotManageYn())) {
            if (lotId == null) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                    item.getItemCode() + " is LOT-tracked; choose a LOT for this stock record.");
            }
            LotMaster lot = lotService.requireLotForStock(lotId, item.getProjectId(), item.getItemId());
            // One stock record per item + location + LOT (V17 unique index); say so instead of a bare conflict. Taking turns
            // with anything else creating that record (another Add Stock, a transfer) makes the check hold until commit.
            inventoryRepository.lockStockPlace(item.getProjectId(), item.getItemId(), lotId, trimToNull(request.location()));
            if (inventoryRepository.existsLotStockAt(item.getProjectId(), item.getItemId(), lotId, trimToNull(request.location()))) {
                throw new BusinessException(ErrorCode.CONFLICT,
                    "LOT " + lot.getLotNo() + " already has a stock record"
                        + (trimToNull(request.location()) != null ? " at " + request.location().trim() : " without a location")
                        + ". Receive into that record instead.");
            }
        } else if (lotId != null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                item.getItemCode() + " is not LOT-tracked; its stock records cannot name a LOT.");
        }

        Inventory inventory = new Inventory();
        inventory.setInventoryId(idGenerator.generate());
        inventory.setProjectId(request.projectId().trim());
        inventory.setItemId(item.getItemId());
        inventory.setLotId(lotId);
        applyQuantities(inventory, request);
        inventory.setLocation(trimToNull(request.location()));
        inventory.setInventoryStatus(defaultIfBlank(request.inventoryStatus(), "available"));
        applyThresholds(inventory, request);
        inventory.setDeletedYn(NOT_DELETED);
        Inventory savedInventory = inventoryRepository.saveAndFlush(inventory);
        inventoryCommandService.record(
            savedInventory,
            InventoryTransactionType.RECEIPT,
            savedInventory.getQuantity(),
            savedInventory.getReservedQuantity(),
            "inventory",
            savedInventory.getInventoryId(),
            "Stock record created",
            null,
            projectAccessService.requireCurrentUserId()
        );
        if (lotId != null) {
            inventoryCommandService.syncLotStatus(lotId);
        }
        return toResponse(savedInventory);
    }

    @Override
    public InventoryResponse getInventory(String inventoryId) {
        Inventory inventory = findActiveInventory(inventoryId);
        projectAccessService.requireProjectReadAccess(inventory.getProjectId());
        return toResponse(inventory);
    }

    @Override
    @Transactional
    public InventoryResponse updateInventory(String inventoryId, InventoryAdjustRequest request) {
        Inventory inventory = findActiveInventory(inventoryId);
        projectAccessService.requireProjectWriteAccess(inventory.getProjectId());
        // The adjustment replaces absolute quantities, so it must be based on what is stored now.
        if (request.expectedVersion() != null && !request.expectedVersion().equals(inventory.getVersion())) {
            throw new BusinessException(ErrorCode.CONFLICT,
                "This stock record changed since you opened it (now " + inventory.getQuantity().stripTrailingZeros().toPlainString()
                    + " on hand). Reload and try again.");
        }
        Item item = findActiveItem(request.itemId());
        validateSameProject(inventory.getProjectId(), request.projectId());
        validateSameProject(inventory.getProjectId(), item.getProjectId());
        evaluateRules(
            inventory.getProjectId(),
            List.of(
                new RuleTarget("project", inventory.getProjectId()),
                new RuleTarget("item", item.getItemId()),
                new RuleTarget("inventory", inventory.getInventoryId())
            ),
            Map.of(
                "operation", "inventory_update",
                "request", request,
                "inventory", inventory,
                "item", item
            )
        );

        BigDecimal quantityBefore = inventory.getQuantity();
        BigDecimal reservedBefore = inventory.getReservedQuantity();

        if (!item.getItemId().equals(inventory.getItemId())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "A stock record keeps its item. Issue this stock and receive the other item instead.");
        }
        if (request.lotId() != null && !request.lotId().isBlank() && !request.lotId().trim().equals(inventory.getLotId())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "A stock record keeps its LOT. Reverse or issue this stock and receive it into the other LOT.");
        }
        if (inventory.getLotId() != null) {
            lotMasterRepository.findById(inventory.getLotId())
                .filter(lot -> LotStatus.CLOSED.code().equals(lot.getLotStatus()))
                .ifPresent(lot -> {
                    throw new BusinessException(ErrorCode.BAD_REQUEST, "LOT " + lot.getLotNo() + " is closed.");
                });
        }
        applyQuantities(inventory, request);
        inventory.setLocation(trimToNull(request.location()));
        String status = defaultIfBlank(request.inventoryStatus(), inventory.getInventoryStatus());
        if (!Objects.equals(status, inventory.getInventoryStatus())
            && (InventoryCommandService.QUARANTINED.equals(status)
                || InventoryCommandService.QUARANTINED.equals(inventory.getInventoryStatus()))) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "Use a quarantine or unquarantine transaction to change quarantine status.");
        }
        inventory.setInventoryStatus(status);
        applyThresholds(inventory, request);
        Inventory savedInventory = inventoryRepository.saveAndFlush(inventory);

        BigDecimal quantityDelta = savedInventory.getQuantity().subtract(quantityBefore);
        BigDecimal reservedDelta = savedInventory.getReservedQuantity().subtract(defaultIfNull(reservedBefore, BigDecimal.ZERO));
        if (quantityDelta.signum() != 0 || reservedDelta.signum() != 0) {
            inventoryCommandService.record(
                savedInventory,
                InventoryTransactionType.ADJUSTMENT,
                quantityDelta,
                reservedDelta,
                "inventory",
                savedInventory.getInventoryId(),
                "Stock record adjusted",
                null,
                projectAccessService.requireCurrentUserId()
            );
        }
        if (savedInventory.getLotId() != null) {
            inventoryCommandService.syncLotStatus(savedInventory.getLotId());
        }
        // Thresholds may have moved even when the quantities did not.
        inventoryCommandService.refreshAlerts(savedInventory);
        return toResponse(savedInventory);
    }

    /** Absolute quantities from the form, checked against the stock invariants before anything is written. */
    private static void applyQuantities(Inventory inventory, InventoryAdjustRequest request) {
        BigDecimal quantity = request.quantity();
        BigDecimal reserved = defaultIfNull(request.reservedQuantity(), BigDecimal.ZERO);
        if (quantity.signum() < 0 || reserved.signum() < 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Stock quantities cannot be negative.");
        }
        if (reserved.compareTo(quantity) > 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Reserved stock cannot exceed the quantity on hand.");
        }
        BigDecimal available = quantity.subtract(reserved);
        if (request.availableQuantity() != null && request.availableQuantity().compareTo(available) != 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Available stock is always quantity minus reserved.");
        }
        inventory.setQuantity(quantity);
        inventory.setReservedQuantity(reserved);
        inventory.setAvailableQuantity(available);
    }

    @Override
    @Transactional
    public void deleteInventory(String inventoryId) {
        Inventory inventory = findActiveInventory(inventoryId);
        projectAccessService.requireProjectOwnerAccess(inventory.getProjectId());
        evaluateRules(
            inventory.getProjectId(),
            List.of(
                new RuleTarget("project", inventory.getProjectId()),
                new RuleTarget("inventory", inventory.getInventoryId())
            ),
            Map.of(
                "operation", "inventory_delete",
                "inventory", inventory
            )
        );
        // Removing a record that still holds stock would make that stock vanish without a movement.
        if (defaultIfNull(inventory.getQuantity(), BigDecimal.ZERO).signum() != 0
            || defaultIfNull(inventory.getReservedQuantity(), BigDecimal.ZERO).signum() != 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "This record still holds " + InventoryCommandService.plain(inventory.getQuantity())
                    + ". Issue or adjust it to zero before deleting.");
        }
        inventory.setDeletedYn(DELETED);
        inventoryRepository.save(inventory);
        // A deleted row has nothing left to watch; its open alerts close.
        inventoryCommandService.refreshAlerts(inventory);
    }

    private Item findActiveItem(String itemId) {
        return itemRepository.findByItemIdAndDeletedYn(itemId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private Inventory findActiveInventory(String inventoryId) {
        return inventoryRepository.findByInventoryIdAndDeletedYn(inventoryId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    /** Full replacement like the rest of the adjust request: omitted minimum means 0, omitted maximum means none. */
    private static void applyThresholds(Inventory inventory, InventoryAdjustRequest request) {
        BigDecimal min = defaultIfNull(request.minThreshold(), BigDecimal.ZERO);
        BigDecimal max = request.maxThreshold();
        if (min.signum() < 0 || (max != null && max.signum() < 0)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Stock thresholds cannot be negative.");
        }
        if (max != null && max.compareTo(min) < 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Maximum stock must be at least the minimum.");
        }
        inventory.setMinThreshold(min);
        inventory.setMaxThreshold(max);
    }

    static String stockLevel(Inventory inventory) {
        BigDecimal min = inventory.getMinThreshold();
        BigDecimal max = inventory.getMaxThreshold();
        BigDecimal available = defaultIfNull(inventory.getAvailableQuantity(), BigDecimal.ZERO);
        BigDecimal onHand = defaultIfNull(inventory.getQuantity(), BigDecimal.ZERO);
        if (min != null && min.signum() > 0 && available.compareTo(min) < 0) {
            return "low";
        }
        if (max != null && onHand.compareTo(max) > 0) {
            return "over";
        }
        return "ok";
    }

    private InventoryResponse toResponse(Inventory inventory) {
        String lotNo = inventory.getLotId() == null
            ? null
            : lotMasterRepository.findById(inventory.getLotId()).map(LotMaster::getLotNo).orElse(null);
        return toResponse(inventory, lotNo);
    }

    private static InventoryResponse toResponse(Inventory inventory, String lotNo) {
        return new InventoryResponse(
            inventory.getInventoryId(),
            inventory.getProjectId(),
            inventory.getItemId(),
            inventory.getQuantity(),
            inventory.getReservedQuantity(),
            inventory.getAvailableQuantity(),
            inventory.getInventoryStatus(),
            inventory.getLocation(),
            inventory.getMinThreshold(),
            inventory.getMaxThreshold(),
            stockLevel(inventory),
            inventory.getVersion(),
            inventory.getLotId(),
            lotNo,
            inventory.getLastCheckedAt(),
            inventory.getLastCheckedBy()
        );
    }

    private static void validateSameProject(String expectedProjectId, String actualProjectId) {
        if (!expectedProjectId.equals(actualProjectId)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
    }

    private static String trimToNull(String value) {
        return value != null && !value.isBlank() ? value.trim() : null;
    }

    private static String defaultIfBlank(String value, String defaultValue) {
        return value != null && !value.isBlank() ? value.trim().toLowerCase() : defaultValue;
    }

    private static BigDecimal defaultIfNull(BigDecimal value, BigDecimal defaultValue) {
        return value != null ? value : defaultValue;
    }

    private void evaluateRules(String projectId, List<RuleTarget> targets, Map<String, Object> facts) {
        flowRuleEngineService.validateRules(new RuleEvaluationContext(projectId.trim(), new ArrayList<>(targets), facts));
    }
}
