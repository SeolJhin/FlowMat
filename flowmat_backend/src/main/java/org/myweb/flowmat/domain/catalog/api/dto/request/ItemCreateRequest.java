package org.myweb.flowmat.domain.catalog.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record ItemCreateRequest(
    @NotBlank String projectId,
    @NotBlank String itemCode,
    @NotBlank String itemName,
    String itemType,
    String resourceCategory,
    String resourceType,
    String unitId,
    String itemStatus,
    /** "Y": stock, receipts and production of this item must name a LOT. Defaults to "N". */
    String lotManageYn,
    /** Stock to keep across all records; 0 or empty means not watched. */
    BigDecimal safetyStockQty,
    Integer leadTimeDays,
    /** Cost of one unit in the item's unit; omitted means not known. */
    BigDecimal unitCost,
    /** Optional; omitted leaves every detail empty. */
    @Valid ItemDetails details,
    /** What the item is bought in, e.g. "bag"; omitted: bought in its stock unit. */
    String purchaseUnit,
    /** Stock units in one purchase unit, more than 0; defaults to 1. */
    BigDecimal purchaseUnitQty
) {
}
