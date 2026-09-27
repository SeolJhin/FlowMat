package org.myweb.flowmat.domain.quality.api.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * A nonconformity with its defects and actions (docs/domain/nonconformity.md).
 *
 * @param overdueActions open actions whose due date has passed
 */
public record NonconformityResponse(
    String nonconformityId,
    String projectId,
    String ncrNo,
    String title,
    String description,
    String severity,
    String status,
    String itemId,
    String itemCode,
    String lotId,
    String lotNo,
    String productionRunId,
    String runNumber,
    String rootCause,
    String disposition,
    String raisedBy,
    OffsetDateTime raisedAt,
    String closedBy,
    OffsetDateTime closedAt,
    String closureNote,
    List<LinkedDefect> defects,
    List<Action> actions,
    int openActions,
    int overdueActions
) {

    public record LinkedDefect(
        String defectLogId,
        String defectType,
        String severity,
        BigDecimal quantity,
        String itemCode,
        String lotNo,
        boolean resolved
    ) {
    }

    /** @param overdue open and its due date has passed */
    public record Action(
        String correctiveActionId,
        int actionNo,
        String actionType,
        String description,
        String ownerId,
        LocalDate dueDate,
        String status,
        String resultNote,
        String createdBy,
        OffsetDateTime createdAt,
        String finishedBy,
        OffsetDateTime finishedAt,
        boolean overdue
    ) {
    }
}
