package org.myweb.flowmat.domain.inventory.repository;

import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InventoryRepository extends JpaRepository<Inventory, String> {

    List<Inventory> findAllByProjectIdAndDeletedYnOrderByCreatedAtAsc(String projectId, String deletedYn);

    Optional<Inventory> findByInventoryIdAndDeletedYn(String inventoryId, String deletedYn);

    List<Inventory> findAllByLotIdAndDeletedYn(String lotId, String deletedYn);

    boolean existsByItemIdAndDeletedYn(String itemId, String deletedYn);

    /** The active row of one LOT at one place (unique by V17 uq_inventory_item_location_lot). */
    @Query("""
        select i from Inventory i
         where i.projectId = :projectId and i.itemId = :itemId and i.lotId = :lotId and i.deletedYn = 'N'
           and coalesce(i.location, '') = coalesce(:location, '')
        """)
    Optional<Inventory> findLotStockAt(
        @Param("projectId") String projectId,
        @Param("itemId") String itemId,
        @Param("lotId") String lotId,
        @Param("location") String location
    );

    /** Active rows of an item without LOT at one place, oldest first (nothing makes them unique). */
    @Query("""
        select i from Inventory i
         where i.projectId = :projectId and i.itemId = :itemId and i.lotId is null and i.deletedYn = 'N'
           and coalesce(i.location, '') = coalesce(:location, '')
         order by i.createdAt asc
        """)
    List<Inventory> findStockAt(
        @Param("projectId") String projectId,
        @Param("itemId") String itemId,
        @Param("location") String location
    );

    /** Locks the row (deleted or not) so its stock alerts are worked out against numbers that cannot move meanwhile. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Inventory i where i.inventoryId = :id")
    Optional<Inventory> findForUpdate(@Param("id") String inventoryId);

    /** Active rows that have a threshold to watch. */
    @Query("select i.inventoryId from Inventory i where i.deletedYn = 'N' and (i.minThreshold > 0 or i.maxThreshold is not null)")
    List<String> findIdsWithThresholds();

    /** Active rows holding stock of a LOT with an expiry date; their expiry alerts change with the date alone. */
    @Query("""
        select i.inventoryId from Inventory i, LotMaster l
         where i.lotId = l.lotId and i.deletedYn = 'N' and l.expiryDate is not null and i.quantity > 0
        """)
    List<String> findIdsHoldingDatedLots();

    /** Mirrors the V17 unique index uq_inventory_item_location_lot (a blank location counts as the same place). */
    @Query("""
        select count(i) > 0 from Inventory i
         where i.projectId = :projectId and i.itemId = :itemId and i.lotId = :lotId and i.deletedYn = 'N'
           and coalesce(i.location, '') = coalesce(:location, '')
        """)
    boolean existsLotStockAt(
        @Param("projectId") String projectId,
        @Param("itemId") String itemId,
        @Param("lotId") String lotId,
        @Param("location") String location
    );

    /**
     * Applies a stock movement in a single UPDATE so concurrent movements cannot overwrite each other, and only if the
     * result keeps the stock invariants (quantity >= 0, 0 <= reserved <= quantity, available = quantity - reserved).
     * Quarantined stock is skipped unless {@code allowQuarantined}.
     *
     * <p>Returns the number of rows changed: 0 means the record is gone, quarantined, or the movement would break an
     * invariant. Clears the persistence context; re-read the inventory afterwards to see the new values.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
        update Inventory i
           set i.quantity = coalesce(i.quantity, 0) + :quantityDelta,
               i.reservedQuantity = coalesce(i.reservedQuantity, 0) + :reservedDelta,
               i.availableQuantity = (coalesce(i.quantity, 0) + :quantityDelta)
                                   - (coalesce(i.reservedQuantity, 0) + :reservedDelta),
               i.version = i.version + 1,
               i.updatedAt = :now
         where i.inventoryId = :inventoryId
           and i.deletedYn = 'N'
           and (:allowQuarantined = true or coalesce(i.inventoryStatus, 'available') <> 'quarantined')
           and coalesce(i.quantity, 0) + :quantityDelta >= 0
           and coalesce(i.reservedQuantity, 0) + :reservedDelta >= 0
           and coalesce(i.reservedQuantity, 0) + :reservedDelta <= coalesce(i.quantity, 0) + :quantityDelta
        """)
    int applyMovement(
        @Param("inventoryId") String inventoryId,
        @Param("quantityDelta") BigDecimal quantityDelta,
        @Param("reservedDelta") BigDecimal reservedDelta,
        @Param("allowQuarantined") boolean allowQuarantined,
        @Param("now") OffsetDateTime now
    );

    /** Sets the status in one UPDATE (bumping the version); returns 0 when the record is gone. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
        update Inventory i
           set i.inventoryStatus = :status,
               i.version = i.version + 1,
               i.updatedAt = :now
         where i.inventoryId = :inventoryId
           and i.deletedYn = 'N'
        """)
    int updateStatus(
        @Param("inventoryId") String inventoryId,
        @Param("status") String status,
        @Param("now") OffsetDateTime now
    );
}
