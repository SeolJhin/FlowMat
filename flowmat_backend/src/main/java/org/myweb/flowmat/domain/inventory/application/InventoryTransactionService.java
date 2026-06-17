package org.myweb.flowmat.domain.inventory.application;

import java.math.BigDecimal;
import java.util.List;
import org.myweb.flowmat.domain.inventory.api.dto.request.InventoryTransactionCreateRequest;
import org.myweb.flowmat.domain.inventory.api.dto.response.InventoryTransactionResponse;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;

public interface InventoryTransactionService {

    List<InventoryTransactionResponse> listTransactions(String projectId, String inventoryId);

    InventoryTransactionResponse createTransaction(InventoryTransactionCreateRequest request);

    InventoryTransactionResponse getTransaction(String inventoryTransactionId);

    InventoryTransactionResponse recordSystemTransaction(
        Inventory inventory,
        String transactionType,
        BigDecimal quantityDelta,
        BigDecimal reservedDelta,
        BigDecimal availableDelta,
        String referenceType,
        String referenceId,
        String note,
        String createdBy
    );
}
