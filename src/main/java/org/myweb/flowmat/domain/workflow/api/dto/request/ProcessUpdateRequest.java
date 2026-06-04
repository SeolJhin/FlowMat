package org.myweb.flowmat.domain.workflow.api.dto.request;

public record ProcessUpdateRequest(String processName, String processStatus, Double posX, Double posY) {
}
