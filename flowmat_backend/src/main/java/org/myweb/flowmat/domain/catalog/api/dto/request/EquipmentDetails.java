package org.myweb.flowmat.domain.catalog.api.dto.request;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import org.myweb.flowmat.global.util.StrictBooleanDeserializer;

/**
 * What a piece of equipment is and where it stands (docs/domain/equipment.md). Sent whole: every field replaces the stored
 * one, so null or blank clears it. Numbers are 0 or more with up to four decimals, as the columns hold.
 */
public record EquipmentDetails(
    @Size(max = 100, message = "manufacturer takes at most 100 characters.") String manufacturer,
    @Size(max = 100, message = "modelName takes at most 100 characters.") String modelName,
    @Size(max = 100, message = "serialNo takes at most 100 characters.") String serialNo,
    /** Output per hour, in whatever unit the project counts this equipment's work in. */
    @DecimalMin(value = "0.0", message = "capacityPerHour must not be negative.")
    @Digits(integer = 10, fraction = 4, message = "capacityPerHour takes at most 10 whole digits and 4 decimals.") BigDecimal capacityPerHour,
    /** Electricity drawn per hour of running. */
    @DecimalMin(value = "0.0", message = "powerKwh must not be negative.")
    @Digits(integer = 6, fraction = 4, message = "powerKwh takes at most 6 whole digits and 4 decimals.") BigDecimal powerKwh,
    /** Water used per hour of running. */
    @DecimalMin(value = "0.0", message = "waterLiter must not be negative.")
    @Digits(integer = 10, fraction = 4, message = "waterLiter takes at most 10 whole digits and 4 decimals.") BigDecimal waterLiter,
    @Size(max = 100, message = "location takes at most 100 characters.") String location,
    /** The share of capacityPerHour it really reaches, above 0 to 100 with up to two decimals; null is 100 (E8). */
    @DecimalMin(value = "0", inclusive = false, message = "efficiencyPercent must be above 0 and at most 100.")
    @DecimalMax(value = "100", message = "efficiencyPercent must be above 0 and at most 100.")
    @Digits(integer = 3, fraction = 2, message = "efficiencyPercent takes at most 2 decimals.") BigDecimal efficiencyPercent,
    /** True when several work orders may run on it at once (E12); null or false is one at a time, as before V86. */
    @JsonDeserialize(using = StrictBooleanDeserializer.class) Boolean concurrentWorkOrders
) {

    /** The details without an efficiency or the side-by-side switch, as callers wrote them before V84. */
    public EquipmentDetails(String manufacturer, String modelName, String serialNo, BigDecimal capacityPerHour, BigDecimal powerKwh,
                            BigDecimal waterLiter, String location) {
        this(manufacturer, modelName, serialNo, capacityPerHour, powerKwh, waterLiter, location, null, null);
    }
}
