package org.myweb.flowmat.domain.workflow.api.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ProcessConnectionUpdateRequest(
    String fromIoId,
    String toIoId,
    String itemId,
    @Size(max = 50, message = "sourceHandle must be at most 50 characters.") String sourceHandle,
    @Size(max = 50, message = "targetHandle must be at most 50 characters.") String targetHandle,
    @Size(max = 30, message = "connectionType must be at most 30 characters.") String connectionType,
    JsonNode connectionLabel,
    JsonNode flowRate,
    JsonNode unit,
    JsonNode delayTimeSec,
    JsonNode lossRate,
    JsonNode priority,
    @Size(max = 2000) String conditionExpr,
    @DecimalMin("0.0") BigDecimal capacity,
    String failurePolicy,
    Boolean clearCapacity
) {
}
