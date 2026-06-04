package org.myweb.flowmat.domain.inventory.api.dto.response;

import java.math.BigDecimal;

public record InventoryResponse(String inventoryId, String itemId, BigDecimal quantity, String inventoryStatus) {
}
