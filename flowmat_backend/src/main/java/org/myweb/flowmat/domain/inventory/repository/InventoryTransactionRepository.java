package org.myweb.flowmat.domain.inventory.repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.myweb.flowmat.domain.inventory.domain.entity.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Specifications serve the filtered, paged movement ledger (InventoryTransactionSearchService). */
public interface InventoryTransactionRepository
    extends JpaRepository<InventoryTransaction, String>, JpaSpecificationExecutor<InventoryTransaction> {

    List<InventoryTransaction> findAllByProjectIdOrderByCreatedAtDesc(String projectId);

    List<InventoryTransaction> findAllByInventoryIdOrderByCreatedAtDesc(String inventoryId);

    /** How much of a LOT left through issues. */
    interface LotIssued {

        String getLotId();

        BigDecimal getIssued();
    }

    /** Per LOT: what issues took out, less those reversed (LOT recall: what already left the site). */
    @Query(value = """
        select t.lot_id as "lotId", coalesce(sum(-t.quantity_delta), 0) as "issued"
          from inventory_transaction t
         where t.lot_id in (:lotIds) and t.transaction_type = 'issue'
           and not exists (select 1 from inventory_transaction r
                            where r.transaction_type = 'reversal' and r.reference_id = t.inventory_transaction_id)
         group by t.lot_id
        """, nativeQuery = true)
    List<LotIssued> findIssuedByLot(@Param("lotIds") Collection<String> lotIds);

    /** A project's movements of one kind of source, newest first (count history). */
    List<InventoryTransaction> findAllByProjectIdAndReferenceTypeOrderByCreatedAtDesc(String projectId, String referenceType);

    /** Movements after one moment up to another, for a period's in and out (StockMovementSummaryService). */
    List<InventoryTransaction> findAllByProjectIdAndCreatedAtGreaterThanAndCreatedAtLessThanEqual(
        String projectId, OffsetDateTime after, OffsetDateTime upTo);

    /** What a stock record's last movement up to a moment left behind. */
    interface LastMovement {

        String getInventoryId();

        BigDecimal getQuantityAfter();

        BigDecimal getReservedAfter();
    }

    /**
     * Each stock record's last movement up to a moment (StockSnapshotService): one row per record, picked in the
     * database. Movements at the very same instant are told apart by id, which is arbitrary but stable.
     */
    @Query(value = """
        select distinct on (t.inventory_id)
               t.inventory_id as "inventoryId", t.quantity_after as "quantityAfter", t.reserved_after as "reservedAfter"
          from inventory_transaction t
         where t.project_id = :projectId and t.created_at <= :at
         order by t.inventory_id, t.created_at desc, t.inventory_transaction_id desc
        """, nativeQuery = true)
    List<LastMovement> findLastMovementsUpTo(@Param("projectId") String projectId, @Param("at") OffsetDateTime at);

    /** Stock records that have any movement at all; the rest have never changed since they were created. */
    @Query("select distinct t.inventoryId from InventoryTransaction t where t.projectId = :projectId")
    Set<String> findInventoryIdsWithMovements(@Param("projectId") String projectId);

    /**
     * Per item: what issues and production inputs took since a moment, and when things were last used and first and
     * last received (StockMovementAnalysisService). Movements that were reversed do not count. Times come back as the
     * driver's type for timestamptz, so they are read as Object.
     */
    interface ItemMovementTotals {

        String getItemId();

        BigDecimal getConsumed();

        Object getLastConsumedAt();

        Object getFirstReceivedAt();

        Object getLastReceivedAt();
    }

    @Query(value = """
        select t.item_id as "itemId",
               coalesce(sum(case when t.transaction_type in ('issue', 'production_input') and t.created_at >= :since
                                 then -t.quantity_delta end), 0) as "consumed",
               max(case when t.transaction_type in ('issue', 'production_input') then t.created_at end) as "lastConsumedAt",
               min(case when t.transaction_type in ('receipt', 'production_output') then t.created_at end) as "firstReceivedAt",
               max(case when t.transaction_type in ('receipt', 'production_output') then t.created_at end) as "lastReceivedAt"
          from inventory_transaction t
         where t.project_id = :projectId
           and t.transaction_type in ('issue', 'production_input', 'receipt', 'production_output')
           and not exists (select 1 from inventory_transaction r
                            where r.transaction_type = 'reversal' and r.reference_id = t.inventory_transaction_id)
         group by t.item_id
        """, nativeQuery = true)
    List<ItemMovementTotals> findItemMovementTotals(@Param("projectId") String projectId, @Param("since") OffsetDateTime since);

    /**
     * Stock each item lost since a moment, by why (docs/domain/stock-analysis.md "폐기·손실"): written off as expired,
     * scrapped from a defect, or missing at a stock count. Only movements that took stock away; reversed ones do not count.
     */
    interface ItemWaste {

        String getItemId();

        BigDecimal getExpired();

        BigDecimal getDefect();

        BigDecimal getCountLoss();
    }

    @Query(value = """
        select t.item_id as "itemId",
               coalesce(sum(case when t.reference_type = 'expiry_write_off' then -t.quantity_delta end), 0) as "expired",
               coalesce(sum(case when t.reference_type = 'defect_log' then -t.quantity_delta end), 0) as "defect",
               coalesce(sum(case when t.reference_type = 'inventory_count' then -t.quantity_delta end), 0) as "countLoss"
          from inventory_transaction t
         where t.project_id = :projectId
           and t.created_at > :since
           and t.quantity_delta < 0
           and t.transaction_type <> 'reversal'
           and t.reference_type in ('expiry_write_off', 'defect_log', 'inventory_count')
           and not exists (select 1 from inventory_transaction r
                            where r.transaction_type = 'reversal' and r.reference_id = t.inventory_transaction_id)
         group by t.item_id
        """, nativeQuery = true)
    List<ItemWaste> findItemWaste(@Param("projectId") String projectId, @Param("since") OffsetDateTime since);

    Optional<InventoryTransaction> findByInventoryTransactionId(String inventoryTransactionId);

    Optional<InventoryTransaction> findByProjectIdAndRequestId(String projectId, String requestId);

    Optional<InventoryTransaction> findByReferenceIdAndTransactionType(String referenceId, String transactionType);

    List<InventoryTransaction> findAllByReferenceTypeAndReferenceId(String referenceType, String referenceId);
}
