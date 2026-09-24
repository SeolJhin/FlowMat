package org.myweb.flowmat.domain.catalog.api;

import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import java.util.List;
import org.myweb.flowmat.domain.catalog.api.dto.request.EquipmentCreateRequest;
import org.myweb.flowmat.domain.catalog.api.dto.request.EquipmentUpdateRequest;
import org.myweb.flowmat.domain.catalog.api.dto.response.EquipmentResponse;
import org.myweb.flowmat.domain.catalog.application.EquipmentService;
import org.myweb.flowmat.global.response.ApiResponse;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/equipments")
public class EquipmentController {

    private final EquipmentService equipmentService;

    @GetMapping
    public ApiResponse<List<EquipmentResponse>> list(@RequestParam String projectId) {
        return ApiResponse.ok(equipmentService.listEquipment(projectId));
    }

    @GetMapping("/{equipmentId}")
    public ApiResponse<EquipmentResponse> get(@PathVariable String equipmentId) {
        return ApiResponse.ok(equipmentService.getEquipment(equipmentId));
    }

    @PostMapping
    public ApiResponse<EquipmentResponse> create(@Valid @RequestBody EquipmentCreateRequest request) {
        return ApiResponse.ok(equipmentService.createEquipment(request));
    }

    @PutMapping("/{equipmentId}")
    public ApiResponse<EquipmentResponse> update(@PathVariable String equipmentId, @Valid @RequestBody EquipmentUpdateRequest request) {
        return ApiResponse.ok(equipmentService.updateEquipment(equipmentId, request));
    }

    @DeleteMapping("/{equipmentId}")
    public ApiResponse<Void> delete(@PathVariable String equipmentId) {
        equipmentService.deleteEquipment(equipmentId);
        return ApiResponse.ok(null);
    }
}
