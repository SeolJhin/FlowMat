package org.myweb.flowmat.domain.production.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.application.UnitConverter;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.domain.entity.UnitMaster;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.catalog.repository.UnitMasterRepository;
import org.myweb.flowmat.domain.production.api.dto.response.RunCostResponse;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRunItem;
import org.myweb.flowmat.domain.production.repository.ProductionRunItemRepository;
import org.myweb.flowmat.domain.production.repository.ProductionRunRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A run's material cost (docs/domain/material-cost.md "실행 재료비"): every input recording that counts (not cancelled,
 * with an actual quantity) converted to its item's own unit and priced at the item's unit cost. Read only; the run and
 * its recordings are not changed.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RunCostService {

    private static final int SCALE = 4;

    private final ProductionRunRepository productionRunRepository;
    private final ProductionRunItemRepository productionRunItemRepository;
    private final ItemRepository itemRepository;
    private final UnitConverter unitConverter;
    private final UnitMasterRepository unitMasterRepository;
    private final ProjectAccessService projectAccessService;

    public RunCostResponse cost(String productionRunId) {
        ProductionRun run = productionRunRepository.findByProductionRunIdAndDeletedYn(productionRunId, "N")
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        projectAccessService.requireProjectReadAccess(run.getProjectId());

        // Add each item's recordings up in the item's own unit; a unit that cannot be converted leaves the cost unknown.
        Map<String, BigDecimal> quantityByItem = new LinkedHashMap<>();
        Map<String, Boolean> convertible = new LinkedHashMap<>();
        Map<String, Item> items = new LinkedHashMap<>();
        for (ProductionRunItem recording : productionRunItemRepository.findAllByProductionRunIdOrderByProductionRunItemIdAsc(productionRunId)) {
            if (!"input".equals(recording.getDirection()) || recording.isCancelled() || recording.getActualQty() == null) {
                continue;
            }
            Item item = items.computeIfAbsent(recording.getItemId(), id -> itemRepository.findById(id).orElse(null));
            if (item == null) {
                continue;
            }
            convertible.putIfAbsent(item.getItemId(), true);
            try {
                BigDecimal inItemUnit = unitConverter.toItemUnit(recording.getActualQty(), recording.getUnit(), item.getUnitId()).quantity();
                quantityByItem.merge(item.getItemId(), inItemUnit, BigDecimal::add);
            } catch (BusinessException e) {
                convertible.put(item.getItemId(), false);
            }
        }

        List<RunCostResponse.Line> lines = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        boolean complete = true;
        for (Map.Entry<String, Boolean> entry : convertible.entrySet()) {
            Item item = items.get(entry.getKey());
            BigDecimal quantity = quantityByItem.getOrDefault(item.getItemId(), BigDecimal.ZERO).setScale(SCALE, RoundingMode.HALF_UP);
            BigDecimal unitCost = item.getUnitCost() != null && item.getUnitCost().signum() > 0 ? item.getUnitCost() : null;
            BigDecimal cost = entry.getValue() && unitCost != null ? quantity.multiply(unitCost).setScale(SCALE, RoundingMode.HALF_UP) : null;
            if (cost == null) {
                complete = false;
            } else {
                total = total.add(cost);
            }
            lines.add(new RunCostResponse.Line(item.getItemId(), item.getItemCode(), item.getItemName(),
                entry.getValue() ? quantity : null, unitCodeOf(item), unitCost, cost));
        }
        BigDecimal output = run.getActualOutputQty();
        BigDecimal perUnit = complete && output != null && output.signum() > 0
            ? total.divide(output, SCALE, RoundingMode.HALF_UP)
            : null;
        return new RunCostResponse(run.getProductionRunId(), total.setScale(SCALE, RoundingMode.HALF_UP), complete, output, perUnit, lines);
    }

    private String unitCodeOf(Item item) {
        return item.getUnitId() == null ? null
            : unitMasterRepository.findById(item.getUnitId()).map(UnitMaster::getUnitCode).orElse(null);
    }
}
