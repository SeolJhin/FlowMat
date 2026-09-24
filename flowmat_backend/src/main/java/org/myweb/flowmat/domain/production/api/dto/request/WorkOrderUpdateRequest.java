package org.myweb.flowmat.domain.production.api.dto.request;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Replaces the editable fields of a {@code draft} work order; approved orders are frozen. */
public record WorkOrderUpdateRequest(
    String workOrderTitle,
    String workflowId,
    String targetItemId,
    BigDecimal targetQuantity,
    String priority,
    OffsetDateTime plannedStartAt,
    OffsetDateTime plannedEndAt,
    String instruction,
    String assignedTo,
    /** BOM revision the order produces with; null clears it. Must be approved before the order is approved. */
    String bomId
) {
}
