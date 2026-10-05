package org.myweb.flowmat.domain.catalog.application.publicapi;

import java.math.BigDecimal;

/**
 * What another bounded context may read about an item. {@code unitCode} is the code of {@code unitId} (null when the item
 * has no unit or the unit is gone); {@code unitCost} is the current unit cost as stored, null when unset;
 * {@code leadTimeDays} is how long an order takes to arrive, null when unknown; {@code itemStatus} is active, inactive or
 * discontinued (null on items saved before statuses, which count as active; see ItemStatusRule).
 */
public record CatalogItemView(
    String itemId,
    String projectId,
    String itemCode,
    String itemName,
    String unitId,
    String unitCode,
    BigDecimal unitCost,
    Integer leadTimeDays,
    String itemStatus
) {
}
