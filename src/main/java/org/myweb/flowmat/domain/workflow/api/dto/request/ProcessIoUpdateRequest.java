package org.myweb.flowmat.domain.workflow.api.dto.request;

import java.math.BigDecimal;

public record ProcessIoUpdateRequest(
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
