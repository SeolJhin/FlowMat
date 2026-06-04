package org.myweb.flowmat.domain.workflow.api.dto.response;

public record ProcessConnectionResponse(String connectionId, String fromProcessId, String toProcessId, String itemId) {
}
