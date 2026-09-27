package org.myweb.flowmat.domain.production.api.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Each equipment's available hours in [from, to) against the hours its work orders need there (docs/domain/equipment-load.md).
 */
public record EquipmentLoadResponse(
    OffsetDateTime from,
    OffsetDateTime to,
    List<Row> equipment
) {

    public record Row(
        String equipmentId,
        String equipmentCode,
        String equipmentName,
        String equipmentStatus,
        BigDecimal capacityPerHour,
        boolean calendarSet,
        BigDecimal availableHours,
        BigDecimal downtimeHours,
        /** Hours approved and running orders need in the window. */
        BigDecimal plannedHours,
        /** Hours draft orders would add. */
        BigDecimal draftHours,
        /** Planned over available, one decimal; null when nothing is available. */
        BigDecimal loadPercent,
        boolean overloaded,
        /** Open orders on the equipment without a planned start and end. */
        int unplannedOrders,
        /** Orders in the window whose hours cannot be worked out (no target quantity or no capacity per hour). */
        int unmeasuredOrders,
        List<Order> orders
    ) {
    }

    public record Order(
        String workOrderId,
        String workOrderNumber,
        String workOrderTitle,
        String workOrderStatus,
        String targetItemId,
        String targetItemCode,
        OffsetDateTime plannedStartAt,
        OffsetDateTime plannedEndAt,
        BigDecimal remainingQuantity,
        /** Changeover from the order before it on the equipment; null without one. */
        Integer changeoverMinutes,
        /** Production time for what is left plus the changeover; null when it cannot be worked out. */
        BigDecimal neededHours,
        /** The part of the needed hours that falls in the window. */
        BigDecimal hoursInWindow
    ) {
    }
}
