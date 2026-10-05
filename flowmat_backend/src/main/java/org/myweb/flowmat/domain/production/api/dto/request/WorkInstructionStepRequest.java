package org.myweb.flowmat.domain.production.api.dto.request;

/**
 * A step; required defaults to true, recordsValue to false. {@code valueLabel} names the value, such as "Oven °C";
 * {@code valueMin} and {@code valueMax} are its limits (R7), only for a step that records a value.
 */
public record WorkInstructionStepRequest(
    String text,
    Boolean required,
    Boolean recordsValue,
    String valueLabel,
    java.math.BigDecimal valueMin,
    java.math.BigDecimal valueMax
) {
}
