package org.myweb.flowmat.domain.workflow.api.dto.request;

public record WorkflowCreateRequest(String projectId, String workflowName, String workflowType) {
}
