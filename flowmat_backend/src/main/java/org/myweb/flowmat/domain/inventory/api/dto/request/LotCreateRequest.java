package org.myweb.flowmat.domain.inventory.api.dto.request;

public record LotCreateRequest(String itemId, String inventoryId, String lotNo) {
}
