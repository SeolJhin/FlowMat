package org.myweb.flowmat.domain.catalog.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

public record EquipmentUpdateRequest(
    @Size(max = 100) String equipmentName,
    @Size(max = 50) String equipmentType,
    @Size(max = 20) String equipmentStatus,
    /** Omitted: every detail unchanged. Present: replaces them all, so a null field is cleared. */
    @Valid EquipmentDetails details
) {
}
