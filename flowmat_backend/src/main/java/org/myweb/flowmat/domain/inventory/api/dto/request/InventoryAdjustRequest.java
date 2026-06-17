package org.myweb.flowmat.domain.inventory.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record InventoryAdjustRequest(
    @NotBlank String projectId,
    @NotBlank String itemId,
    @NotNull BigDecimal quantity,
    BigDecimal reservedQuantity,
    BigDecimal availableQuantity,
    String location,
    String inventoryStatus
) {
}
