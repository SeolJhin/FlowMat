package org.myweb.flowmat.domain.user.application;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.user.api.dto.request.UserLoginRequest;
import org.myweb.flowmat.domain.user.api.dto.request.UserSignupRequest;
import org.myweb.flowmat.domain.user.api.dto.response.UserTokenResponse;
import org.myweb.flowmat.domain.user.domain.entity.User;
import org.myweb.flowmat.domain.user.domain.enums.UserStatus;
import org.myweb.flowmat.domain.user.repository.UserRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.security.JwtProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthServiceImpl implements AuthService {

    private static final String RT_PREFIX = "rt:";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final StringRedisTemplate redisTemplate;

    @Value("${jwt.refresh-token-expiry-seconds:2592000}")
    private long refreshExpirySeconds;

    @Override
    public void signup(UserSignupRequest request) {
        validate(request);
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
        user.setUserPwd(passwordEncoder.encode(request.password()));
        user.setUserBirth(LocalDate.of(1990, 1, 1));
        user.setUserTel("000-0000-0000");
        user.setUserRole("user");
        user.setUserStatus(UserStatus.ACTIVE.name());
        user.setDeleteYn("N");
        user.setEmailVerifiedYn("N");
        user.setFailedLoginCount(0);
        user.setPwdUpdatedAt(OffsetDateTime.now());
        userRepository.save(user);
    }

    @Override
    public UserTokenResponse login(UserLoginRequest request) {
        validate(request);
        User user = userRepository
            .findByUserIdOrUserEmail(request.userIdOrEmail(), request.userIdOrEmail())
            .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다."));
        if (!passwordEncoder.matches(request.password(), user.getUserPwd())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다.");
        }
        if (UserStatus.WITHDRAWN.name().equals(user.getUserStatus())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "탈퇴한 회원입니다.");
        }
        if (UserStatus.LOCKED.name().equals(user.getUserStatus())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "잠긴 계정입니다.");
        }
        user.setLastLoginAt(OffsetDateTime.now());
        return issueTokens(user.getUserId());
    }

    @Override
    @Transactional(readOnly = true)
    public UserTokenResponse refresh(String refreshToken) {
        if (!jwtProvider.isRefreshToken(refreshToken)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "유효하지 않은 refresh token 입니다.");
        }
        String jti = jwtProvider.resolveJti(refreshToken);
        String userId = jwtProvider.resolveUserId(refreshToken);
        if (jti == null || userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "만료되거나 손상된 refresh token 입니다.");
        }
        String storedUserId = redisGet(RT_PREFIX + jti);
        if (!userId.equals(storedUserId)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "유효하지 않은 refresh token 입니다.");
        }
        redisDelete(RT_PREFIX + jti);
        return issueTokens(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public void logout(String refreshToken) {
        String jti = jwtProvider.resolveJti(refreshToken);
        if (jti != null) {
            redisDelete(RT_PREFIX + jti);
        }
    }

    private UserTokenResponse issueTokens(String userId) {
        String accessToken = jwtProvider.generateAccessToken(userId);
        String refreshToken = jwtProvider.generateRefreshToken(userId);
        String jti = jwtProvider.resolveJti(refreshToken);
        if (jti != null) {
            redisSet(RT_PREFIX + jti, userId, refreshExpirySeconds);
        }
        return new UserTokenResponse(accessToken, refreshToken);
    }

    private void redisSet(String key, String value, long ttlSeconds) {
        try {
            redisTemplate.opsForValue().set(key, value, ttlSeconds, TimeUnit.SECONDS);
        } catch (DataAccessException e) {
            throw new BusinessException(ErrorCode.SERVICE_UNAVAILABLE, "인증 서비스에 일시적 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
    }

    private String redisGet(String key) {
        try {
            return redisTemplate.opsForValue().get(key);
        } catch (DataAccessException e) {
            throw new BusinessException(ErrorCode.SERVICE_UNAVAILABLE, "인증 서비스에 일시적 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
    }

    private void redisDelete(String key) {
        try {
            redisTemplate.delete(key);
        } catch (DataAccessException e) {
            // 로그아웃은 Redis 실패해도 조용히 처리
        }
    }

    private void validate(UserSignupRequest r) {
        if (r == null) throw new BusinessException(ErrorCode.BAD_REQUEST, "회원가입 요청 정보가 없습니다.");
        if (blank(r.userId())) throw new BusinessException(ErrorCode.BAD_REQUEST, "로그인 아이디는 필수입니다.");
        if (blank(r.userName())) throw new BusinessException(ErrorCode.BAD_REQUEST, "회원 이름은 필수입니다.");
        if (blank(r.userEmail())) throw new BusinessException(ErrorCode.BAD_REQUEST, "이메일은 필수입니다.");
        if (blank(r.password())) throw new BusinessException(ErrorCode.BAD_REQUEST, "비밀번호는 필수입니다.");
    }

    private void validate(UserLoginRequest r) {
        if (r == null) throw new BusinessException(ErrorCode.BAD_REQUEST, "로그인 요청 정보가 없습니다.");
        if (blank(r.userIdOrEmail())) throw new BusinessException(ErrorCode.BAD_REQUEST, "아이디 또는 이메일은 필수입니다.");
        if (blank(r.password())) throw new BusinessException(ErrorCode.BAD_REQUEST, "비밀번호는 필수입니다.");
    }

    private boolean blank(String v) {
        return v == null || v.trim().isEmpty();
    }
}
