package org.myweb.flowmat.domain.bom.api.dto.response;

import java.math.BigDecimal;

public record BomLineResponse(String bomLineId, String childItemId, BigDecimal quantity, String unit) {
}
