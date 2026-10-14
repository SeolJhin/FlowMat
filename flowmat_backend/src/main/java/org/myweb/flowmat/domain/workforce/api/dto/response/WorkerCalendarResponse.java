package org.myweb.flowmat.domain.workforce.api.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * A worker's calendar in a project (docs/domain/worker-calendar.md WC5).
 *
 * @param owner       whether the worker owns the project
 * @param weeklyHours the shifts' hours in a week, before days off and holidays
 * @param daysOff     days off that have not ended more than 31 days ago, earliest first
 * @param days        dates with their own shifts (WC29) from 31 days ago on, earliest first
 */
public record WorkerCalendarResponse(
    String projectId,
    String userId,
    boolean owner,
    boolean calendarSet,
    BigDecimal weeklyHours,
    List<Shift> shifts,
    List<DayOff> daysOff,
    List<Day> days
) {

    /** One weekly shift, its start and end as "HH:mm" and the hours of one shift. */
    public record Shift(String shiftId, String shiftStart, String shiftEnd, List<Integer> workDays, BigDecimal hours) {
    }

    public record DayOff(String dayOffId, LocalDate firstDay, LocalDate lastDay, String reason, String createdBy) {
    }

    /** A date's own shifts in place of the weekly ones; {@code off} when there are none. */
    public record Day(LocalDate date, List<DayShift> shifts, boolean off, BigDecimal hours, String reason, String updatedBy) {
    }

    public record DayShift(String shiftStart, String shiftEnd, BigDecimal hours) {
    }
}
