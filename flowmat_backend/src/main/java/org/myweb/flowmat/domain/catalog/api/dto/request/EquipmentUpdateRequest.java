package org.myweb.flowmat.domain.catalog.api.dto.request;

import jakarta.validation.constraints.Size;

public record EquipmentUpdateRequest(
    @Size(max = 100) String equipmentName,
    @Size(max = 50) String equipmentType,
    @Size(max = 20) String equipmentStatus
) {
}
