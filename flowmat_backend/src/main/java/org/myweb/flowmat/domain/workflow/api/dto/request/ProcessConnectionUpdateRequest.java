package org.myweb.flowmat.domain.workflow.api.dto.request;

import java.math.BigDecimal;

public record ProcessConnectionUpdateRequest(
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
