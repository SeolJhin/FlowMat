package org.myweb.flowmat.domain.quality.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.quality.api.dto.request.CorrectiveActionRequest;
import org.myweb.flowmat.domain.quality.api.dto.request.NonconformityCreateRequest;
import org.myweb.flowmat.domain.quality.api.dto.request.NonconformityDefectsRequest;
import org.myweb.flowmat.domain.quality.api.dto.request.NonconformityUpdateRequest;
import org.myweb.flowmat.domain.quality.api.dto.request.QualityNoteRequest;
import org.myweb.flowmat.domain.quality.api.dto.response.NonconformityResponse;
import org.myweb.flowmat.domain.quality.application.NonconformityService;
import org.myweb.flowmat.global.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Nonconformities and corrective actions (docs/domain/nonconformity.md). */
@RestController
@RequiredArgsConstructor
@RequestMapping("/nonconformities")
public class NonconformityController {

    private final NonconformityService nonconformityService;

    @GetMapping
    public ApiResponse<List<NonconformityResponse>> list(
        @RequestParam String projectId,
        @RequestParam(required = false) String status
    ) {
        return ApiResponse.ok(nonconformityService.list(projectId, status));
    }

    @GetMapping("/{nonconformityId}")
    public ApiResponse<NonconformityResponse> get(@PathVariable String nonconformityId) {
        return ApiResponse.ok(nonconformityService.get(nonconformityId));
    }

    @PostMapping
    public ApiResponse<NonconformityResponse> create(@Valid @RequestBody NonconformityCreateRequest request) {
        return ApiResponse.ok(nonconformityService.create(request));
    }

    @PutMapping("/{nonconformityId}")
    public ApiResponse<NonconformityResponse> update(
        @PathVariable String nonconformityId,
        @Valid @RequestBody NonconformityUpdateRequest request
    ) {
        return ApiResponse.ok(nonconformityService.update(nonconformityId, request));
    }

    @PostMapping("/{nonconformityId}/defects")
    public ApiResponse<NonconformityResponse> addDefects(
        @PathVariable String nonconformityId,
        @Valid @RequestBody NonconformityDefectsRequest request
    ) {
        return ApiResponse.ok(nonconformityService.addDefects(nonconformityId, request.defectLogIds()));
    }

    @PostMapping("/{nonconformityId}/actions")
    public ApiResponse<NonconformityResponse> addAction(
        @PathVariable String nonconformityId,
        @Valid @RequestBody CorrectiveActionRequest request
    ) {
        return ApiResponse.ok(nonconformityService.addAction(nonconformityId, request));
    }

    @PostMapping("/{nonconformityId}/actions/{correctiveActionId}/complete")
    public ApiResponse<NonconformityResponse> completeAction(
        @PathVariable String nonconformityId,
        @PathVariable String correctiveActionId,
        @Valid @RequestBody QualityNoteRequest request
    ) {
        return ApiResponse.ok(nonconformityService.finishAction(nonconformityId, correctiveActionId, true, request.note()));
    }

    @PostMapping("/{nonconformityId}/actions/{correctiveActionId}/cancel")
    public ApiResponse<NonconformityResponse> cancelAction(
        @PathVariable String nonconformityId,
        @PathVariable String correctiveActionId,
        @Valid @RequestBody QualityNoteRequest request
    ) {
        return ApiResponse.ok(nonconformityService.finishAction(nonconformityId, correctiveActionId, false, request.note()));
    }

    @PostMapping("/{nonconformityId}/close")
    public ApiResponse<NonconformityResponse> close(
        @PathVariable String nonconformityId,
        @Valid @RequestBody QualityNoteRequest request
    ) {
        return ApiResponse.ok(nonconformityService.close(nonconformityId, request.note()));
    }

    @PostMapping("/{nonconformityId}/cancel")
    public ApiResponse<NonconformityResponse> cancel(
        @PathVariable String nonconformityId,
        @Valid @RequestBody QualityNoteRequest request
    ) {
        return ApiResponse.ok(nonconformityService.cancel(nonconformityId, request.note()));
    }
}
