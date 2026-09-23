package org.myweb.flowmat.domain.production.api.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record WorkOrderResponse(
    String workOrderId,
    String projectId,
    String workflowId,
    String workOrderNumber,
    String workOrderTitle,
    String workOrderStatus,
    String priority,
    String targetItemId,
    BigDecimal targetQuantity,
    OffsetDateTime plannedStartAt,
    OffsetDateTime plannedEndAt,
    OffsetDateTime actualStartAt,
    OffsetDateTime actualEndAt,
    String instruction,
    String assignedTo,
    String approvedBy,
    OffsetDateTime approvedAt,
    /** Sum of actual output from finished production runs started against this order. */
    BigDecimal producedQuantity,
    int runCount
) {
}
