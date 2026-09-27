package org.myweb.flowmat.domain.production.api.dto.request;

/** Confirms a step; {@code value} is required for steps that record one. */
public record RunInstructionCheckRequest(
    String value,
    String note
) {
}
