package org.myweb.flowmat.domain.production.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

/**
 * One change in a correction.
 * <ul>
 *   <li>{@code void_item}: {@code targetRunItemId}</li>
 *   <li>{@code add_item}: {@code direction}, {@code itemId}, {@code inventoryId} (required for LOT-tracked items), {@code qty}, {@code unit}</li>
 *   <li>{@code set_output_qty}: {@code afterQty}</li>
 *   <li>{@code cancel_setup} / {@code cancel_running_time}: {@code targetRunSetupId} / {@code targetRunEquipmentTimeId}</li>
 *   <li>{@code add_setup} / {@code add_running_time}: {@code equipmentId} and {@code setupMinutes} / {@code runningMinutes}</li>
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
    Integer setupMinutes,
    /** cancel_running_time: the running time to cancel (docs/domain/equipment-setup-cost.md ER10). */
    String targetRunEquipmentTimeId,
    /** add_running_time: whole minutes on {@code equipmentId} (the work order's equipment when blank). */
    Integer runningMinutes
) {
}
