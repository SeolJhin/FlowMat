package org.myweb.flowmat.domain.workflow.api.dto.request;

public record ProcessConnectionCreateRequest(String workflowId, String fromProcessId, String toProcessId, String itemId) {
}
