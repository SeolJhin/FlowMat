package org.myweb.flowmat.domain.production.api.dto.response;

import java.math.BigDecimal;
import java.util.List;

/**
 * What a run's recorded inputs cost at today's unit costs (docs/domain/material-cost.md "실행 재료비"). Nothing is stored;
 * the numbers follow the recordings and the item costs as they are now.
 *
 * @param costPerUnit materialCost / outputQuantity; null until the run has an output quantity or when cost is incomplete.
 */
public record RunCostResponse(
    String productionRunId,
    BigDecimal materialCost,
    boolean costComplete,
    BigDecimal outputQuantity,
    BigDecimal costPerUnit,
    List<Line> lines
) {

    /** One input item, its recordings added up in the item's own unit. */
    public record Line(
        String itemId,
        String itemCode,
        String itemName,
        BigDecimal quantity,
        String unit,
        BigDecimal unitCost,
        BigDecimal cost
    ) {
    }
}
