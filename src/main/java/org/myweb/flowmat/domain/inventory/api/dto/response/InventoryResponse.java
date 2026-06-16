package org.myweb.flowmat.domain.inventory.api.dto.response;

import java.math.BigDecimal;

public record InventoryResponse(
    String inventoryId,
    String projectId,
    String itemId,
    BigDecimal quantity,
    BigDecimal reservedQuantity,
    BigDecimal availableQuantity,
    String inventoryStatus,
    String location
) {
}
