package org.myweb.flowmat.domain.user.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.user.api.dto.response.UserResponse;
import org.myweb.flowmat.domain.user.application.UserService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.response.ApiResponse;
import org.myweb.flowmat.global.security.AuthUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ApiResponse<UserResponse> me(@AuthenticationPrincipal AuthUser authUser) {
        if (authUser == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return ApiResponse.ok(userService.me(authUser.getUserId()));
    }
}
