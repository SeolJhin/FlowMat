package org.myweb.flowmat.domain.user.application;

import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.user.api.dto.request.UserLoginRequest;
import org.myweb.flowmat.domain.user.api.dto.request.UserSignupRequest;
import org.myweb.flowmat.domain.user.api.dto.response.UserTokenResponse;
import org.myweb.flowmat.domain.user.domain.entity.User;
import org.myweb.flowmat.domain.user.domain.enums.UserStatus;
import org.myweb.flowmat.domain.user.repository.UserRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;

    @Override
    public void signup(UserSignupRequest request) {
        validateSignupRequest(request);

        if (userRepository.existsByUserId(request.userId())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "이미 사용 중인 로그인 아이디입니다.");
        }

        if (userRepository.existsByUserEmail(request.userEmail())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "이미 사용 중인 이메일입니다.");
        }

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUserId(request.userId());
        user.setUserName(request.userName());
        user.setUserEmail(request.userEmail());
        user.setUserPwd(request.password());

        user.setUserStatus(UserStatus.ACTIVE.name());
        user.setDeleteYn("N");
        user.setEmailVerifiedYn("N");
        user.setFailedLoginCount(0);
        user.setPwdUpdatedAt(OffsetDateTime.now());

        userRepository.save(user);
    }

    @Override
    public UserTokenResponse login(UserLoginRequest request) {
        validateLoginRequest(request);

        User user = userRepository
            .findByUserIdOrUserEmail(request.userIdOrEmail(), request.userIdOrEmail())
            .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다."));

        if (!request.password().equals(user.getUserPwd())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다.");
        }

        if (UserStatus.WITHDRAWN.name().equals(user.getUserStatus())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "탈퇴한 회원입니다.");
        }

        if (UserStatus.LOCKED.name().equals(user.getUserStatus())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "잠긴 계정입니다.");
        }

        user.setLastLoginAt(OffsetDateTime.now());

        /*
         * MVP 임시 토큰 정책
         * - accessToken에는 user PK(UUID)를 문자열로 담는다.
         * - UserController /users/me에서 Bearer 토큰을 UUID로 파싱해서 사용자 조회한다.
         * - 추후 JWT/Redis RefreshToken 구현 시 교체 예정.
         */
        String accessToken = user.getId().toString();
        String refreshToken = "dummy-refresh-token";

        return new UserTokenResponse(accessToken, refreshToken);
    }

    private void validateSignupRequest(UserSignupRequest request) {
        if (request == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "회원가입 요청 정보가 없습니다.");
        }

        if (isBlank(request.userId())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "로그인 아이디는 필수입니다.");
        }

        if (isBlank(request.userName())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "회원 이름은 필수입니다.");
        }

        if (isBlank(request.userEmail())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "이메일은 필수입니다.");
        }

        if (isBlank(request.password())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "비밀번호는 필수입니다.");
        }
    }

    private void validateLoginRequest(UserLoginRequest request) {
        if (request == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "로그인 요청 정보가 없습니다.");
        }

        if (isBlank(request.userIdOrEmail())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "아이디 또는 이메일은 필수입니다.");
        }

        if (isBlank(request.password())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "비밀번호는 필수입니다.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}