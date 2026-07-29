package org.myweb.flowmat.domain.user.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.user.api.dto.request.FaceLoginRequest;
import org.myweb.flowmat.domain.user.api.dto.request.FaceRegisterRequest;
import org.myweb.flowmat.domain.user.api.dto.request.FaceSelectRequest;
import org.myweb.flowmat.domain.user.api.dto.response.FaceMatchResponse;
import org.myweb.flowmat.domain.user.api.dto.response.UserTokenResponse;
import org.myweb.flowmat.domain.user.application.AuthRedisStore;
import org.myweb.flowmat.domain.user.application.FaceAuthService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.response.ApiResponse;
import org.myweb.flowmat.global.security.AuthUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth/face")
public class FaceAuthController {

    private static final int FACE_MATCH_IP_LIMIT = 20;
    private static final int FACE_SELECT_IP_LIMIT = 12;
    private static final int FACE_LOGIN_IP_LIMIT = 12;
    private static final Duration FACE_RATE_WINDOW = Duration.ofMinutes(10);

    private final FaceAuthService faceAuthService;
    private final AuthRedisStore authRedisStore;

    @GetMapping("/count")
    public ApiResponse<Integer> count(@AuthenticationPrincipal AuthUser authUser) {
        if (authUser == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);
        return ApiResponse.ok(faceAuthService.getVectorCount(authUser.getUserId()));
    }

    @PostMapping("/register")
    public ApiResponse<Void> register(
        @AuthenticationPrincipal AuthUser authUser,
        @Valid @RequestBody FaceRegisterRequest request
    ) {
        if (authUser == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);
        faceAuthService.registerDescriptor(authUser.getUserId(), request.getDescriptor());
        return ApiResponse.ok(null);
    }

    @PostMapping("/match")
    public ApiResponse<FaceMatchResponse> match(HttpServletRequest httpRequest, @Valid @RequestBody FaceLoginRequest request) {
        enforceRateLimit("face-match-ip", clientIpKey(httpRequest), FACE_MATCH_IP_LIMIT, FACE_RATE_WINDOW);
        return ApiResponse.ok(faceAuthService.matchFace(request.getDescriptor()));
    }

    @PostMapping("/select")
    public ApiResponse<UserTokenResponse> select(HttpServletRequest request, @Valid @RequestBody FaceSelectRequest body) {
        enforceRateLimit("face-select-ip", clientIpKey(request), FACE_SELECT_IP_LIMIT, FACE_RATE_WINDOW);
        return ApiResponse.ok(faceAuthService.selectAccount(
            body.getMatchToken(),
            body.getUserId(),
            body.getDeviceId(),
            request.getHeader("User-Agent"),
            extractIp(request)
        ));
    }

    @PostMapping("/login")
    public ApiResponse<UserTokenResponse> login(HttpServletRequest request, @Valid @RequestBody FaceLoginRequest body) {
        enforceRateLimit("face-login-ip", clientIpKey(request), FACE_LOGIN_IP_LIMIT, FACE_RATE_WINDOW);
        return ApiResponse.ok(faceAuthService.loginByFace(
            body.getDescriptor(),
            body.getDeviceId(),
            request.getHeader("User-Agent"),
            extractIp(request)
        ));
    }

    @DeleteMapping
    public ApiResponse<Void> delete(@AuthenticationPrincipal AuthUser authUser) {
        if (authUser == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);
        faceAuthService.deleteDescriptor(authUser.getUserId());
        return ApiResponse.ok(null);
    }

    private String extractIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void enforceRateLimit(String category, String subject, int limit, Duration window) {
        if (!authRedisStore.tryAcquireRateLimit(category, subject, limit, window)) {
            throw new BusinessException(ErrorCode.RATE_LIMITED);
        }
    }

    private String clientIpKey(HttpServletRequest request) {
        return normalizeRateKey(extractIp(request));
    }

    private String normalizeRateKey(String raw) {
        String value = raw == null ? "unknown" : raw.trim().toLowerCase(Locale.ROOT);
        if (value.isBlank()) {
            return "unknown";
        }
        return value.replace('|', '_').replace(' ', '_');
    }
}
