package org.myweb.flowmat.domain.production.api.dto.response;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * A run's instruction checklist (docs/domain/work-instruction.md): the revision the run works to (fixed at its first
 * confirmation, before that the product's released one; null when there is none) and the confirmations so far.
 *
 * @param open whether the run can still be confirmed (pending or running)
 * @param complete every required step is confirmed (true when there is no instruction)
 */
public record RunInstructionResponse(
    String productionRunId,
    boolean open,
    WorkInstructionResponse instruction,
    List<Check> checks,
    int requiredSteps,
    int requiredDone,
    boolean complete
) {

    public record Check(
        String stepId,
        String value,
        String note,
        String checkedBy,
        OffsetDateTime checkedAt
    ) {
    }
}
