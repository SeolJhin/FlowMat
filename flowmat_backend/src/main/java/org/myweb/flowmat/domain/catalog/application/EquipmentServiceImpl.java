package org.myweb.flowmat.domain.catalog.application;

import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.api.dto.request.EquipmentCreateRequest;
import org.myweb.flowmat.domain.catalog.api.dto.request.EquipmentUpdateRequest;
import org.myweb.flowmat.domain.catalog.api.dto.response.EquipmentResponse;
import org.myweb.flowmat.domain.catalog.domain.entity.Equipment;
import org.myweb.flowmat.domain.catalog.repository.EquipmentRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EquipmentServiceImpl implements EquipmentService {
    private static final String NOT_DELETED = "N";
    private static final Set<String> STATUSES = Set.of("active", "inactive", "maintenance");
    private final EquipmentRepository equipmentRepository;
    private final ProjectAccessService projectAccessService;
    private final IdGenerator idGenerator;

    @Override
    public List<EquipmentResponse> listEquipment(String projectId) {
        String id = required(projectId, "projectId");
        projectAccessService.requireProjectReadAccess(id);
        return equipmentRepository.findAllByProjectIdAndDeletedYnOrderByCreatedAtDesc(id, NOT_DELETED)
            .stream().map(EquipmentServiceImpl::toResponse).toList();
    }

    @Override
    public EquipmentResponse getEquipment(String equipmentId) {
        Equipment equipment = findActive(equipmentId);
        projectAccessService.requireProjectReadAccess(equipment.getProjectId());
        return toResponse(equipment);
    }

    @Override
    @Transactional
    public EquipmentResponse createEquipment(EquipmentCreateRequest request) {
        String projectId = required(request.projectId(), "projectId");
        projectAccessService.requireProjectWriteAccess(projectId);
        String code = optional(request.equipmentCode());
        if (code != null && equipmentRepository.existsByProjectIdAndEquipmentCodeIgnoreCaseAndDeletedYn(projectId, code, NOT_DELETED)) {
            throw new BusinessException(ErrorCode.CONFLICT, "Equipment code already exists in this project.");
        }
        Equipment equipment = new Equipment();
        equipment.setEquipmentId(idGenerator.generate());
        equipment.setProjectId(projectId);
        equipment.setEquipmentCode(code);
        equipment.setEquipmentName(required(request.equipmentName(), "equipmentName"));
        equipment.setEquipmentType(required(request.equipmentType(), "equipmentType"));
        equipment.setEquipmentStatus("active");
        equipment.setCreatedBy(projectAccessService.requireCurrentUserId());
        return toResponse(equipmentRepository.save(equipment));
    }

    @Override
    @Transactional
    public EquipmentResponse updateEquipment(String equipmentId, EquipmentUpdateRequest request) {
        Equipment equipment = findActive(equipmentId);
        projectAccessService.requireProjectWriteAccess(equipment.getProjectId());
        if (request.equipmentName() != null) equipment.setEquipmentName(required(request.equipmentName(), "equipmentName"));
        if (request.equipmentType() != null) equipment.setEquipmentType(required(request.equipmentType(), "equipmentType"));
        if (request.equipmentStatus() != null) {
            String status = required(request.equipmentStatus(), "equipmentStatus").toLowerCase(java.util.Locale.ROOT);
            if (!STATUSES.contains(status)) throw new BusinessException(ErrorCode.BAD_REQUEST, "Invalid equipmentStatus.");
            equipment.setEquipmentStatus(status);
        }
        equipment.setUpdatedBy(projectAccessService.requireCurrentUserId());
        return toResponse(equipmentRepository.save(equipment));
    }

    @Override
    @Transactional
    public void deleteEquipment(String equipmentId) {
        Equipment equipment = findActive(equipmentId);
        projectAccessService.requireProjectOwnerAccess(equipment.getProjectId());
        equipment.setDeletedYn("Y");
        equipment.setUpdatedBy(projectAccessService.requireCurrentUserId());
        equipmentRepository.save(equipment);
    }

    private Equipment findActive(String id) {
        return equipmentRepository.findByEquipmentIdAndDeletedYn(id, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private static String required(String value, String name) {
        if (value == null || value.isBlank()) throw new BusinessException(ErrorCode.BAD_REQUEST, name + " is required.");
        return value.trim();
    }

    private static String optional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static EquipmentResponse toResponse(Equipment equipment) {
        return new EquipmentResponse(equipment.getEquipmentId(), equipment.getProjectId(), equipment.getEquipmentCode(),
            equipment.getEquipmentName(), equipment.getEquipmentType(), equipment.getEquipmentStatus());
    }
}
