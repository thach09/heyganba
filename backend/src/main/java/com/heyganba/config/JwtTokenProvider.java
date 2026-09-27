package com.heyganba.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    /**
     * Claim phân biệt access token / refresh token.
     * Nhờ claim này, refresh token (sống lâu) KHÔNG thể dùng để gọi API protected
     * và access token không thể dùng ở endpoint /auth/refresh.
     */
    public static final String TOKEN_TYPE_CLAIM = "token_type";
    public static final String ACCESS_TOKEN_TYPE = "access";
    public static final String REFRESH_TOKEN_TYPE = "refresh";

    private final SecretKey key;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-expiration-ms:1800000}") long accessTokenExpirationMs,
            @Value("${app.jwt.refresh-token-expiration-ms:604800000}") long refreshTokenExpirationMs) {
        this.key = buildKey(secret);
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    /**
     * Kiểm tra secret ngay lúc khởi động để lỗi cấu hình có thông báo hành động được.
     *
     * Thực tế đã gặp trên Render: thiếu biến `JWT_SECRET` → cả context fail với
     * `Could not resolve placeholder 'JWT_SECRET'`, rất khó đoán cần làm gì. Ở đây (và trong `application.yml`)
     * ta để default rỗng rồi tự validate → log ra đúng việc cần làm, vẫn fail-fast (không chạy với secret yếu).
     */
    private static SecretKey buildKey(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("""
                    Thiếu biến môi trường JWT_SECRET — app dừng để không chạy production với secret yếu.
                    Cách sửa: Render → service → Environment → thêm JWT_SECRET (giá trị `openssl rand -base64 48`),
                    hoặc deploy bằng Blueprint (render.yaml đã đặt generateValue: true để Render tự sinh).
                    """);
        }

        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
        } catch (Exception ex) {
            throw new IllegalStateException(
                    "JWT_SECRET không phải chuỗi Base64 hợp lệ (dùng `openssl rand -base64 48`).", ex);
        }

        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET quá ngắn: cần ≥ 32 byte sau khi decode Base64 "
                    + "(hiện " + keyBytes.length + " byte). Dùng `openssl rand -base64 48`.");
        }

        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        return generateAccessToken(userPrincipal);
    }

    public String generateAccessToken(UserPrincipal userPrincipal) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + accessTokenExpirationMs);

        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userPrincipal.getId());
        claims.put("fullName", userPrincipal.getFullName());
        claims.put("role", userPrincipal.getAuthorities().iterator().next().getAuthority());
        claims.put(TOKEN_TYPE_CLAIM, ACCESS_TOKEN_TYPE);

        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(userPrincipal.getUsername())
                .claims(claims)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken(UserPrincipal userPrincipal) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshTokenExpirationMs);

        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(userPrincipal.getUsername())
                .claim(TOKEN_TYPE_CLAIM, REFRESH_TOKEN_TYPE)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public String getUsernameFromJwt(String token) {
        return parseClaims(token).getSubject();
    }

    /** Chỉ access token mới được dùng để gọi API protected. */
    public boolean isAccessToken(String token) {
        return hasTokenType(token, ACCESS_TOKEN_TYPE);
    }

    /** Chỉ refresh token mới được dùng ở endpoint /auth/refresh. */
    public boolean isRefreshToken(String token) {
        return hasTokenType(token, REFRESH_TOKEN_TYPE);
    }

    private boolean hasTokenType(String token, String expectedType) {
        try {
            return expectedType.equals(parseClaims(token).get(TOKEN_TYPE_CLAIM, String.class));
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("Cannot read token_type claim: {}", ex.getMessage());
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validateToken(String authToken) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(authToken);
            return true;
        } catch (ExpiredJwtException ex) {
            log.debug("Expired JWT token");
        } catch (SecurityException | MalformedJwtException ex) {
            log.debug("Invalid JWT signature");
        } catch (UnsupportedJwtException ex) {
            log.debug("Unsupported JWT token");
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("Invalid JWT token: {}", ex.getMessage());
        }
        return false;
    }
}
