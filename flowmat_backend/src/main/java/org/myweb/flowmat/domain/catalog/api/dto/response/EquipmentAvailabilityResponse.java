package org.myweb.flowmat.domain.catalog.api.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Working time in [from, to): the shifts that fall in the window (the whole window without a calendar), less the downtime
 * inside them. {@code capacity} is the available hours times the capacity per hour, or null without one.
 */
public record EquipmentAvailabilityResponse(
    String equipmentId,
    OffsetDateTime from,
    OffsetDateTime to,
    boolean calendarSet,
    BigDecimal workingHours,
    BigDecimal downtimeHours,
    BigDecimal availableHours,
    BigDecimal capacityPerHour,
    BigDecimal capacity
) {
}
