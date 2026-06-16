package org.myweb.flowmat.domain.catalog.api.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ItemCreateRequest(
    @NotBlank String projectId,
    @NotBlank String itemCode,
    @NotBlank String itemName,
    String itemType,
    String resourceCategory,
    String resourceType,
    String unitId,
    String itemStatus
) {
}
