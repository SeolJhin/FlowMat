package org.myweb.flowmat.domain.inventory.application;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.inventory.application.publicapi.StockQuery;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockQueryImpl implements StockQuery {

    private static final String NOT_DELETED = "N";

    private final InventoryRepository inventoryRepository;

    @Override
    public boolean hasStockRecords(String itemId) {
        return inventoryRepository.existsByItemIdAndDeletedYn(itemId, NOT_DELETED);
    }
}
