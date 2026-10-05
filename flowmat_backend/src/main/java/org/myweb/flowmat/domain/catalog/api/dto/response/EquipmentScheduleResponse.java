package org.myweb.flowmat.domain.catalog.api.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * The equipment's shifts (calendar null when it has none, so it is always available), its downtime, newest first, and the
 * dates whose shifts differ from the calendar's, earliest first.
 */
public record EquipmentScheduleResponse(
    String equipmentId,
    /** Zone the shift times are read in. */
    String timeZone,
    Calendar calendar,
    List<Downtime> downtimes,
    List<Day> days
) {

    /** All shifts, earliest start first, and the hours they add up to in a week without holidays or downtime. */
    public record Calendar(
        List<Shift> shifts,
        BigDecimal weeklyHours,
        String updatedBy,
        OffsetDateTime updatedAt
    ) {
    }

    public record Shift(
        String shiftId,
        String shiftStart,
        String shiftEnd,
        List<Integer> workDays,
        BigDecimal shiftHours
    ) {
    }

    /** A date's own shifts in place of the calendar's; {@code closed} when there are none. */
    public record Day(
        String date,
        List<DayShift> shifts,
        boolean closed,
        BigDecimal hours,
        String reason,
        String updatedBy,
        OffsetDateTime updatedAt
    ) {
    }

    public record DayShift(String shiftStart, String shiftEnd, BigDecimal shiftHours) {
    }

    public record Downtime(
        String downtimeId,
        String downtimeType,
        OffsetDateTime startsAt,
        OffsetDateTime endsAt,
        BigDecimal hours,
        String reason,
        String createdBy,
        OffsetDateTime createdAt
    ) {
    }
}
