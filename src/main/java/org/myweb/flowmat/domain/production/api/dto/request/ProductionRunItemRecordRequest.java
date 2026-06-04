package org.myweb.flowmat.domain.production.api.dto.request;

import java.math.BigDecimal;

public record ProductionRunItemRecordRequest(String itemId, BigDecimal actualQty, String unit) {
}
