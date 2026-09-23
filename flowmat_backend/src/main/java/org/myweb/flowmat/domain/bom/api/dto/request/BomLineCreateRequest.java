package org.myweb.flowmat.domain.bom.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * One material line; draft revisions only. scrapRate / optionalYn / substituteGroup are stored but a revision that
 * uses them cannot be approved in v1.
 */
public record BomLineCreateRequest(
    @NotBlank String childItemId,
    @NotNull BigDecimal quantity,
    @NotBlank String unit,
    BigDecimal scrapRate,
    String optionalYn,
    String substituteGroup,
    Integer sortOrder,
    String note
) {
}
