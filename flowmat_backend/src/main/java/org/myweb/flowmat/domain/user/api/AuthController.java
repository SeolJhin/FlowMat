package org.myweb.flowmat.domain.user.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.user.api.dto.request.UserLoginRequest;
import org.myweb.flowmat.domain.user.api.dto.request.UserSignupRequest;
import org.myweb.flowmat.domain.user.api.dto.response.UserTokenResponse;
import org.myweb.flowmat.domain.user.application.AuthService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.response.ApiResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ApiResponse<Void> signup(@RequestBody UserSignupRequest request) {
        authService.signup(request);
        return ApiResponse.ok(null);
    }

    @PostMapping("/login")
    public ApiResponse<UserTokenResponse> login(@RequestBody UserLoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ApiResponse<UserTokenResponse> refresh(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization
    ) {
        return ApiResponse.ok(authService.refresh(extractBearer(authorization)));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization
    ) {
        authService.logout(extractBearer(authorization));
        return ApiResponse.ok(null);
    }

    private String extractBearer(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Authorization header 가 필요합니다.");
        }
        return authorization.substring(7).trim();
    }
}
