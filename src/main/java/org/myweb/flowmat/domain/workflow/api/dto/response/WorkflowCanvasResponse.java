package org.myweb.flowmat.domain.workflow.api.dto.response;

import java.util.List;

public record WorkflowCanvasResponse(
    WorkflowResponse workflow,
    List<ProcessResponse> processes,
    List<ProcessIoResponse> processIos,
    List<ProcessConnectionResponse> connections
) {
}
