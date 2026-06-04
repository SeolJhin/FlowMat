package org.myweb.flowmat.domain.user.api.dto.response;

public record UserTokenResponse(String accessToken, String refreshToken) {
}
