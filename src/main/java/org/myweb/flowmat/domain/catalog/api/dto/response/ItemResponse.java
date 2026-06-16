package org.myweb.flowmat.domain.catalog.api.dto.response;

public record ItemResponse(
    String itemId,
    String projectId,
    String itemCode,
    String itemName,
    String itemType,
    String resourceCategory,
    String resourceType,
    String unitId,
    String itemStatus
) {
}
