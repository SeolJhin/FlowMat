package org.myweb.flowmat.domain.production.application.publicapi;

import java.math.BigDecimal;

/**
 * What another bounded context may read about a work order. {@code acceptsRuns}: approved or in progress, so runs,
 * allocations and picks can be made for it.
 */
public record WorkOrderView(
    String workOrderId,
    String projectId,
    String workOrderNumber,
    String workOrderStatus,
    boolean acceptsRuns,
    String bomId,
    String targetItemId,
    BigDecimal targetQuantity
) {
}
