package org.myweb.flowmat.domain.workforce.api;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.workforce.api.dto.request.WorkerDayOffRequest;
import org.myweb.flowmat.domain.workforce.api.dto.request.WorkerDayRequest;
import org.myweb.flowmat.domain.workforce.api.dto.request.WorkerShiftsRequest;
import org.myweb.flowmat.domain.workforce.api.dto.response.WorkerAvailabilityResponse;
import org.myweb.flowmat.domain.workforce.api.dto.response.WorkerCalendarResponse;
import org.myweb.flowmat.domain.workforce.application.WorkerCalendarService;
import org.myweb.flowmat.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Workers' calendars in a project (docs/domain/worker-calendar.md WC5-WC7). */
@RestController
@RequiredArgsConstructor
@RequestMapping("/projects/{projectId}/workers")
public class WorkerCalendarController {

    private final WorkerCalendarService service;

    @GetMapping
    public ApiResponse<List<WorkerCalendarResponse>> workers(@PathVariable("projectId") String projectId) {
        return ApiResponse.ok(service.workers(projectId));
    }

    @GetMapping("/{userId}")
    public ApiResponse<WorkerCalendarResponse> worker(@PathVariable("projectId") String projectId,
                                                      @PathVariable("userId") String userId) {
        return ApiResponse.ok(service.worker(projectId, userId));
    }

    @PutMapping("/{userId}/shifts")
    public ApiResponse<WorkerCalendarResponse> setShifts(@PathVariable("projectId") String projectId,
                                                         @PathVariable("userId") String userId,
                                                         @RequestBody(required = false) WorkerShiftsRequest request) {
        return ApiResponse.ok(service.setShifts(projectId, userId, request));
    }

    @PostMapping("/{userId}/days-off")
    public ApiResponse<WorkerCalendarResponse> addDayOff(@PathVariable("projectId") String projectId,
                                                         @PathVariable("userId") String userId,
                                                         @RequestBody(required = false) WorkerDayOffRequest request) {
        return ApiResponse.ok(service.addDayOff(projectId, userId, request));
    }

    @DeleteMapping("/{userId}/days-off/{dayOffId}")
    public ApiResponse<WorkerCalendarResponse> removeDayOff(@PathVariable("projectId") String projectId,
                                                            @PathVariable("userId") String userId,
                                                            @PathVariable("dayOffId") String dayOffId) {
        return ApiResponse.ok(service.removeDayOff(projectId, userId, dayOffId));
    }

    /** One date's shifts in place of the weekly ones; none means the worker does not work that day (WC29-WC31). */
    @PutMapping("/{userId}/days/{date}")
    public ApiResponse<WorkerCalendarResponse> setDay(@PathVariable("projectId") String projectId,
                                                      @PathVariable("userId") String userId,
                                                      @PathVariable("date") String date,
                                                      @RequestBody(required = false) WorkerDayRequest request) {
        return ApiResponse.ok(service.setDay(projectId, userId, date, request));
    }

    /** The date, or with {@code through} every date of its own up to that one, back to the weekly shifts (WC32). */
    @DeleteMapping("/{userId}/days/{date}")
    public ApiResponse<WorkerCalendarResponse> clearDay(@PathVariable("projectId") String projectId,
                                                        @PathVariable("userId") String userId,
                                                        @PathVariable("date") String date,
                                                        @RequestParam(value = "through", required = false) String through) {
        return ApiResponse.ok(service.clearDay(projectId, userId, date, through));
    }

    @GetMapping("/{userId}/availability")
    public ApiResponse<WorkerAvailabilityResponse> availability(@PathVariable("projectId") String projectId,
                                                                @PathVariable("userId") String userId,
                                                                @RequestParam(value = "from", required = false) String from,
                                                                @RequestParam(value = "to", required = false) String to) {
        return ApiResponse.ok(service.availability(projectId, userId, from, to));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> invalidBody(HttpMessageNotReadableException exception) {
        return ResponseEntity.badRequest().body(ApiResponse.error(
            "Send shifts as a list of {shiftStart, shiftEnd, workDays} or a day off as {firstDay, lastDay, reason}."));
    }
}
