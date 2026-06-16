package org.myweb.flowmat.domain.workflow.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record ProcessConnectionCreateRequest(
    @NotBlank String workflowId,
    @NotBlank String fromProcessId,
    @NotBlank String toProcessId,
    String fromIoId,
    String toIoId,
    String itemId,
    String sourceHandle,
    String targetHandle,
    String connectionType,
    String connectionLabel,
    BigDecimal flowRate,
    String unit,
    BigDecimal delayTimeSec,
    BigDecimal lossRate,
    Integer priority
) {
}
