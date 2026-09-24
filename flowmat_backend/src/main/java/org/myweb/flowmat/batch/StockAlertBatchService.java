package org.myweb.flowmat.batch;

import java.util.LinkedHashSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.myweb.flowmat.domain.inventory.application.StockAlertService;
import org.myweb.flowmat.domain.inventory.domain.entity.StockAlert;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.inventory.repository.StockAlertRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Safety net for stock alerts (docs/domain/stock-alert.md). Movements and threshold edits keep alerts current as they
 * happen; this sweep catches anything that changed a row some other way. Each row is checked in its own transaction
 * under a row lock, and one failing row does not stop the rest.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StockAlertBatchService {

    private final InventoryRepository inventoryRepository;
    private final StockAlertRepository stockAlertRepository;
    private final StockAlertService stockAlertService;

    @Scheduled(
        fixedDelayString = "${app.stock-alert.sweep-interval:PT5M}",
        initialDelayString = "${app.stock-alert.sweep-interval:PT5M}"
    )
    public void sweep() {
        Set<String> inventoryIds = new LinkedHashSet<>(inventoryRepository.findIdsWithThresholds());
        inventoryIds.addAll(inventoryRepository.findIdsHoldingDatedLots());
        stockAlertRepository.findAllByResolvedYn("N").stream().map(StockAlert::getInventoryId).forEach(inventoryIds::add);
        int failed = 0;
        for (String inventoryId : inventoryIds) {
            try {
                stockAlertService.evaluateLocked(inventoryId);
            } catch (RuntimeException e) {
                failed++;
                log.warn("Stock alert check failed for inventory {}", inventoryId, e);
            }
        }
        if (failed > 0) {
            log.warn("Stock alert sweep: {} of {} rows failed", failed, inventoryIds.size());
        }
    }
}
