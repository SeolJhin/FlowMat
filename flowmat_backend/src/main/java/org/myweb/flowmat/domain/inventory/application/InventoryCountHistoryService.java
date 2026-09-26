package org.myweb.flowmat.domain.inventory.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.domain.entity.UnitMaster;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.catalog.repository.UnitMasterRepository;
import org.myweb.flowmat.domain.inventory.api.dto.response.InventoryCountHistoryResponse;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.domain.entity.InventoryTransaction;
import org.myweb.flowmat.domain.inventory.domain.entity.LotMaster;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.inventory.repository.InventoryTransactionRepository;
import org.myweb.flowmat.domain.inventory.repository.LotMasterRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Past stock counts (docs/domain/stock-count.md "실사 이력"), rebuilt from the adjustments each count wrote to the
 * ledger, newest first. Only records with a difference were adjusted, so only they appear. A count adjustment reversed
 * later still shows here: the count did find that difference. Read only.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryCountHistoryService {

    public static final int MAX_COUNTS = 20;
    private static final int SCALE = 4;

    private final InventoryTransactionRepository transactionRepository;
    private final InventoryRepository inventoryRepository;
    private final LotMasterRepository lotMasterRepository;
    private final ItemRepository itemRepository;
    private final UnitMasterRepository unitMasterRepository;
    private final ProjectAccessService projectAccessService;

    public List<InventoryCountHistoryResponse> history(String projectId) {
        projectAccessService.requireProjectReadAccess(projectId);
        // Newest first, so the first movement seen of each count gives its place in the list.
        Map<String, List<InventoryTransaction>> byCount = new LinkedHashMap<>();
        for (InventoryTransaction movement
            : transactionRepository.findAllByProjectIdAndReferenceTypeOrderByCreatedAtDesc(projectId, InventoryCountService.REFERENCE_TYPE)) {
            if (movement.getReferenceId() == null) {
                continue;
            }
            if (!byCount.containsKey(movement.getReferenceId()) && byCount.size() == MAX_COUNTS) {
                continue;
            }
            byCount.computeIfAbsent(movement.getReferenceId(), id -> new ArrayList<>()).add(movement);
        }
        List<InventoryTransaction> all = byCount.values().stream().flatMap(List::stream).toList();
        Map<String, Inventory> records = StreamSupport.stream(inventoryRepository.findAllById(
                all.stream().map(InventoryTransaction::getInventoryId).collect(Collectors.toSet())).spliterator(), false)
            .collect(Collectors.toMap(Inventory::getInventoryId, Function.identity()));
        Map<String, Item> items = StreamSupport.stream(itemRepository.findAllById(
                all.stream().map(InventoryTransaction::getItemId).collect(Collectors.toSet())).spliterator(), false)
            .collect(Collectors.toMap(Item::getItemId, Function.identity()));
        Map<String, LotMaster> lots = StreamSupport.stream(lotMasterRepository.findAllById(
                all.stream().map(InventoryTransaction::getLotId).filter(Objects::nonNull).collect(Collectors.toSet())).spliterator(), false)
            .collect(Collectors.toMap(LotMaster::getLotId, Function.identity()));
        Map<String, String> units = StreamSupport.stream(unitMasterRepository.findAllById(
                items.values().stream().map(Item::getUnitId).filter(Objects::nonNull).collect(Collectors.toSet())).spliterator(), false)
            .collect(Collectors.toMap(UnitMaster::getUnitId, UnitMaster::getUnitCode, (first, second) -> first));

        List<InventoryCountHistoryResponse> counts = new ArrayList<>();
        for (Map.Entry<String, List<InventoryTransaction>> entry : byCount.entrySet()) {
            List<InventoryTransaction> movements = entry.getValue();
            InventoryTransaction first = movements.get(movements.size() - 1);
            BigDecimal increase = BigDecimal.ZERO;
            BigDecimal decrease = BigDecimal.ZERO;
            BigDecimal value = BigDecimal.ZERO;
            boolean complete = true;
            List<InventoryCountHistoryResponse.Line> lines = new ArrayList<>();
            for (InventoryTransaction movement : movements) {
                BigDecimal delta = movement.getQuantityDelta() == null ? BigDecimal.ZERO : movement.getQuantityDelta();
                if (delta.signum() > 0) {
                    increase = increase.add(delta);
                } else {
                    decrease = decrease.subtract(delta);
                }
                Item item = items.get(movement.getItemId());
                BigDecimal unitCost = item != null && item.getUnitCost() != null && item.getUnitCost().signum() > 0 ? item.getUnitCost() : null;
                if (unitCost == null) {
                    complete = false;
                } else {
                    value = value.add(delta.multiply(unitCost));
                }
                Inventory record = records.get(movement.getInventoryId());
                LotMaster lot = movement.getLotId() == null ? null : lots.get(movement.getLotId());
                lines.add(new InventoryCountHistoryResponse.Line(
                    movement.getInventoryId(),
                    movement.getItemId(),
                    item == null ? null : item.getItemCode(),
                    item == null ? null : item.getItemName(),
                    item == null ? null : units.get(item.getUnitId()),
                    record == null ? null : record.getLocation(),
                    lot == null ? null : lot.getLotNo(),
                    scale(delta)
                ));
            }
            counts.add(new InventoryCountHistoryResponse(entry.getKey(), first.getCreatedAt(), first.getCreatedBy(), first.getNote(),
                movements.size(), scale(increase), scale(decrease), scale(value), complete, lines));
        }
        return counts;
    }

    private static BigDecimal scale(BigDecimal value) {
        return value.setScale(SCALE, RoundingMode.HALF_UP);
    }
}
