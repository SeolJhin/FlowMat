package org.myweb.flowmat.domain.production.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.myweb.flowmat.domain.production.domain.entity.WorkOrder;
import org.myweb.flowmat.domain.production.domain.enums.WorkOrderStatus;

class EquipmentSequenceTest {

    private static final OffsetDateTime START = OffsetDateTime.parse("2030-01-07T10:00:00+09:00");

    @Test
    void skipsMalformedScheduledIntervalsBeforeFindingThePriorOrder() {
        WorkOrder malformed = order("malformed", "item-malformed", "2030-01-07T08:00:00+09:00",
            "2030-01-07T07:00:00+09:00", WorkOrderStatus.APPROVED);
        WorkOrder valid = order("valid", "item-valid", "2030-01-07T06:00:00+09:00",
            "2030-01-07T07:00:00+09:00", WorkOrderStatus.APPROVED);

        assertEquals(valid, EquipmentSequence.previous(START, List.of(malformed, valid)));
    }

    @Test
    void keepsOpenEndedRunningOrdersAsThePriorOrder() {
        WorkOrder running = order("running", "item-running", "2030-01-07T08:00:00+09:00",
            null, WorkOrderStatus.IN_PROGRESS);

        assertEquals(running, EquipmentSequence.previous(START, List.of(running)));
    }

    @Test
    void skipsApprovedOrdersWithoutAPlannedEnd() {
        WorkOrder approved = order("approved", "item-approved", "2030-01-07T08:00:00+09:00",
            null, WorkOrderStatus.APPROVED);

        assertNull(EquipmentSequence.previous(START, List.of(approved)));
    }

    @Test
    void returnsNoPriorOrderWhenAllCandidatesHaveInvalidIntervals() {
        WorkOrder malformed = order("malformed", "item-malformed", "2030-01-07T08:00:00+09:00",
            "2030-01-07T07:00:00+09:00", WorkOrderStatus.APPROVED);

        assertNull(EquipmentSequence.previous(START, List.of(malformed)));
    }

    @Test
    void resolvesOrdersWithTheSameStartIndependentlyOfRepositoryOrder() {
        WorkOrder first = order("work-order-a", "item-a", "2030-01-07T08:00:00+09:00",
            "2030-01-07T09:00:00+09:00", WorkOrderStatus.APPROVED);
        WorkOrder second = order("work-order-b", "item-b", "2030-01-07T08:00:00+09:00",
            "2030-01-07T09:00:00+09:00", WorkOrderStatus.APPROVED);

        assertEquals(second, EquipmentSequence.previous(START, List.of(first, second)));
        assertEquals(second, EquipmentSequence.previous(START, List.of(second, first)));
    }

    private static WorkOrder order(String id, String itemId, String start, String end, WorkOrderStatus status) {
        WorkOrder order = new WorkOrder();
        order.setWorkOrderId(id);
        order.setTargetItemId(itemId);
        order.setPlannedStartAt(OffsetDateTime.parse(start));
        order.setPlannedEndAt(end == null ? null : OffsetDateTime.parse(end));
        order.setWorkOrderStatus(status.code());
        order.setDeletedYn("N");
        return order;
    }
}
