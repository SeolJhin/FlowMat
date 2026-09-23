package org.myweb.flowmat.domain.catalog.api.dto.request;

public record ItemUpdateRequest(
    String itemName,
    String itemType,
    String resourceCategory,
    String resourceType,
    String unitId,
    String itemStatus,
    /** "Y": stock, receipts and production of this item must name a LOT. Defaults to "N". */
    String lotManageYn
) {
}
