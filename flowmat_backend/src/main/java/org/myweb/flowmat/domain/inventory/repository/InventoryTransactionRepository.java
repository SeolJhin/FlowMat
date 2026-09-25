package org.myweb.flowmat.domain.inventory.repository;

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

    /** Everything up to a moment, for rebuilding stock as it was then (StockSnapshotService). */
    List<InventoryTransaction> findAllByProjectIdAndCreatedAtLessThanEqual(String projectId, OffsetDateTime createdAt);

    /** Stock records that have any movement at all; the rest have never changed since they were created. */
    @Query("select distinct t.inventoryId from InventoryTransaction t where t.projectId = :projectId")
    Set<String> findInventoryIdsWithMovements(@Param("projectId") String projectId);

    /** Movements of some types, for adding up per item (StockMovementAnalysisService). */
    List<InventoryTransaction> findAllByProjectIdAndTransactionTypeIn(String projectId, Collection<String> transactionTypes);

    Optional<InventoryTransaction> findByInventoryTransactionId(String inventoryTransactionId);

    Optional<InventoryTransaction> findByProjectIdAndRequestId(String projectId, String requestId);

    Optional<InventoryTransaction> findByReferenceIdAndTransactionType(String referenceId, String transactionType);

    List<InventoryTransaction> findAllByReferenceTypeAndReferenceId(String referenceType, String referenceId);
}
