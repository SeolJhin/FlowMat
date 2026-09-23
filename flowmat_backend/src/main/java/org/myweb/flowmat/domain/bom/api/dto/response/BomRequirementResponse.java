package org.myweb.flowmat.domain.bom.api.dto.response;

import java.math.BigDecimal;
import java.util.List;

/**
 * Material needed for a production quantity: productionQuantity / baseQuantity × line quantity, then converted to
 * each material item's unit (docs/domain/inventory-bom-lot-contract.md §5).
 */
public record BomRequirementResponse(
    String bomId,
    Integer bomVersion,
    String targetItemId,
    BigDecimal productionQuantity,
    /** Base quantity expressed in the target item's unit. */
    BigDecimal baseQuantity,
    List<Line> lines
) {

    public record Line(
        String bomLineId,
        String childItemId,
        BigDecimal lineQuantity,
        String lineUnit,
        /** In the line's unit. */
        BigDecimal requiredQuantity,
        /** The material item's stock unit (the line unit when the item has none). */
        String itemUnit,
        /** In {@link #itemUnit}, 4 decimals. */
        BigDecimal requiredItemQuantity,
        /** Factor from lineUnit to itemUnit. */
        BigDecimal conversionRate
    ) {
    }
}
