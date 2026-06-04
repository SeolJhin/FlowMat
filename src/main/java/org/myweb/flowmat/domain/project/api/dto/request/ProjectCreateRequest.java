package org.myweb.flowmat.domain.project.api.dto.request;

public record ProjectCreateRequest(String projectName, String projectDesc, String visibility) {
}
