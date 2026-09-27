package org.myweb.flowmat.domain.inventory.api.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record WarehouseTaskResponse(
    String taskId,
    String projectId,
    String taskNo,
    String taskType,
    String status,
    String inventoryId,
    String itemId,
    String itemCode,
    String itemName,
    String lotId,
    String lotNo,
    BigDecimal quantity,
    String fromLocation,
    String toLocation,
    String workOrderId,
    String workOrderNumber,
    String note,
    String createdBy,
    OffsetDateTime createdAt,
    String finishedBy,
    OffsetDateTime finishedAt,
    String transferId,
    String cancelReason
) {
}
