package org.myweb.flowmat.domain.inventory.application;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.inventory.application.publicapi.StockRecordQuery;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StockRecordQueryImpl implements StockRecordQuery {
    private final InventoryRepository stocks;
    @Override
    @Transactional(readOnly = true)
    public Optional<StockIdentity> findProjectStock(String projectId, String inventoryId) {
        return stocks.findByInventoryIdAndDeletedYn(inventoryId, "N").filter(stock -> projectId.equals(stock.getProjectId()))
            .map(stock -> new StockIdentity(stock.getInventoryId(), stock.getItemId(), stock.getLotId()));
    }
}
