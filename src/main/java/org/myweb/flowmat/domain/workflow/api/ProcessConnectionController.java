package org.myweb.flowmat.domain.workflow.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.workflow.api.dto.request.ProcessConnectionCreateRequest;
import org.myweb.flowmat.domain.workflow.api.dto.request.ProcessConnectionUpdateRequest;
import org.myweb.flowmat.domain.workflow.api.dto.response.ProcessConnectionResponse;
import org.myweb.flowmat.domain.workflow.application.ProcessConnectionService;
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
@RequestMapping("/process-connections")
public class ProcessConnectionController {

    private final ProcessConnectionService processConnectionService;

    @GetMapping
    public ApiResponse<List<ProcessConnectionResponse>> listConnections(@RequestParam String workflowId) {
        return ApiResponse.ok(processConnectionService.listConnections(workflowId));
    }

    @PostMapping
    public ApiResponse<ProcessConnectionResponse> createConnection(
        @Valid @RequestBody ProcessConnectionCreateRequest request
    ) {
        return ApiResponse.ok(processConnectionService.createConnection(request));
    }

    @GetMapping("/{connectionId}")
    public ApiResponse<ProcessConnectionResponse> getConnection(@PathVariable String connectionId) {
        return ApiResponse.ok(processConnectionService.getConnection(connectionId));
    }

    @PutMapping("/{connectionId}")
    public ApiResponse<ProcessConnectionResponse> updateConnection(
        @PathVariable String connectionId,
        @RequestBody ProcessConnectionUpdateRequest request
    ) {
        return ApiResponse.ok(processConnectionService.updateConnection(connectionId, request));
    }

    @DeleteMapping("/{connectionId}")
    public ApiResponse<Void> deleteConnection(@PathVariable String connectionId) {
        processConnectionService.deleteConnection(connectionId);
        return ApiResponse.ok(null);
    }
}
