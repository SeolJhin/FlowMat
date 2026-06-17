package org.myweb.flowmat.domain.production.api.dto.response;

import java.math.BigDecimal;

public record ProductionRunItemResponse(
    String productionRunItemId,
    String productionRunId,
    String processId,
    String processIoId,
    String inventoryId,
    String itemId,
    String direction,
    BigDecimal plannedQty,
    BigDecimal actualQty,
    String unit
) {
}
