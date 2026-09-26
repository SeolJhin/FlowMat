package org.myweb.flowmat.domain.catalog.api.dto.response;

import java.math.BigDecimal;
import org.myweb.flowmat.domain.catalog.api.dto.request.ItemDetails;

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
    BigDecimal unitCost,
    /** Never null; fields not recorded are null. */
    ItemDetails details,
    /** Null when the item is bought in its stock unit. */
    String purchaseUnit,
    /** Stock units in one purchase unit; null without a purchase unit. */
    BigDecimal purchaseUnitQty
) {
}
