package org.myweb.flowmat.domain.workflow.api.dto.response;

import java.util.List;

public record WorkflowCanvasResponse(
    WorkflowResponse workflow,
    long graphSeq,
    List<ProcessResponse> processes,
    List<ProcessIoResponse> processIos,
    List<ProcessConnectionResponse> connections
) {
}
