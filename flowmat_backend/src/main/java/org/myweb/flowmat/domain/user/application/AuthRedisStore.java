package org.myweb.flowmat.domain.user.application;

import java.time.Duration;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuthRedisStore {

    private static final String RT_PREFIX = "auth:rt:";
    private static final String RT_USER_PREFIX = "auth:rt:user:";
    private static final String EMAIL_CODE_PREFIX = "auth:email:code:";
    private static final String EMAIL_COOLDOWN_PREFIX = "auth:email:cooldown:";
    private static final String EMAIL_VERIFIED_PREFIX = "auth:email:verified:";
    private static final String PWD_RESET_PREFIX = "auth:pwdreset:";
    private static final String LOGIN_FAIL_PREFIX = "auth:loginfail:";
    private static final String LOGIN_LOCK_PREFIX = "auth:loginlock:";

    private final StringRedisTemplate redisTemplate;

    public void storeRefreshToken(String jti, String userId, String deviceId, Duration ttl) {
        execute(() -> {
            redisTemplate.opsForValue().set(rtKey(jti), userId + "|" + blankToEmpty(deviceId), ttl);
            redisTemplate.opsForSet().add(rtUserKey(userId), jti);
            redisTemplate.expire(rtUserKey(userId), ttl);
            return null;
        });
    }

    public RefreshTokenEntry getRefreshToken(String jti) {
        return execute(() -> {
            String payload = redisTemplate.opsForValue().get(rtKey(jti));
            if (payload == null || payload.isBlank()) {
                return null;
            }
            String[] parts = payload.split("\\|", 2);
            return new RefreshTokenEntry(parts[0], parts.length > 1 && !parts[1].isBlank() ? parts[1] : null);
        });
    }

    public void revokeRefreshToken(String jti, String userId) {
        executeQuietly(() -> {
            redisTemplate.delete(rtKey(jti));
            if (userId != null && !userId.isBlank()) {
                redisTemplate.opsForSet().remove(rtUserKey(userId), jti);
            }
            return null;
        });
    }

    public void revokeAllRefreshTokens(String userId) {
        executeQuietly(() -> {
            Set<String> jtis = redisTemplate.opsForSet().members(rtUserKey(userId));
            if (jtis != null) {
                for (String jti : jtis) {
                    redisTemplate.delete(rtKey(jti));
                }
            }
            redisTemplate.delete(rtUserKey(userId));
            return null;
        });
    }

    public void saveEmailCode(String email, String code, Duration codeTtl, Duration cooldownTtl) {
        execute(() -> {
            if (Boolean.TRUE.equals(redisTemplate.hasKey(emailCooldownKey(email)))) {
                throw new IllegalStateException("cooldown");
            }
            redisTemplate.opsForValue().set(emailCodeKey(email), code, codeTtl);
            redisTemplate.opsForValue().set(emailCooldownKey(email), "1", cooldownTtl);
            return null;
        });
    }

    public boolean verifyEmailCode(String email, String code, Duration verifiedTtl) {
        return execute(() -> {
            String saved = redisTemplate.opsForValue().get(emailCodeKey(email));
            if (saved == null || !saved.equals(code)) {
                return false;
            }
            redisTemplate.delete(emailCodeKey(email));
            redisTemplate.opsForValue().set(emailVerifiedKey(email), "Y", verifiedTtl);
            return true;
        });
    }

    public boolean isEmailVerified(String email) {
        return Boolean.TRUE.equals(execute(() -> redisTemplate.hasKey(emailVerifiedKey(email))));
    }

    public void clearEmailState(String email) {
        executeQuietly(() -> {
            redisTemplate.delete(emailCodeKey(email));
            redisTemplate.delete(emailVerifiedKey(email));
            return null;
        });
    }

    public String createPasswordResetToken(String userId, Duration ttl) {
        return execute(() -> {
            String token = UUID.randomUUID().toString().replace("-", "");
            redisTemplate.opsForValue().set(passwordResetKey(token), userId, ttl);
            return token;
        });
    }

    public String getPasswordResetUserId(String token) {
        return execute(() -> redisTemplate.opsForValue().get(passwordResetKey(token)));
    }

    public void consumePasswordResetToken(String token) {
        executeQuietly(() -> {
            redisTemplate.delete(passwordResetKey(token));
            return null;
        });
    }

    public boolean isLoginLocked(String userId) {
        return Boolean.TRUE.equals(execute(() -> redisTemplate.hasKey(loginLockKey(userId))));
    }

    public boolean recordLoginFailure(String userId, int threshold, Duration window, Duration lockTtl) {
        return execute(() -> {
            Long count = redisTemplate.opsForValue().increment(loginFailKey(userId));
            if (count != null && count == 1L) {
                redisTemplate.expire(loginFailKey(userId), window);
            }
            if (count != null && count >= threshold) {
                redisTemplate.opsForValue().set(loginLockKey(userId), "1", lockTtl);
                redisTemplate.delete(loginFailKey(userId));
                return true;
            }
            return false;
        });
    }

    public void clearLoginFailures(String userId) {
        executeQuietly(() -> {
            redisTemplate.delete(loginFailKey(userId));
            redisTemplate.delete(loginLockKey(userId));
            return null;
        });
    }

    public String generateVerificationCode() {
        int value = java.util.concurrent.ThreadLocalRandom.current().nextInt(1_000_000);
        return "%06d".formatted(value);
    }

    private <T> T execute(RedisCallback<T> callback) {
        try {
            return callback.run();
        } catch (IllegalStateException e) {
            throw e;
        } catch (DataAccessException e) {
            throw new BusinessException(ErrorCode.SERVICE_UNAVAILABLE);
        }
    }

    private void executeQuietly(RedisCallback<Void> callback) {
        try {
            callback.run();
        } catch (DataAccessException ignored) {
        }
    }

    private String rtKey(String jti) { return RT_PREFIX + jti; }
    private String rtUserKey(String userId) { return RT_USER_PREFIX + userId; }
    private String emailCodeKey(String email) { return EMAIL_CODE_PREFIX + email; }
    private String emailCooldownKey(String email) { return EMAIL_COOLDOWN_PREFIX + email; }
    private String emailVerifiedKey(String email) { return EMAIL_VERIFIED_PREFIX + email; }
    private String passwordResetKey(String token) { return PWD_RESET_PREFIX + token; }
    private String loginFailKey(String userId) { return LOGIN_FAIL_PREFIX + userId; }
    private String loginLockKey(String userId) { return LOGIN_LOCK_PREFIX + userId; }

    private String blankToEmpty(String value) {
        return value == null ? "" : value;
    }

    public record RefreshTokenEntry(String userId, String deviceId) {
    }

    @FunctionalInterface
    private interface RedisCallback<T> {
        T run();
    }
}
