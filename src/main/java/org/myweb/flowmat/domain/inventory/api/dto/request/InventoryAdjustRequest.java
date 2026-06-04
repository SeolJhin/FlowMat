package org.myweb.flowmat.domain.inventory.api.dto.request;

import java.math.BigDecimal;

public record InventoryAdjustRequest(String itemId, BigDecimal quantity, String location) {
}
