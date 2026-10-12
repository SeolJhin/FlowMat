package org.myweb.flowmat.domain.production.api.dto.request;

/**
 * A step; required defaults to true, recordsValue to false. {@code valueLabel} names the value, such as "Oven °C";
 * {@code valueMin} and {@code valueMax} are its limits (R7), only for a step that records a value. {@code standardId}
 * names an inspection standard of the product whose limits the step follows (W13); its limits are then left out or the same.
 */
public record WorkInstructionStepRequest(
    String text,
    Boolean required,
    Boolean recordsValue,
    String valueLabel,
    java.math.BigDecimal valueMin,
    java.math.BigDecimal valueMax,
    String standardId
) {
}
