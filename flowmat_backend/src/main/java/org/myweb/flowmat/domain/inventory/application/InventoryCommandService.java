package org.myweb.flowmat.domain.inventory.application;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.domain.entity.InventoryTransaction;
import org.myweb.flowmat.domain.inventory.domain.entity.LotMaster;
import org.myweb.flowmat.domain.inventory.domain.enums.InventoryTransactionType;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.inventory.repository.InventoryTransactionRepository;
import org.myweb.flowmat.domain.inventory.repository.LotMasterRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The only place stock quantities change (docs/domain/inventory-bom-lot-contract.md §1–3).
 *
 * <p>Each call runs in the caller's transaction: the conditional UPDATE, the history row and any LOT status change
 * commit or roll back together. Access checks are the caller's job.
 */
@Service
@RequiredArgsConstructor
public class InventoryCommandService {

    static final String QUARANTINED = "quarantined";
    private static final String AVAILABLE = "available";
    private static final String NOT_DELETED = "N";

    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final LotMasterRepository lotMasterRepository;
    private final IdGenerator idGenerator;

    /** Applies the movement if it keeps every stock invariant, and records it. */
    @Transactional
    public InventoryTransaction apply(InventoryMovement movement) {
        Inventory before = findActiveInventory(movement.inventoryId());
        InventoryTransactionType type = movement.type();
        OffsetDateTime now = OffsetDateTime.now();
        BigDecimal quantityDelta = zeroIfNull(movement.quantityDelta());
        BigDecimal reservedDelta = zeroIfNull(movement.reservedDelta());

        if (before.getLotId() != null) {
            lotMasterRepository.findById(before.getLotId())
                .filter(lot -> "closed".equals(lot.getLotStatus()))
                .ifPresent(lot -> {
                    throw new BusinessException(ErrorCode.CONFLICT, "LOT " + lot.getLotNo() + " is closed.");
                });
        }

        if (type.changesStatusOnly()) {
            changeQuarantine(before, type == InventoryTransactionType.QUARANTINE, now);
        } else {
            if (quantityDelta.signum() == 0 && reservedDelta.signum() == 0) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "A stock movement must change the quantity.");
            }
            int changed = inventoryRepository.applyMovement(
                before.getInventoryId(), quantityDelta, reservedDelta, !type.blockedByQuarantine(), now);
            if (changed == 0) {
                throw rejection(before.getInventoryId(), type, quantityDelta, reservedDelta);
            }
        }

        // The UPDATE cleared the persistence context and holds the row lock until commit, so this read is exact.
        Inventory after = findActiveInventory(before.getInventoryId());
        if (after.getLotId() != null) {
            syncLotStatus(after.getLotId());
        }
        return record(after, type, quantityDelta, reservedDelta, movement.referenceType(), movement.referenceId(),
            movement.note(), movement.requestId(), movement.actorUserId());
    }

    /**
     * Records a movement whose row change the caller already made (creating a stock record, or an absolute adjustment
     * through PUT /inventories/{id}); {@code inventory} must hold the values after the change.
     */
    @Transactional
    public InventoryTransaction record(
        Inventory inventory,
        InventoryTransactionType type,
        BigDecimal quantityDelta,
        BigDecimal reservedDelta,
        String referenceType,
        String referenceId,
        String note,
        String requestId,
        String actorUserId
    ) {
        BigDecimal quantity = zeroIfNull(quantityDelta);
        BigDecimal reserved = zeroIfNull(reservedDelta);
        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setInventoryTransactionId(idGenerator.generate());
        transaction.setInventoryId(inventory.getInventoryId());
        transaction.setProjectId(inventory.getProjectId());
        transaction.setItemId(inventory.getItemId());
        transaction.setLotId(inventory.getLotId());
        transaction.setTransactionType(type.code());
        transaction.setQuantityDelta(quantity);
        transaction.setReservedDelta(reserved);
        transaction.setAvailableDelta(quantity.subtract(reserved));
        transaction.setQuantityAfter(inventory.getQuantity());
        transaction.setReservedAfter(inventory.getReservedQuantity());
        transaction.setAvailableAfter(inventory.getAvailableQuantity());
        transaction.setReferenceType(trimToNull(referenceType));
        transaction.setReferenceId(trimToNull(referenceId));
        transaction.setNote(trimToNull(note));
        transaction.setRequestId(trimToNull(requestId));
        transaction.setCreatedBy(actorUserId);
        // Flush now so a duplicate requestId or second reversal fails here, inside the caller's transaction.
        return inventoryTransactionRepository.saveAndFlush(transaction);
    }

    /**
     * Reverses every not-yet-reversed movement recorded for a source record (e.g. one production run item), checking
     * today's stock like any other movement. Used when that source is cancelled; the external reversal endpoint refuses
     * production movements so the run and the stock cannot drift apart.
     */
    @Transactional
    public int reverseMovementsOf(String referenceType, String referenceId, String reason, String actorUserId) {
        int reversed = 0;
        for (InventoryTransaction original : inventoryTransactionRepository.findAllByReferenceTypeAndReferenceId(referenceType, referenceId)) {
            boolean alreadyReversed = inventoryTransactionRepository
                .findByReferenceIdAndTransactionType(original.getInventoryTransactionId(), InventoryTransactionType.REVERSAL.code())
                .isPresent();
            if (alreadyReversed || InventoryTransactionType.REVERSAL.code().equals(original.getTransactionType())) {
                continue;
            }
            apply(new InventoryMovement(
                original.getInventoryId(),
                InventoryTransactionType.REVERSAL,
                negate(original.getQuantityDelta()),
                negate(original.getReservedDelta()),
                "inventory_transaction",
                original.getInventoryTransactionId(),
                reason,
                null,
                actorUserId
            ));
            reversed++;
        }
        return reversed;
    }

    private static BigDecimal negate(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.negate();
    }

    /** Recomputes a LOT's status from all its stock rows; quarantined and closed LOTs keep their status. */
    @Transactional
    public void syncLotStatus(String lotId) {
        LotMaster lot = lotMasterRepository.findById(lotId).orElse(null);
        if (lot == null || QUARANTINED.equals(lot.getLotStatus()) || "closed".equals(lot.getLotStatus())) {
            return;
        }
        List<Inventory> rows = inventoryRepository.findAllByLotIdAndDeletedYn(lotId, NOT_DELETED);
        BigDecimal onHand = rows.stream().map(row -> zeroIfNull(row.getQuantity())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal reserved = rows.stream().map(row -> zeroIfNull(row.getReservedQuantity())).reduce(BigDecimal.ZERO, BigDecimal::add);
        String status = onHand.signum() == 0 ? "consumed" : reserved.signum() > 0 ? "reserved" : AVAILABLE;
        if (!status.equals(lot.getLotStatus())) {
            lot.setLotStatus(status);
            lotMasterRepository.save(lot);
        }
    }

    /** Quarantine applies to the whole LOT when the row has one: every row of that LOT and the LOT itself. */
    private void changeQuarantine(Inventory inventory, boolean quarantine, OffsetDateTime now) {
        String target = quarantine ? QUARANTINED : AVAILABLE;
        boolean isQuarantined = QUARANTINED.equals(inventory.getInventoryStatus());
        if (quarantine == isQuarantined) {
            throw new BusinessException(ErrorCode.CONFLICT,
                quarantine ? "This stock is already quarantined." : "This stock is not quarantined.");
        }
        if (inventory.getLotId() == null) {
            inventoryRepository.updateStatus(inventory.getInventoryId(), target, now);
            return;
        }
        for (Inventory row : inventoryRepository.findAllByLotIdAndDeletedYn(inventory.getLotId(), NOT_DELETED)) {
            inventoryRepository.updateStatus(row.getInventoryId(), target, now);
        }
        lotMasterRepository.findById(inventory.getLotId()).ifPresent(lot -> {
            lot.setLotStatus(target);
            lotMasterRepository.save(lot);
        });
        if (!quarantine) {
            // Released: the LOT goes back to whatever its stock says (available / reserved / consumed).
            syncLotStatus(inventory.getLotId());
        }
    }

    /** Explains why the conditional UPDATE changed nothing, using the current row. */
    private BusinessException rejection(
        String inventoryId,
        InventoryTransactionType type,
        BigDecimal quantityDelta,
        BigDecimal reservedDelta
    ) {
        Inventory current = inventoryRepository.findByInventoryIdAndDeletedYn(inventoryId, NOT_DELETED).orElse(null);
        if (current == null) {
            return new BusinessException(ErrorCode.NOT_FOUND, "The stock record no longer exists.");
        }
        if (type.blockedByQuarantine() && QUARANTINED.equals(current.getInventoryStatus())) {
            return new BusinessException(ErrorCode.CONFLICT, "This stock is quarantined. Release it before using it.");
        }
        BigDecimal onHand = zeroIfNull(current.getQuantity());
        BigDecimal reserved = zeroIfNull(current.getReservedQuantity());
        BigDecimal available = onHand.subtract(reserved);
        if (reservedDelta.signum() < 0 && reserved.add(reservedDelta).signum() < 0) {
            return new BusinessException(ErrorCode.CONFLICT,
                "Only " + plain(reserved) + " is reserved; cannot release " + plain(reservedDelta.negate()) + ".");
        }
        BigDecimal needed = reservedDelta.subtract(quantityDelta);
        return new BusinessException(ErrorCode.CONFLICT,
            "Not enough available stock: " + plain(available) + " available, " + plain(needed) + " needed.");
    }

    private Inventory findActiveInventory(String inventoryId) {
        return inventoryRepository.findByInventoryIdAndDeletedYn(inventoryId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    static String plain(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private static BigDecimal zeroIfNull(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static String trimToNull(String value) {
        return value != null && !value.isBlank() ? value.trim() : null;
    }
}
