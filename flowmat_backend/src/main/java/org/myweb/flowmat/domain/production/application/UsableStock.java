package org.myweb.flowmat.domain.production.application;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.domain.entity.LotMaster;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.inventory.repository.LotMasterRepository;
import org.springframework.stereotype.Component;

/**
 * Stock production can draw on right now, per item in the item's own unit: available quantity (on hand − reserved) of
 * active stock records, leaving out quarantined records and records in closed or expired LOTs. The reorder list and
 * work order readiness count the same way (docs/domain/material-requirements.md M4).
 */
@Component
@RequiredArgsConstructor
public class UsableStock {

    private static final String NOT_DELETED = "N";

    private final InventoryRepository inventoryRepository;
    private final LotMasterRepository lotMasterRepository;

    public Map<String, BigDecimal> byItem(String projectId, Collection<String> itemIds) {
        List<Inventory> rows = inventoryRepository.findAllByProjectIdAndDeletedYnOrderByCreatedAtAsc(projectId, NOT_DELETED).stream()
            .filter(row -> itemIds.contains(row.getItemId()))
            .toList();
        Map<String, LotMaster> lots = StreamSupport.stream(lotMasterRepository.findAllById(
                rows.stream().map(Inventory::getLotId).filter(Objects::nonNull).collect(Collectors.toSet())).spliterator(), false)
            .collect(Collectors.toMap(LotMaster::getLotId, Function.identity()));
        LocalDate today = LocalDate.now();
        Map<String, BigDecimal> usable = new HashMap<>();
        for (Inventory row : rows) {
            LotMaster lot = row.getLotId() == null ? null : lots.get(row.getLotId());
            if ("quarantined".equals(row.getInventoryStatus())
                || lot != null && ("closed".equals(lot.getLotStatus()) || lot.isExpiredOn(today))) {
                continue;
            }
            usable.merge(row.getItemId(), row.getAvailableQuantity() == null ? BigDecimal.ZERO : row.getAvailableQuantity(), BigDecimal::add);
        }
        return usable;
    }
}
