package org.myweb.flowmat.domain.production.api.dto.response;

import java.time.OffsetDateTime;
import java.util.List;

/** A work instruction revision with its steps in order (docs/domain/work-instruction.md). */
public record WorkInstructionResponse(
    String instructionId,
    String projectId,
    String itemId,
    String itemCode,
    String itemName,
    int revisionNo,
    String status,
    String title,
    String body,
    String documentUrl,
    String releasedBy,
    OffsetDateTime releasedAt,
    OffsetDateTime updatedAt,
    List<Step> steps,
    /** A run cannot finish until the required steps are confirmed. */
    boolean blocksFinish
) {

    public record Step(
        String stepId,
        int stepNo,
        String text,
        boolean required,
        boolean recordsValue,
        String valueLabel
    ) {
    }
}
