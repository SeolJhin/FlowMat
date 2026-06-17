package org.myweb.flowmat.domain.production.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ProductionRunStartRequest(
    @NotBlank String projectId,
    @NotBlank String workflowId,
    String targetItemId,
    @NotNull BigDecimal plannedOutputQty,
    String runType,
    String startedBy
) {
}
