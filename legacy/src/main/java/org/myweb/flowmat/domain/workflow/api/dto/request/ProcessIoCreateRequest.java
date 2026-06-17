package org.myweb.flowmat.domain.workflow.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ProcessIoCreateRequest(
    @NotBlank String processId,
    @NotBlank String itemId,
    String ioName,
    @NotBlank String direction,
    String ioType,
    @NotNull BigDecimal quantity,
    @NotBlank String unit,
    String formula,
    String colorScheme,
    String requiredYn,
    String allowShortageYn
) {
}
