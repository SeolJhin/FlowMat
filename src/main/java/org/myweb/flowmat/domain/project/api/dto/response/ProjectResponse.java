package org.myweb.flowmat.domain.project.api.dto.response;

public record ProjectResponse(
    String projectId,
    String projectName,
    String projectDesc,
    String projectStatus,
    String visibility,
    String currentWorkflowId
) {
}
