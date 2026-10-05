package org.myweb.flowmat.domain.catalog.api.dto.request;

import java.util.List;

/**
 * Replaces the equipment's shifts with {@code shifts}. Times are local to the planning time zone, such as "08:30"; a shift
 * that ends at or before its start runs past midnight, and equal times mean the whole day. {@code workDays} are ISO days,
 * 1 (Monday) to 7. Without {@code shifts}, the top-level fields describe a single shift, as before multi-shift calendars.
 */
public record EquipmentCalendarRequest(
    String shiftStart,
    String shiftEnd,
    List<Integer> workDays,
    List<Shift> shifts
) {

    public record Shift(String shiftStart, String shiftEnd, List<Integer> workDays) {
    }
}
