package org.myweb.flowmat.global.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtProvider {

    private static final String CLAIM_TYP = "typ";
    private static final String TYP_ACCESS = "access";
    private static final String TYP_REFRESH = "refresh";

    private final SecretKey key;
    private final long accessExpiryMs;
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
        long now = System.currentTimeMillis();
        return Jwts.builder()
            .subject(userId)
            .claim(CLAIM_TYP, TYP_ACCESS)
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

    public void validate(String token) {
        try {
            parseClaims(token);
        } catch (ExpiredJwtException e) {
            throw new BusinessException(ErrorCode.TOKEN_EXPIRED);
        } catch (JwtException | IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
    }

    public String resolveUserId(String token) {
        Claims claims = parseClaims(token);
        return claims != null ? claims.getSubject() : null;
    }

    public String resolveTokenType(String token) {
        Claims claims = parseClaims(token);
        return claims != null ? claims.get(CLAIM_TYP, String.class) : null;
    }

    public String resolveJti(String token) {
        Claims claims = parseClaims(token);
        return claims != null ? claims.getId() : null;
    }

    public boolean isAccessToken(String token) {
        return TYP_ACCESS.equals(resolveTokenType(token));
    }

    public boolean isRefreshToken(String token) {
        return TYP_REFRESH.equals(resolveTokenType(token));
    }

    private Claims parseClaims(String token) {
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
}
