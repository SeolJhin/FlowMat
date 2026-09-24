package org.myweb.flowmat.domain.flowrun.api.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.OffsetDateTime;

public record FlowRunResponse(
    String flowRunId,
    String projectId,
    String workflowId,
    String workflowRevisionId,
    String productionRunId,
    String runType,
    String status,
    JsonNode inputPayload,
    JsonNode outputPayload,
    OffsetDateTime startedAt,
    OffsetDateTime endedAt,
    String requestedBy
) {
}
