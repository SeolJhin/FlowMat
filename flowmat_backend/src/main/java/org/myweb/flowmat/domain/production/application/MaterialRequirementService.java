package org.myweb.flowmat.domain.production.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.bom.api.dto.response.BomRequirementResponse;
import org.myweb.flowmat.domain.bom.application.BomService;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.production.api.dto.response.MaterialRequirementResponse;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.myweb.flowmat.domain.production.domain.entity.WorkOrder;
import org.myweb.flowmat.domain.production.repository.ProductionRunRepository;
import org.myweb.flowmat.domain.production.repository.WorkOrderRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.springframework.stereotype.Service;

/**
 * Material needs of all open work orders (docs/domain/material-requirements.md): for each approved or in-progress
 * order with a BOM, what is still to make (target − finished runs' output, as readiness counts it) turned into
 * materials by the BOM, less what the order's unfinished runs already recorded as input, added up per material and set
 * against the usable stock (the reorder list's rule). Like
 * readiness it has no surrounding transaction, so an order whose BOM cannot be worked out is reported, not rolled back.
 */
@Service
@RequiredArgsConstructor
public class MaterialRequirementService {

    private static final String NOT_DELETED = "N";
    private static final int SCALE = 4;

    private final WorkOrderRepository workOrderRepository;
    private final ProductionRunRepository productionRunRepository;
    private final BomService bomService;
    private final ItemRepository itemRepository;
    private final UsableStock usableStock;
    private final ProjectAccessService projectAccessService;
    private final OpenRunInputs openRunInputs;

    public MaterialRequirementResponse summary(String projectId) {
        projectAccessService.requireProjectReadAccess(projectId);
        List<WorkOrder> open = workOrderRepository.findAllByProjectIdAndDeletedYnOrderByCreatedAtDesc(projectId, NOT_DELETED).stream()
            .filter(order -> WorkOrderServiceImpl.status(order).acceptsRuns())
            .filter(order -> order.getBomId() != null && order.getTargetQuantity() != null)
            .toList();
        Map<String, BigDecimal> produced = new HashMap<>();
        // Per order and material: what its unfinished runs already recorded as input. That stock is already gone, while
        // the order's remaining quantity still counts it, so it comes off the order's need.
        Map<String, Map<String, BigDecimal>> alreadyUsed = new HashMap<>();
        if (!open.isEmpty()) {
            List<ProductionRun> runs = productionRunRepository.findAllByWorkOrderIdInAndDeletedYn(
                open.stream().map(WorkOrder::getWorkOrderId).toList(), NOT_DELETED);
            for (ProductionRun run : runs) {
                if ("finished".equalsIgnoreCase(run.getRunStatus()) && run.getActualOutputQty() != null) {
                    produced.merge(run.getWorkOrderId(), run.getActualOutputQty(), BigDecimal::add);
                }
            }
            alreadyUsed.putAll(openRunInputs.byOrder(runs));
        }

        Map<String, BigDecimal> required = new LinkedHashMap<>();
        Map<String, String> units = new HashMap<>();
        Map<String, List<MaterialRequirementResponse.Need>> needs = new HashMap<>();
        List<String> problems = new ArrayList<>();
        int counted = 0;
        for (WorkOrder order : open) {
            BigDecimal remaining = order.getTargetQuantity().subtract(produced.getOrDefault(order.getWorkOrderId(), BigDecimal.ZERO));
            if (remaining.signum() <= 0) {
                continue;
            }
            BomRequirementResponse requirement;
            try {
                requirement = bomService.requirementsForRun(order.getBomId(), projectId, order.getTargetItemId(), remaining);
            } catch (BusinessException exception) {
                problems.add(order.getWorkOrderTitle() + ": " + exception.getMessage());
                continue;
            }
            counted++;
            Map<String, BigDecimal> used = alreadyUsed.getOrDefault(order.getWorkOrderId(), Map.of());
            for (BomRequirementResponse.Line line : requirement.lines()) {
                BigDecimal need = line.requiredItemQuantity().subtract(used.getOrDefault(line.childItemId(), BigDecimal.ZERO)).max(BigDecimal.ZERO);
                required.merge(line.childItemId(), need, BigDecimal::add);
                units.putIfAbsent(line.childItemId(), line.itemUnit());
                needs.computeIfAbsent(line.childItemId(), id -> new ArrayList<>())
                    .add(new MaterialRequirementResponse.Need(order.getWorkOrderId(), order.getWorkOrderTitle(), scale(need)));
            }
        }

        Map<String, BigDecimal> usable = usableStock.byItem(projectId, required.keySet());
        Map<String, Item> items = StreamSupport.stream(itemRepository.findAllById(required.keySet()).spliterator(), false)
            .collect(Collectors.toMap(Item::getItemId, Function.identity()));
        List<MaterialRequirementResponse.Line> lines = required.entrySet().stream()
            .map(entry -> {
                Item item = items.get(entry.getKey());
                BigDecimal free = usable.getOrDefault(entry.getKey(), BigDecimal.ZERO);
                return new MaterialRequirementResponse.Line(
                    entry.getKey(),
                    item == null ? null : item.getItemCode(),
                    item == null ? null : item.getItemName(),
                    units.get(entry.getKey()),
                    scale(entry.getValue()),
                    scale(free),
                    scale(entry.getValue().subtract(free).max(BigDecimal.ZERO)),
                    needs.getOrDefault(entry.getKey(), List.of())
                );
            })
            .sorted(Comparator.comparing(MaterialRequirementResponse.Line::shortage).reversed()
                .thenComparing(MaterialRequirementResponse.Line::itemCode, Comparator.nullsLast(Comparator.naturalOrder())))
            .toList();
        return new MaterialRequirementResponse(counted, lines, problems);
    }

    private static BigDecimal scale(BigDecimal value) {
        return value.setScale(SCALE, RoundingMode.HALF_UP);
    }
}
