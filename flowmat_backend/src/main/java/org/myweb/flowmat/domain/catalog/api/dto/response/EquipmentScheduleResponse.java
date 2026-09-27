package org.myweb.flowmat.domain.catalog.api.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/** The equipment's shift (null when it has none, so it is always available) and its downtime, newest first. */
public record EquipmentScheduleResponse(
    String equipmentId,
    /** Zone the shift times are read in. */
    String timeZone,
    Calendar calendar,
    List<Downtime> downtimes
) {

    public record Calendar(
        String shiftStart,
        String shiftEnd,
        List<Integer> workDays,
        BigDecimal shiftHours,
        String updatedBy,
        OffsetDateTime updatedAt
    ) {
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
