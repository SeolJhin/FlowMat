package org.myweb.flowmat.domain.production.api.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Suggested planned start and end of a work order on its equipment (docs/domain/equipment-schedule.md "계획 기간 제안").
 * Nothing is changed; a draft takes the dates through the usual work order update.
 */
public record WorkOrderPlanSuggestionResponse(
    String workOrderId,
    String equipmentId,
    /** Where the search began: the requested time, else the planned start if still ahead, else now. */
    OffsetDateTime from,
    OffsetDateTime plannedStartAt,
    OffsetDateTime plannedEndAt,
    BigDecimal remainingQuantity,
    BigDecimal capacityPerHour,
    /** Remaining quantity at the capacity per hour, rounded up to 0.01 h. */
    BigDecimal productionHours,
    BigDecimal changeoverHours,
    /** Production plus changeover: the available time between the start and the end. */
    BigDecimal neededHours,
    /** The order whose item this one changes over from; null without a changeover. */
    String changeoverFrom,
    /** Approved or running orders on the same equipment the suggestion was moved after, earliest first. */
    List<String> movedPast
) {
}
