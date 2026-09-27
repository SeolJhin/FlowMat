package org.myweb.flowmat.domain.workflow.api.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ProcessIoCreateRequest(
    @NotBlank String processId,
    @NotBlank String itemId,
    @Size(max = 100, message = "ioName must be at most 100 characters.") String ioName,
    @NotBlank String direction,
    @Size(max = 30, message = "ioType must be at most 30 characters.") String ioType,
    @NotNull BigDecimal quantity,
    @NotBlank @Size(max = 20, message = "unit must be at most 20 characters.") String unit,
    String formula,
    @Size(max = 30, message = "colorScheme must be at most 30 characters.") String colorScheme,
    String requiredYn,
    String allowShortageYn,
    @Size(max = 50) String role,
    @Size(max = 50) String resourceType,
    JsonNode schemaJson,
    @Size(max = 2000) String validationRule
) {
}
