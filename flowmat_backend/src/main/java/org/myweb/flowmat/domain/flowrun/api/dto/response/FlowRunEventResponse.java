package org.myweb.flowmat.domain.flowrun.api.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.OffsetDateTime;

public record FlowRunEventResponse(
    String eventId,
    String flowRunId,
    String stepId,
    String eventType,
    JsonNode payload,
    String requestId,
    OffsetDateTime occurredAt,
    String actorType,
    String actorId
) {
}
