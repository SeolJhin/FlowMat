package org.myweb.flowmat.domain.workflow.api.dto.response;

public record WorkflowValidationIssue(
    String severity,
    String code,
    String processId,
    String ioId,
    String connectionId,
    String message
) {}
