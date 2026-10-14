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
    List<String> movedPast,
    /** The order's crew and each person's shift hours in the suggested window (docs/domain/worker-calendar.md WC14). */
    List<Crew> crew,
    /** Crew members with shifts who were not working when the equipment alone could have started (WC25). */
    List<String> waitedForCrew,
    /** Approved or running orders that already hold some of the crew, which the suggestion was moved after (WC25). */
    List<CrewBooking> crewMovedPast
) {

    public record CrewBooking(String workOrderNumber, List<String> userIds) {
    }

    /** @param calendarSet false when the person has no shifts, so their hours are not known */
    public record Crew(String userId, boolean calendarSet, BigDecimal hours, int sharePercent) {
    }
}
