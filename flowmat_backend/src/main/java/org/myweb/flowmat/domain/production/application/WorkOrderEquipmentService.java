package org.myweb.flowmat.domain.production.application;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.domain.entity.Equipment;
import org.myweb.flowmat.domain.catalog.repository.EquipmentRepository;
import org.myweb.flowmat.domain.production.api.dto.response.WorkOrderResponse;
import org.myweb.flowmat.domain.production.domain.entity.WorkOrder;
import org.myweb.flowmat.domain.production.domain.enums.WorkOrderStatus;
import org.myweb.flowmat.domain.production.repository.ProductionRunRepository;
import org.myweb.flowmat.domain.production.repository.WorkOrderRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Assigns the equipment a work order runs on (docs/domain/equipment-schedule.md). Unlike the other fields it can change
 * after approval, since a machine can be swapped until the order is completed or cancelled.
 */
@Service
@RequiredArgsConstructor
public class WorkOrderEquipmentService {

    private static final String NOT_DELETED = "N";

    private final WorkOrderRepository workOrderRepository;
    private final EquipmentRepository equipmentRepository;
    private final ProductionRunRepository productionRunRepository;
    private final ProjectAccessService projectAccessService;

    @Transactional
    public WorkOrderResponse assign(String workOrderId, String equipmentId) {
        WorkOrder order = workOrderRepository.findByWorkOrderIdAndDeletedYn(workOrderId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        projectAccessService.requireProjectWriteAccess(order.getProjectId());
        WorkOrderStatus status = WorkOrderServiceImpl.status(order);
        if (status == WorkOrderStatus.COMPLETED || status == WorkOrderStatus.CANCELLED) {
            throw new BusinessException(ErrorCode.CONFLICT,
                order.getWorkOrderNumber() + " is " + order.getWorkOrderStatus() + "; its equipment can no longer change.");
        }
        String id = equipmentId == null || equipmentId.isBlank() ? null : equipmentId.trim();
        if (id != null) {
            Equipment equipment = equipmentRepository.findByEquipmentIdAndDeletedYn(id, NOT_DELETED)
                .filter(found -> order.getProjectId().equals(found.getProjectId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "The equipment is not in this project."));
            if ("inactive".equals(equipment.getEquipmentStatus())) {
                throw new BusinessException(ErrorCode.CONFLICT, equipment.getEquipmentName() + " is inactive; choose other equipment.");
            }
        }
        order.setEquipmentId(id);
        order.setUpdatedBy(projectAccessService.requireCurrentUserId());
        WorkOrder saved = workOrderRepository.save(order);
        return WorkOrderServiceImpl.toResponse(saved,
            productionRunRepository.findAllByWorkOrderIdInAndDeletedYn(List.of(saved.getWorkOrderId()), NOT_DELETED));
    }
}
