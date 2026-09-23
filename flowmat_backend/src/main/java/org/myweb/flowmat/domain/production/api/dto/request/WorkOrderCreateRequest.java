package org.myweb.flowmat.domain.production.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Creates a work order in {@code draft}; approval is a separate owner action. */
public record WorkOrderCreateRequest(
    @NotBlank String projectId,
    @NotBlank String workOrderTitle,
    String workflowId,
    String bomId,
    String targetItemId,
    BigDecimal targetQuantity,
    String priority,
    OffsetDateTime plannedStartAt,
    OffsetDateTime plannedEndAt,
    String instruction,
    String assignedTo
) {
}
