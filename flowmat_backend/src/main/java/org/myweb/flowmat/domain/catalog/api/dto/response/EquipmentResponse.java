package org.myweb.flowmat.domain.catalog.api.dto.response;

public record EquipmentResponse(
    String equipmentId,
    String projectId,
    String equipmentCode,
    String equipmentName,
    String equipmentType,
    String equipmentStatus
) {
}
