package org.myweb.flowmat.domain.production.api.dto.response;

import java.math.BigDecimal;
import java.util.List;

/**
 * What the project's open work orders still need, material by material, against the stock that can be used
 * (docs/domain/material-requirements.md). Nothing is reserved by asking.
 *
 * @param orders open work orders counted: approved or in progress, with a BOM and quantity still to make
 * @param lines materials, the biggest shortfall first
 * @param problems work orders whose BOM could not be worked out, with the reason; they are left out of the lines
 */
public record MaterialRequirementResponse(int orders, List<Line> lines, List<String> problems) {

    /**
     * Quantities are in the material's own unit.
     *
     * @param usable available (on hand − reserved) outside quarantine and closed or expired LOTs
     * @param shortage required − usable, never below zero
     */
    public record Line(
        String itemId,
        String itemCode,
        String itemName,
        String unit,
        BigDecimal required,
        BigDecimal usable,
        BigDecimal shortage,
        List<Need> orders
    ) {
    }

    /** One work order's share of a material. */
    public record Need(String workOrderId, String workOrderTitle, BigDecimal required) {
    }
}
