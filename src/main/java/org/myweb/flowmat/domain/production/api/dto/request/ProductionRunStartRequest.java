package org.myweb.flowmat.domain.production.api.dto.request;

public record ProductionRunStartRequest(String workOrderId, String startedBy) {
}
