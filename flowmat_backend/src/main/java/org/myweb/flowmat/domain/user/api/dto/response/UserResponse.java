package org.myweb.flowmat.domain.user.api.dto.response;

import java.util.UUID;

public record UserResponse(UUID id, String userId, String userName, String userEmail, String userStatus) {
}
