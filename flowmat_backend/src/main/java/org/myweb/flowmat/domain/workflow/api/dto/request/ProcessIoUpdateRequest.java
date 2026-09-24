package org.myweb.flowmat.domain.workflow.api.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ProcessIoUpdateRequest(
    String itemId,
    String ioName,
    String direction,
    String ioType,
    BigDecimal quantity,
    String unit,
    String formula,
    String colorScheme,
    String requiredYn,
    String allowShortageYn,
    @Size(max = 50) String role,
    @Size(max = 50) String resourceType,
    JsonNode schemaJson,
    @Size(max = 2000) String validationRule
) {
}
