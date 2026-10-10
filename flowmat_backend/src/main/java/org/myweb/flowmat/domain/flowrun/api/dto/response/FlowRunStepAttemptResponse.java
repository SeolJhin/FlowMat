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
    String errorMessage,
    /** When a running attempt times out; null without a time limit (docs/domain/flow-run-execution-policy.md EP7). */
    OffsetDateTime timeoutAt
) {
}
