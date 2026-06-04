package org.myweb.flowmat.domain.workflow.api.dto.request;

public record ProcessIoCreateRequest(String processId, String itemId, String direction, String unit) {
}
