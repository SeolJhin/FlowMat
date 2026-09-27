package org.myweb.flowmat.domain.production.api.dto.request;

/** A step; required defaults to true, recordsValue to false. {@code valueLabel} names the value, such as "Oven °C". */
public record WorkInstructionStepRequest(
    String text,
    Boolean required,
    Boolean recordsValue,
    String valueLabel
) {
}
