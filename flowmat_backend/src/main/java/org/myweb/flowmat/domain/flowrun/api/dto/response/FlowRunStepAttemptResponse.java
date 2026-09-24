package org.myweb.flowmat.domain.flowrun.api.dto.response;

import java.time.OffsetDateTime;

public record FlowRunStepAttemptResponse(
    String attemptId,
    String stepId,
    Integer attemptNo,
    String status,
    OffsetDateTime startedAt,
    OffsetDateTime endedAt,
    OffsetDateTime retryAt,
    String errorCode,
    String errorMessage
) {
}
