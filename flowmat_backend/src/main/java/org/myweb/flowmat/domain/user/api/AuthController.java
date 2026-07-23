package org.myweb.flowmat.domain.user.api;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.user.api.dto.request.EmailCodeRequest;
import org.myweb.flowmat.domain.user.api.dto.request.EmailCodeVerifyRequest;
import org.myweb.flowmat.domain.user.api.dto.request.FindEmailRequest;
import org.myweb.flowmat.domain.user.api.dto.request.LogoutRequest;
import org.myweb.flowmat.domain.user.api.dto.request.OAuthSignupCompleteRequest;
import org.myweb.flowmat.domain.user.api.dto.request.PasswordResetConfirmRequest;
import org.myweb.flowmat.domain.user.api.dto.request.PasswordResetRequest;
import org.myweb.flowmat.domain.user.api.dto.request.RefreshTokenRequest;
import org.myweb.flowmat.domain.user.api.dto.request.SocialLinkStartRequest;
import org.myweb.flowmat.domain.user.api.dto.request.UserLoginRequest;
import org.myweb.flowmat.domain.user.api.dto.request.UserSignupRequest;
import org.myweb.flowmat.domain.user.api.dto.response.SocialLinkStartResponse;
import org.myweb.flowmat.domain.user.api.dto.response.UserTokenResponse;
import org.myweb.flowmat.domain.user.application.AuthService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.response.ApiResponse;
import org.myweb.flowmat.global.security.AuthUser;
import org.springframework.http.ResponseCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthController {

    private static final String GUEST_SID_COOKIE_NAME = "guest_sid";
    private static final int GUEST_SID_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
    private static final Pattern GUEST_SID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{16,128}$");

    private final AuthService authService;

    @PostMapping("/email/send-code")
    public ApiResponse<Void> sendEmailCode(@Valid @RequestBody EmailCodeRequest request) {
        authService.sendEmailCode(request.userEmail());
        return ApiResponse.ok(null);
    }

    @PostMapping("/email/verify-code")
    public ApiResponse<Void> verifyEmailCode(@Valid @RequestBody EmailCodeVerifyRequest request) {
        authService.verifyEmailCode(request.userEmail(), request.code());
        return ApiResponse.ok(null);
    }

    @PostMapping("/signup")
    public ApiResponse<Void> signup(@Valid @RequestBody UserSignupRequest request) {
        authService.signup(request);
        return ApiResponse.ok(null);
    }

    @GetMapping("/check-nickname")
    public ApiResponse<Boolean> checkNickname(@RequestParam("nickname") String nickname) {
        return ApiResponse.ok(authService.checkNicknameAvailable(nickname));
    }

    @PostMapping("/login")
    public ApiResponse<UserTokenResponse> login(HttpServletRequest httpRequest, @Valid @RequestBody UserLoginRequest request) {
        return ApiResponse.ok(authService.login(request, httpRequest.getHeader("User-Agent"), extractIp(httpRequest)));
    }

    @PostMapping("/guest-token")
    public ApiResponse<UserTokenResponse> guestToken(HttpServletRequest request, HttpServletResponse response) {
        String guestSid = resolveOrCreateGuestSid(request);
        setGuestSidCookie(response, guestSid, isSecureRequest(request));
        return ApiResponse.ok(authService.issueGuestToken(guestSid, extractBearer(request.getHeader(HttpHeaders.AUTHORIZATION))));
    }

    @PostMapping("/refresh")
    public ApiResponse<UserTokenResponse> refresh(
        HttpServletRequest httpRequest,
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
        @RequestBody(required = false) RefreshTokenRequest request
    ) {
        return ApiResponse.ok(authService.refresh(request, extractBearer(authorization), httpRequest.getHeader("User-Agent"), extractIp(httpRequest)));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
        @RequestBody(required = false) LogoutRequest request
    ) {
        String refreshToken = request != null && request.refreshToken() != null ? request.refreshToken() : extractBearer(authorization);
        authService.logout(refreshToken);
        return ApiResponse.ok(null);
    }

    @PostMapping("/logout-all")
    public ApiResponse<Void> logoutAll(@AuthenticationPrincipal AuthUser authUser) {
        requireAuth(authUser);
        authService.logoutAll(authUser.getUserId());
        return ApiResponse.ok(null);
    }

    @PostMapping("/oauth2/kakao/complete")
    public ApiResponse<UserTokenResponse> completeKakaoSignup(
        HttpServletRequest httpRequest,
        @Valid @RequestBody OAuthSignupCompleteRequest request
    ) {
        return ApiResponse.ok(authService.completeKakaoSignup(request, httpRequest.getHeader("User-Agent"), extractIp(httpRequest)));
    }

    @PostMapping("/oauth2/google/complete")
    public ApiResponse<UserTokenResponse> completeGoogleSignup(
        HttpServletRequest httpRequest,
        @Valid @RequestBody OAuthSignupCompleteRequest request
    ) {
        return ApiResponse.ok(authService.completeGoogleSignup(request, httpRequest.getHeader("User-Agent"), extractIp(httpRequest)));
    }

    @PostMapping("/oauth2/link/start")
    public ApiResponse<SocialLinkStartResponse> startSocialLink(
        @AuthenticationPrincipal AuthUser authUser,
        @Valid @RequestBody SocialLinkStartRequest request
    ) {
        requireAuth(authUser);
        return ApiResponse.ok(authService.startSocialLink(authUser.getUserId(), request));
    }

    @PostMapping("/find-email")
    public ApiResponse<String> findEmail(@Valid @RequestBody FindEmailRequest request) {
        return ApiResponse.ok(authService.findEmail(request));
    }

    @PostMapping("/reset-password/request")
    public ApiResponse<Void> requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        authService.requestPasswordReset(request);
        return ApiResponse.ok(null);
    }

    @GetMapping("/reset-password/verify")
    public ApiResponse<Void> verifyPasswordResetToken(@RequestParam("token") String token) {
        authService.verifyPasswordResetToken(token);
        return ApiResponse.ok(null);
    }

    @PostMapping("/reset-password/confirm")
    public ApiResponse<Void> confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest request) {
        authService.confirmPasswordReset(request);
        return ApiResponse.ok(null);
    }

    private void requireAuth(AuthUser authUser) {
        if (authUser == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
    }

    private String extractBearer(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        return authorization.substring(7).trim();
    }

    private String extractIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String resolveOrCreateGuestSid(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (GUEST_SID_COOKIE_NAME.equals(cookie.getName())
                    && cookie.getValue() != null
                    && GUEST_SID_PATTERN.matcher(cookie.getValue().trim()).matches()) {
                    return cookie.getValue().trim();
                }
            }
        }
        return UUID.randomUUID().toString().replace("-", "");
    }

    private void setGuestSidCookie(HttpServletResponse response, String guestSid, boolean secure) {
        ResponseCookie cookie = ResponseCookie.from(GUEST_SID_COOKIE_NAME, guestSid)
            .httpOnly(true)
            .secure(secure)
            .path("/")
            .sameSite("Lax")
            .maxAge(GUEST_SID_MAX_AGE_SECONDS)
            .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private boolean isSecureRequest(HttpServletRequest request) {
        if (request.isSecure()) {
            return true;
        }
        String forwardedProto = request.getHeader("X-Forwarded-Proto");
        return forwardedProto != null && "https".equalsIgnoreCase(forwardedProto.trim());
    }
}
