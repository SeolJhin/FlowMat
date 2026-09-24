package org.myweb.flowmat.domain.catalog.application;

import java.util.List;
import org.myweb.flowmat.domain.catalog.api.dto.request.EquipmentCreateRequest;
import org.myweb.flowmat.domain.catalog.api.dto.request.EquipmentUpdateRequest;
import org.myweb.flowmat.domain.catalog.api.dto.response.EquipmentResponse;

public interface EquipmentService {
    List<EquipmentResponse> listEquipment(String projectId);
    EquipmentResponse getEquipment(String equipmentId);
    EquipmentResponse createEquipment(EquipmentCreateRequest request);
    EquipmentResponse updateEquipment(String equipmentId, EquipmentUpdateRequest request);
    void deleteEquipment(String equipmentId);
}
