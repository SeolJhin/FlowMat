package org.myweb.flowmat.domain.flowrun.api.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;

public record FlowRunStartRequest(
    @NotBlank String workflowId,
    @NotBlank String workflowRevisionId,
    @NotBlank String runType,
    JsonNode inputPayload
) {
}
