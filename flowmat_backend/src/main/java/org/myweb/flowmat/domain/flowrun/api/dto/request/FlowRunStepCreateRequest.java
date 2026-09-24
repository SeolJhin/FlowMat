package org.myweb.flowmat.domain.flowrun.api.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;

public record FlowRunStepCreateRequest(@NotBlank String nodeId, JsonNode inputSnapshot) {
}
