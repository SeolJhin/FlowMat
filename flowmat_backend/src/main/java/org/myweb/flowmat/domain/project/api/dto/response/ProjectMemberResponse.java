package org.myweb.flowmat.domain.project.api.dto.response;

public record ProjectMemberResponse(String projectMemberId, String userId, String projectRole, String memberStatus) {
}
