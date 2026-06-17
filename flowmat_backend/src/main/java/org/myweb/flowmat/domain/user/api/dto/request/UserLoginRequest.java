package org.myweb.flowmat.domain.user.api.dto.request;

public record UserLoginRequest(String userIdOrEmail, String password) {
}
