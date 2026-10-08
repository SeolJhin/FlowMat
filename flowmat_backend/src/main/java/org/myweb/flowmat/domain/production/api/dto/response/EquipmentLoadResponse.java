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
        List<Order> orders,
        /** The window's changeovers and an order with fewer; null without two orders with items or any changeover time. */
        ChangeoverPlan changeovers
    ) {
    }

    /**
     * The changeovers of the window's open orders with a target item, in planned order, and an order of the same orders
     * that changes over less when there is one (docs/domain/equipment-load.md "전환 순서 제안"). Running orders stay first.
     */
    public record ChangeoverPlan(
        int plannedMinutes,
        /** Null when no order changes over less than the plan. */
        Integer suggestedMinutes,
        /** Work order numbers in the suggested order; null with no suggestion. */
        List<String> suggestedOrder
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
        BigDecimal hoursInWindow,
        /** Whole-order changeover minutes / 60 × current equipment rate; null if unknown. Not actual or material cost. */
        BigDecimal setupCostEstimate
    ) {
    }
}
