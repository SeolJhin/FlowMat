package org.myweb.flowmat.domain.user.api.dto.request;

public record UserSignupRequest(String userId, String userName, String userEmail, String password) {
}
