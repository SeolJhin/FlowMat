package org.myweb.flowmat.domain.project.api.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ProjectCreateRequest(
    @NotBlank String projectName,
    @NotBlank String ownerId,
    String projectDesc,
    String visibility
) {
}
