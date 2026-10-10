package org.myweb.flowmat.domain.production.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

/**
 * One change in a correction.
 * <ul>
 *   <li>{@code void_item}: {@code targetRunItemId}</li>
 *   <li>{@code add_item}: {@code direction}, {@code itemId}, {@code inventoryId} (required for LOT-tracked items), {@code qty}, {@code unit}</li>
 *   <li>{@code set_output_qty}: {@code afterQty}</li>
 * </ul>
 */
public record RunCorrectionLineRequest(
    @NotBlank String kind,
    String targetRunItemId,
    String direction,
    String itemId,
    String inventoryId,
    BigDecimal qty,
    String unit,
    BigDecimal afterQty,
    /** cancel_setup: the setup to cancel (docs/domain/equipment-setup-cost.md AS7). */
    String targetRunSetupId,
    /** add_setup: the equipment and whole minutes of the setup to add. */
    String equipmentId,
    Integer setupMinutes
) {
}
