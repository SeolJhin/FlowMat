package org.myweb.flowmat.domain.flowrun.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FlowRunStepFailRequest(
    @NotBlank @Size(max = 100) String errorCode,
    @Size(max = 4000) String errorMessage
) {
}
