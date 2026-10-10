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
    boolean costComplete,
    /** By-products and waste the batch gives off (docs/domain/bom-by-products.md); not in {@link #lines}. */
    List<Output> outputs
) {

    /** A by-product or waste line scaled like a material: in the line's unit and in the item's own unit (4 decimals). */
    public record Output(
        String bomLineId,
        String itemId,
        String lineType,
        BigDecimal lineQuantity,
        String lineUnit,
        BigDecimal quantity,
        String itemUnit,
        BigDecimal itemQuantity
    ) {
    }

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
        BigDecimal lineCost,
        /** The phantom sub-assembly this material comes through; null for the BOM's own lines (multi-level-bom.md P2). */
        String viaItemId
    ) {

        public Line(String bomLineId, String childItemId, BigDecimal lineQuantity, String lineUnit, BigDecimal requiredQuantity,
                    String itemUnit, BigDecimal requiredItemQuantity, BigDecimal conversionRate, BigDecimal unitCost,
                    BigDecimal lineCost) {
            this(bomLineId, childItemId, lineQuantity, lineUnit, requiredQuantity, itemUnit, requiredItemQuantity, conversionRate,
                unitCost, lineCost, null);
        }
    }
}
