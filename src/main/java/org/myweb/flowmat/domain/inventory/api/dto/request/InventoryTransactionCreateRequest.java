package org.myweb.flowmat.domain.inventory.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record InventoryTransactionCreateRequest(
    @NotBlank String inventoryId,
    @NotBlank String transactionType,
    @NotNull BigDecimal quantityDelta,
    BigDecimal reservedDelta,
    BigDecimal availableDelta,
    String referenceType,
    String referenceId,
    String note,
    String createdBy
) {
}
