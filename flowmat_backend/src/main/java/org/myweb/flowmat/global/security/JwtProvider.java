package org.myweb.flowmat.global.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import javax.crypto.SecretKey;
import lombok.Getter;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

@Component
public class JwtProvider {

    private static final String CLAIM_TYP = "typ";
    private static final String CLAIM_ROLE = "role";
    private static final String TYP_ACCESS = "access";
    private static final String TYP_REFRESH = "refresh";
    private static final String TYP_OAUTH_SIGNUP = "oauth-signup";
    private static final String TYP_OAUTH_LINK = "oauth-link";

    private final SecretKey key;

    @Getter
    private final long accessExpiryMs;

    @Getter
    private final long refreshExpiryMs;

    public JwtProvider(
        @Value("${jwt.secret}") String secret,
        @Value("${jwt.access-token-expiry-seconds:3600}") long accessExpiry,
        @Value("${jwt.refresh-token-expiry-seconds:2592000}") long refreshExpiry
    ) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("jwt.secret is required.");
        }
        if (secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("jwt.secret must be at least 32 bytes for HS256.");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpiryMs = accessExpiry * 1000L;
        this.refreshExpiryMs = refreshExpiry * 1000L;
    }

    public String generateAccessToken(String userId) {
        return generateAccessToken(userId, "user");
    }

    public String generateAccessToken(String userId, String role) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
            .subject(userId)
            .claim(CLAIM_TYP, TYP_ACCESS)
            .claim(CLAIM_ROLE, normalizeRole(role))
            .issuedAt(new Date(now))
            .expiration(new Date(now + accessExpiryMs))
            .signWith(key, Jwts.SIG.HS256)
            .compact();
    }

    public String generateRefreshToken(String userId) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
            .subject(userId)
            .claim(CLAIM_TYP, TYP_REFRESH)
            .id(UUID.randomUUID().toString())
            .issuedAt(new Date(now))
            .expiration(new Date(now + refreshExpiryMs))
            .signWith(key, Jwts.SIG.HS256)
            .compact();
    }

    public String generateOauthSignupToken(String provider, String providerId, String email, String nickname) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
            .claim(CLAIM_TYP, TYP_OAUTH_SIGNUP)
            .claim("provider", provider)
            .claim("providerId", providerId)
            .claim("email", email)
            .claim("nickname", nickname)
            .issuedAt(new Date(now))
            .expiration(new Date(now + 10 * 60 * 1000L))
            .signWith(key, Jwts.SIG.HS256)
            .compact();
    }

    public Claims validateOauthSignupToken(String token) {
        Claims claims = parseClaimsOrThrow(token);
        if (!TYP_OAUTH_SIGNUP.equals(claims.get(CLAIM_TYP, String.class))) {
            throw new BusinessException(ErrorCode.TOKEN_TYPE_INVALID);
        }
        return claims;
    }

    public String generateOauthLinkToken(String userId, String provider) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
            .claim(CLAIM_TYP, TYP_OAUTH_LINK)
            .claim("userId", userId)
            .claim("provider", provider)
            .issuedAt(new Date(now))
            .expiration(new Date(now + 10 * 60 * 1000L))
            .signWith(key, Jwts.SIG.HS256)
            .compact();
    }

    public Claims validateOauthLinkToken(String token) {
        Claims claims = parseClaimsOrThrow(token);
        if (!TYP_OAUTH_LINK.equals(claims.get(CLAIM_TYP, String.class))) {
            throw new BusinessException(ErrorCode.TOKEN_TYPE_INVALID);
        }
        return claims;
    }

    public void validate(String token) {
        parseClaimsOrThrow(token);
    }

    public String resolveUserId(String token) {
        Claims claims = parseClaimsQuietly(token);
        return claims == null ? null : claims.getSubject();
    }

    public String resolveTokenType(String token) {
        Claims claims = parseClaimsQuietly(token);
        return claims == null ? null : claims.get(CLAIM_TYP, String.class);
    }

    public String resolveJti(String token) {
        Claims claims = parseClaimsQuietly(token);
        return claims == null ? null : claims.getId();
    }

    public String resolveRole(String token) {
        Claims claims = parseClaimsQuietly(token);
        return claims == null ? null : claims.get(CLAIM_ROLE, String.class);
    }

    public boolean isAccessToken(String token) {
        return TYP_ACCESS.equals(resolveTokenType(token));
    }

    public boolean isRefreshToken(String token) {
        return TYP_REFRESH.equals(resolveTokenType(token));
    }

    public Authentication getAuthentication(String token) {
        Claims claims = parseClaimsOrThrow(token);
        if (!TYP_ACCESS.equals(claims.get(CLAIM_TYP, String.class))) {
            throw new BusinessException(ErrorCode.TOKEN_TYPE_INVALID);
        }
        String userId = claims.getSubject();
        String role = normalizeRole(claims.get(CLAIM_ROLE, String.class));
        AuthUser authUser = new AuthUser(userId, role);
        return new UsernamePasswordAuthenticationToken(
            authUser,
            null,
            List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
        );
    }

    private Claims parseClaimsQuietly(String token) {
        try {
            return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    private Claims parseClaimsOrThrow(String token) {
        try {
            return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        } catch (ExpiredJwtException e) {
            throw new BusinessException(ErrorCode.TOKEN_EXPIRED);
        } catch (JwtException | IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "user";
        }
        return role.trim().toLowerCase();
    }
}
