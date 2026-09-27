package org.myweb.flowmat.domain.catalog.api.dto.request;

import java.util.List;

/**
 * Sets the equipment's shift. Times are local to the planning time zone, such as "08:30"; a shift that ends at or before
 * its start runs past midnight, and equal times mean the whole day. {@code workDays} are ISO days, 1 (Monday) to 7.
 */
public record EquipmentCalendarRequest(
    String shiftStart,
    String shiftEnd,
    List<Integer> workDays
) {
}
