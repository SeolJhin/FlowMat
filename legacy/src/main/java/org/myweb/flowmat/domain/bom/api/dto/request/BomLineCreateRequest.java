package org.myweb.flowmat.domain.bom.api.dto.request;

import java.math.BigDecimal;

public record BomLineCreateRequest(String childItemId, BigDecimal quantity, String unit) {
}
