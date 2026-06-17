package org.myweb.flowmat.domain.project.api.dto.response;

public record ProjectInviteResponse(String inviteId, String invitedEmail, String projectRole, String inviteStatus) {
}
