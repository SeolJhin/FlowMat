package org.myweb.flowmat.domain.catalog.api.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

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
    @Size(max = 100, message = "location takes at most 100 characters.") String location
) {
}
