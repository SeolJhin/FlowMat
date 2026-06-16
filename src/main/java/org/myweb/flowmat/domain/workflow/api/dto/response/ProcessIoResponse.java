package org.myweb.flowmat.domain.workflow.api.dto.response;

import java.math.BigDecimal;

public record ProcessIoResponse(
    String processIoId,
    String processId,
    String itemId,
    String ioName,
    String direction,
    String ioType,
    BigDecimal quantity,
    String unit,
    String formula,
    String requiredYn,
    String allowShortageYn
) {
}
