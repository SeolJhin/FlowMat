package org.myweb.flowmat.domain.workflow.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.workflow.api.dto.request.ProcessCreateRequest;
import org.myweb.flowmat.domain.workflow.api.dto.request.ProcessUpdateRequest;
import org.myweb.flowmat.domain.workflow.api.dto.response.ProcessResponse;
import org.myweb.flowmat.domain.workflow.application.ProcessService;
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
@RequestMapping("/processes")
public class ProcessController {

    private final ProcessService processService;

    @GetMapping
    public ApiResponse<List<ProcessResponse>> listProcesses(@RequestParam String workflowId) {
        return ApiResponse.ok(processService.listProcesses(workflowId));
    }

    @PostMapping
    public ApiResponse<ProcessResponse> createProcess(@Valid @RequestBody ProcessCreateRequest request) {
        return ApiResponse.ok(processService.createProcess(request));
    }

    @GetMapping("/{processId}")
    public ApiResponse<ProcessResponse> getProcess(@PathVariable String processId) {
        return ApiResponse.ok(processService.getProcess(processId));
    }

    @PutMapping("/{processId}")
    public ApiResponse<ProcessResponse> updateProcess(
        @PathVariable String processId,
        @RequestBody ProcessUpdateRequest request
    ) {
        return ApiResponse.ok(processService.updateProcess(processId, request));
    }

    @DeleteMapping("/{processId}")
    public ApiResponse<Void> deleteProcess(@PathVariable String processId) {
        processService.deleteProcess(processId);
        return ApiResponse.ok(null);
    }
}
