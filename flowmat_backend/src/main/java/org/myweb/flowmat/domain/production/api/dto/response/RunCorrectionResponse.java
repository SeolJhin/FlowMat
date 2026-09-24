package org.myweb.flowmat.domain.production.api.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record RunCorrectionResponse(
    String productionRunCorrectionId,
    String productionRunId,
    int correctionNo,
    /** pending_approval, applied or rejected. */
    String status,
    String reason,
    String requestedBy,
    OffsetDateTime requestedAt,
    String decidedBy,
    OffsetDateTime decidedAt,
    String decisionNote,
    OffsetDateTime appliedAt,
    List<Line> lines
) {

    public record Line(
        int lineNo,
        /** void_item, add_item or set_output_qty. */
        String kind,
        String targetRunItemId,
        String direction,
        String itemId,
        String inventoryId,
        BigDecimal qty,
        String unit,
        BigDecimal beforeQty,
        BigDecimal afterQty,
        String createdRunItemId
    ) {
    }
}
