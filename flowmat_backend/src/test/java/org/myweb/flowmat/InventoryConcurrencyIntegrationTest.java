package org.myweb.flowmat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Stock movements against real Postgres: many runs consuming the same stock at once must not lose updates, and a
 * write based on a stale read must fail instead of overwriting.
 */
class InventoryConcurrencyIntegrationTest extends IntegrationTestSupport {

    /** Seeded by V2__seed_demo.sql. */
    private static final String DEMO_ITEM = "itm_demo_mix_output";

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void concurrentMovementsAreAllApplied() throws Exception {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        String inventoryId = createInventory(tx, "100");

        int writers = 20;
        ExecutorService pool = Executors.newFixedThreadPool(writers);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> results = new ArrayList<>();
        try {
            for (int i = 0; i < writers; i++) {
                results.add(pool.submit(() -> {
                    start.await();
                    tx.executeWithoutResult(status ->
                        inventoryRepository.applyMovement(inventoryId, new BigDecimal("-1"), BigDecimal.ZERO, false, OffsetDateTime.now()));
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> result : results) {
                result.get();
            }
        } finally {
            pool.shutdownNow();
        }

        Inventory after = tx.execute(status -> inventoryRepository.findById(inventoryId).orElseThrow());
        assertThat(after.getQuantity()).isEqualByComparingTo("80");
        assertThat(after.getAvailableQuantity()).isEqualByComparingTo("80");
        assertThat(after.getVersion()).isEqualTo(writers);
    }

    @Test
    void concurrentOverConsumptionNeverDrivesStockNegative() throws Exception {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        String inventoryId = createInventory(tx, "100");

        // 30 writers each take 5 from 100: exactly 20 fit, the rest must be refused rather than go below zero.
        int writers = 30;
        ExecutorService pool = Executors.newFixedThreadPool(writers);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();
        try {
            for (int i = 0; i < writers; i++) {
                results.add(pool.submit(() -> {
                    start.await();
                    return tx.execute(status -> inventoryRepository.applyMovement(
                        inventoryId, new BigDecimal("-5"), BigDecimal.ZERO, false, OffsetDateTime.now()));
                }));
            }
            start.countDown();
            int applied = 0;
            for (Future<Integer> result : results) {
                applied += result.get();
            }
            assertThat(applied).isEqualTo(20);
        } finally {
            pool.shutdownNow();
        }

        Inventory after = tx.execute(status -> inventoryRepository.findById(inventoryId).orElseThrow());
        assertThat(after.getQuantity()).isEqualByComparingTo("0");
        assertThat(after.getAvailableQuantity()).isEqualByComparingTo("0");
    }

    @Test
    void reservingMoreThanAvailableChangesNothing() {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        String inventoryId = createInventory(tx, "10");

        Integer changed = tx.execute(status -> inventoryRepository.applyMovement(
            inventoryId, BigDecimal.ZERO, new BigDecimal("11"), false, OffsetDateTime.now()));

        assertThat(changed).isZero();
        Inventory after = tx.execute(status -> inventoryRepository.findById(inventoryId).orElseThrow());
        assertThat(after.getReservedQuantity()).isEqualByComparingTo("0");
    }

    @Test
    void staleEntityWriteIsRejected() {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        String inventoryId = createInventory(tx, "50");

        Inventory staleCopy = tx.execute(status -> inventoryRepository.findById(inventoryId).orElseThrow());
        tx.executeWithoutResult(status ->
            inventoryRepository.applyMovement(inventoryId, new BigDecimal("-5"), BigDecimal.ZERO, false, OffsetDateTime.now()));

        staleCopy.setQuantity(new BigDecimal("999"));
        assertThatThrownBy(() -> tx.executeWithoutResult(status -> inventoryRepository.saveAndFlush(staleCopy)))
            .isInstanceOf(OptimisticLockingFailureException.class);

        Inventory after = tx.execute(status -> inventoryRepository.findById(inventoryId).orElseThrow());
        assertThat(after.getQuantity()).isEqualByComparingTo("45");
    }

    private String createInventory(TransactionTemplate tx, String quantity) {
        // inventory_id is varchar(50).
        String inventoryId = "invc-" + UUID.randomUUID().toString().replace("-", "");
        tx.executeWithoutResult(status -> {
            Inventory inventory = new Inventory();
            inventory.setInventoryId(inventoryId);
            inventory.setProjectId(DEMO_PROJECT);
            inventory.setItemId(DEMO_ITEM);
            inventory.setQuantity(new BigDecimal(quantity));
            inventory.setReservedQuantity(BigDecimal.ZERO);
            inventory.setAvailableQuantity(new BigDecimal(quantity));
            inventory.setInventoryStatus("available");
            inventory.setMinThreshold(BigDecimal.ZERO);
            inventory.setDeletedYn("N");
            inventoryRepository.save(inventory);
        });
        return inventoryId;
    }
}
