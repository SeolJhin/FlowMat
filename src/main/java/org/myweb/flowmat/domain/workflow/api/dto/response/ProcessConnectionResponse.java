package org.myweb.flowmat.domain.workflow.api.dto.response;

import java.math.BigDecimal;

public record ProcessConnectionResponse(
    String connectionId,
    String projectId,
    String workflowId,
    String fromProcessId,
    String toProcessId,
    String fromIoId,
    String toIoId,
    String itemId,
    String connectionType,
    String connectionLabel,
    BigDecimal flowRate,
    String unit,
    BigDecimal delayTimeSec,
    BigDecimal lossRate,
    Integer priority
) {
}
