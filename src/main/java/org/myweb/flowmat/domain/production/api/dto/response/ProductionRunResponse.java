package org.myweb.flowmat.domain.production.api.dto.response;

import java.math.BigDecimal;

public record ProductionRunResponse(
    String productionRunId,
    String projectId,
    String workflowId,
    String runNumber,
    String runType,
    String runStatus,
    String targetItemId,
    BigDecimal plannedOutputQty,
    BigDecimal actualOutputQty
) {
}
