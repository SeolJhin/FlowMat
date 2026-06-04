package org.myweb.flowmat.domain.workflow.api.dto.request;

public record ProcessCreateRequest(String workflowId, String processName, String processType, String nodeType) {
}
