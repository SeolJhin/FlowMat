package org.myweb.flowmat.domain.production.application.publicapi;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * What another bounded context may read about a work order. {@code acceptsRuns}: approved or in progress, so runs,
 * allocations and picks can be made for it. {@code plannedStartAt}: its day picks a phantom's revision (docs/domain/multi-level-bom.md P3).
 */
public record WorkOrderView(
    String workOrderId,
    String projectId,
    String workOrderNumber,
    String workOrderStatus,
    boolean acceptsRuns,
    String bomId,
    String targetItemId,
    BigDecimal targetQuantity,
    OffsetDateTime plannedStartAt
) {
}
