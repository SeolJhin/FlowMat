package org.myweb.flowmat.domain.bom.api.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record BomResponse(
    String bomId,
    String projectId,
    String targetItemId,
    String bomName,
    Integer bomVersion,
    BigDecimal baseQuantity,
    String baseUnit,
    String bomStatus,
    String approvedBy,
    OffsetDateTime approvedAt,
    String note,
    List<BomLineResponse> lines
) {
}
