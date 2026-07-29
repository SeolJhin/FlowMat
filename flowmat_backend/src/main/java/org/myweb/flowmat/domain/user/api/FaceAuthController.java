package org.myweb.flowmat.domain.user.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.user.api.dto.request.FaceLoginRequest;
import org.myweb.flowmat.domain.user.api.dto.request.FaceRegisterRequest;
import org.myweb.flowmat.domain.user.api.dto.request.FaceSelectRequest;
import org.myweb.flowmat.domain.user.api.dto.response.FaceMatchResponse;
import org.myweb.flowmat.domain.user.api.dto.response.UserTokenResponse;
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

    private final FaceAuthService faceAuthService;

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
    public ApiResponse<FaceMatchResponse> match(@Valid @RequestBody FaceLoginRequest request) {
        return ApiResponse.ok(faceAuthService.matchFace(request.getDescriptor()));
    }

    @PostMapping("/select")
    public ApiResponse<UserTokenResponse> select(HttpServletRequest request, @Valid @RequestBody FaceSelectRequest body) {
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
}
