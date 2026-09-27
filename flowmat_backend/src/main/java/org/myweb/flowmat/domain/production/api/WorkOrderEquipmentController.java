package org.myweb.flowmat.domain.production.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.production.api.dto.request.WorkOrderEquipmentRequest;
import org.myweb.flowmat.domain.production.api.dto.response.WorkOrderResponse;
import org.myweb.flowmat.domain.production.application.WorkOrderEquipmentService;
import org.myweb.flowmat.global.response.ApiResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/work-orders")
public class WorkOrderEquipmentController {

    private final WorkOrderEquipmentService workOrderEquipmentService;

    /** Assigns or (with a null id) unassigns the equipment; readiness then checks its time in the planned window. */
    @PutMapping("/{workOrderId}/equipment")
    public ApiResponse<WorkOrderResponse> assign(
        @PathVariable("workOrderId") String workOrderId,
        @RequestBody WorkOrderEquipmentRequest request
    ) {
        return ApiResponse.ok(workOrderEquipmentService.assign(workOrderId, request == null ? null : request.equipmentId()));
    }
}
