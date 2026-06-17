package org.myweb.flowmat.domain.inventory.application;

import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.inventory.api.dto.request.InventoryTransactionCreateRequest;
import org.myweb.flowmat.domain.inventory.api.dto.response.InventoryTransactionResponse;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.domain.entity.InventoryTransaction;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.inventory.repository.InventoryTransactionRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryTransactionServiceImpl implements InventoryTransactionService {

    private static final String NOT_DELETED = "N";

    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final InventoryRepository inventoryRepository;
    private final IdGenerator idGenerator;

    @Override
    public List<InventoryTransactionResponse> listTransactions(String projectId, String inventoryId) {
        if (inventoryId != null && !inventoryId.isBlank()) {
            findActiveInventory(inventoryId);
            return inventoryTransactionRepository.findAllByInventoryIdOrderByCreatedAtDesc(inventoryId).stream()
                .map(InventoryTransactionServiceImpl::toResponse)
                .toList();
        }
        if (projectId != null && !projectId.isBlank()) {
            return inventoryTransactionRepository.findAllByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .map(InventoryTransactionServiceImpl::toResponse)
                .toList();
        }
        throw new BusinessException(ErrorCode.BAD_REQUEST);
    }

    @Override
    @Transactional
    public InventoryTransactionResponse createTransaction(InventoryTransactionCreateRequest request) {
        Inventory inventory = findActiveInventory(request.inventoryId());
        return toResponse(saveTransaction(
            inventory,
            request.transactionType(),
            request.quantityDelta(),
            defaultIfNull(request.reservedDelta()),
            defaultIfNull(request.availableDelta()),
            request.referenceType(),
            request.referenceId(),
            request.note(),
            request.createdBy()
        ));
    }

    @Override
    public InventoryTransactionResponse getTransaction(String inventoryTransactionId) {
        return toResponse(inventoryTransactionRepository.findByInventoryTransactionId(inventoryTransactionId)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND)));
    }

    @Override
    @Transactional
    public InventoryTransactionResponse recordSystemTransaction(
        Inventory inventory,
        String transactionType,
        BigDecimal quantityDelta,
        BigDecimal reservedDelta,
        BigDecimal availableDelta,
        String referenceType,
        String referenceId,
        String note,
        String createdBy
    ) {
        return toResponse(saveTransaction(
            inventory,
            transactionType,
            defaultIfNull(quantityDelta),
            defaultIfNull(reservedDelta),
            defaultIfNull(availableDelta),
            referenceType,
            referenceId,
            note,
            createdBy
        ));
    }

    private InventoryTransaction saveTransaction(
        Inventory inventory,
        String transactionType,
        BigDecimal quantityDelta,
        BigDecimal reservedDelta,
        BigDecimal availableDelta,
        String referenceType,
        String referenceId,
        String note,
        String createdBy
    ) {
        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setInventoryTransactionId(idGenerator.generate());
        transaction.setInventoryId(inventory.getInventoryId());
        transaction.setProjectId(inventory.getProjectId());
        transaction.setItemId(inventory.getItemId());
        transaction.setLotId(inventory.getLotId());
        transaction.setTransactionType(transactionType);
        transaction.setQuantityDelta(quantityDelta);
        transaction.setReservedDelta(reservedDelta);
        transaction.setAvailableDelta(availableDelta);
        transaction.setQuantityAfter(inventory.getQuantity());
        transaction.setReservedAfter(inventory.getReservedQuantity());
        transaction.setAvailableAfter(inventory.getAvailableQuantity());
        transaction.setReferenceType(trimToNull(referenceType));
        transaction.setReferenceId(trimToNull(referenceId));
        transaction.setNote(trimToNull(note));
        transaction.setCreatedBy(trimToNull(createdBy));
        return inventoryTransactionRepository.save(transaction);
    }

    private Inventory findActiveInventory(String inventoryId) {
        return inventoryRepository.findByInventoryIdAndDeletedYn(inventoryId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private static InventoryTransactionResponse toResponse(InventoryTransaction transaction) {
        return new InventoryTransactionResponse(
            transaction.getInventoryTransactionId(),
            transaction.getInventoryId(),
            transaction.getProjectId(),
            transaction.getItemId(),
            transaction.getTransactionType(),
            transaction.getQuantityDelta(),
            transaction.getReservedDelta(),
            transaction.getAvailableDelta(),
            transaction.getQuantityAfter(),
            transaction.getReservedAfter(),
            transaction.getAvailableAfter(),
            transaction.getReferenceType(),
            transaction.getReferenceId(),
            transaction.getNote(),
            transaction.getCreatedBy(),
            transaction.getCreatedAt()
        );
    }

    private static BigDecimal defaultIfNull(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static String trimToNull(String value) {
        return value != null && !value.isBlank() ? value.trim() : null;
    }
}
