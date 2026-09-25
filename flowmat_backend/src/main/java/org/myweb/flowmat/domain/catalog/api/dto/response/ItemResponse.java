package org.myweb.flowmat.domain.catalog.api.dto.response;

import java.math.BigDecimal;

public record ItemResponse(
    String itemId,
    String projectId,
    String itemCode,
    String itemName,
    String itemType,
    String resourceCategory,
    String resourceType,
    String unitId,
    String itemStatus,
    /** "Y": stock, receipts and production of this item must name a LOT. Defaults to "N". */
    String lotManageYn,
    BigDecimal safetyStockQty,
    Integer leadTimeDays,
    BigDecimal unitCost
) {
}
