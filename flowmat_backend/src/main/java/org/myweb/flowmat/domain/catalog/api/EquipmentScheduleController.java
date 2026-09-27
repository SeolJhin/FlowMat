package org.myweb.flowmat.domain.catalog.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.api.dto.request.EquipmentCalendarRequest;
import org.myweb.flowmat.domain.catalog.api.dto.request.EquipmentDowntimeRequest;
import org.myweb.flowmat.domain.catalog.api.dto.response.EquipmentAvailabilityResponse;
import org.myweb.flowmat.domain.catalog.api.dto.response.EquipmentScheduleResponse;
import org.myweb.flowmat.domain.catalog.application.EquipmentScheduleService;
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

/** Equipment calendar, downtime and available time (docs/domain/equipment-schedule.md). */
@RestController
@RequiredArgsConstructor
@RequestMapping("/equipments/{equipmentId}")
public class EquipmentScheduleController {

    private final EquipmentScheduleService equipmentScheduleService;

    @GetMapping("/schedule")
    public ApiResponse<EquipmentScheduleResponse> schedule(@PathVariable("equipmentId") String equipmentId) {
        return ApiResponse.ok(equipmentScheduleService.schedule(equipmentId));
    }

    @PutMapping("/calendar")
    public ApiResponse<EquipmentScheduleResponse> setCalendar(
        @PathVariable("equipmentId") String equipmentId,
        @RequestBody EquipmentCalendarRequest request
    ) {
        return ApiResponse.ok(equipmentScheduleService.setCalendar(equipmentId, request));
    }

    @DeleteMapping("/calendar")
    public ApiResponse<EquipmentScheduleResponse> clearCalendar(@PathVariable("equipmentId") String equipmentId) {
        return ApiResponse.ok(equipmentScheduleService.clearCalendar(equipmentId));
    }

    @PostMapping("/downtimes")
    public ApiResponse<EquipmentScheduleResponse> addDowntime(
        @PathVariable("equipmentId") String equipmentId,
        @RequestBody EquipmentDowntimeRequest request
    ) {
        return ApiResponse.ok(equipmentScheduleService.addDowntime(equipmentId, request));
    }

    @DeleteMapping("/downtimes/{downtimeId}")
    public ApiResponse<EquipmentScheduleResponse> removeDowntime(
        @PathVariable("equipmentId") String equipmentId,
        @PathVariable("downtimeId") String downtimeId
    ) {
        return ApiResponse.ok(equipmentScheduleService.removeDowntime(equipmentId, downtimeId));
    }

    /** {@code from} and {@code to} are ISO date-times with an offset; the window is at most 366 days. */
    @GetMapping("/availability")
    public ApiResponse<EquipmentAvailabilityResponse> availability(
        @PathVariable("equipmentId") String equipmentId,
        @RequestParam("from") String from,
        @RequestParam("to") String to
    ) {
        return ApiResponse.ok(equipmentScheduleService.availability(equipmentId, from, to));
    }
}
