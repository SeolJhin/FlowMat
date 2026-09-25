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
    List<Line> lines,
    /** Sum of the lines' costs, 4 decimals (docs/domain/material-cost.md). */
    BigDecimal materialCost,
    /** False when some material has no unit cost, so {@link #materialCost} leaves it out. */
    boolean costComplete
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
        BigDecimal conversionRate,
        /** The material's cost per {@link #itemUnit}; null when not known. */
        BigDecimal unitCost,
        /** requiredItemQuantity × unitCost, 4 decimals; null when the unit cost is not known. */
        BigDecimal lineCost
    ) {
    }
}
