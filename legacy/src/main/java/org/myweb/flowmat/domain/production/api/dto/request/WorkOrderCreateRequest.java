package org.myweb.flowmat.domain.production.api.dto.request;

import java.math.BigDecimal;

public record WorkOrderCreateRequest(String projectId, String bomId, String targetItemId, BigDecimal targetQuantity) {
}
