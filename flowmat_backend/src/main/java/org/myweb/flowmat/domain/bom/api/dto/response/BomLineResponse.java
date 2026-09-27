package org.myweb.flowmat.domain.bom.api.dto.response;

import java.math.BigDecimal;

public record BomLineResponse(
    String bomLineId,
    String childItemId,
    BigDecimal quantity,
    String unit,
    BigDecimal scrapRate,
    String optionalYn,
    String substituteGroup,
    Integer sortOrder,
    String note,
    /** material, by_product or waste (docs/domain/bom-by-products.md). */
    String lineType
) {
}
