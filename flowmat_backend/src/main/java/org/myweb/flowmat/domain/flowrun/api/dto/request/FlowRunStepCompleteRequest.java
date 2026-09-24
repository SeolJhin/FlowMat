package org.myweb.flowmat.domain.flowrun.api.dto.request;

import com.fasterxml.jackson.databind.JsonNode;

public record FlowRunStepCompleteRequest(JsonNode outputSnapshot) {
}
