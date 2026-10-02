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
import java.nio.charset.StandardCharsets;
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
                    Cách sửa: Render → service → Environment → thêm JWT_SECRET (bấm nút Generate của Render,
                    hoặc dán giá trị `openssl rand -base64 48`), rồi Save để Render deploy lại.
                    """);
        }

        // Ưu tiên hiểu secret là Base64 (JJWT Decoders.BASE64) để giữ tương thích với secret đang dùng;
        // nếu không phải Base64 hoặc decode ra < 32 byte (như secret Render UI sinh dạng chuỗi ký tự ngẫu nhiên)
        // thì dùng thẳng byte UTF-8 — vẫn đảm bảo ≥ 32 byte khoá cho HS256 mà không bắt người vận hành đổi định dạng secret.
        byte[] base64Bytes = tryDecodeBase64(secret);
        byte[] keyBytes = (base64Bytes != null && base64Bytes.length >= 32)
                ? base64Bytes
                : secret.getBytes(StandardCharsets.UTF_8);

        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET quá ngắn: cần ≥ 32 byte khoá "
                    + "(hiện " + keyBytes.length + " byte). Bấm Generate trong Render hoặc dùng `openssl rand -base64 48`.");
        }

        return Keys.hmacShaKeyFor(keyBytes);
    }

    private static byte[] tryDecodeBase64(String secret) {
        try {
            return Decoders.BASE64.decode(secret);
        } catch (Exception ex) {
            return null;
        }
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

    public String getJtiFromJwt(String token) {
        Claims claims = parseClaimsAllowExpired(token);
        return claims != null ? claims.getId() : null;
    }

    public Date getExpirationFromJwt(String token) {
        Claims claims = parseClaimsAllowExpired(token);
        return claims != null ? claims.getExpiration() : null;
    }

    public Claims parseClaimsAllowExpired(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException ex) {
            return ex.getClaims();
        } catch (Exception ex) {
            log.debug("Cannot parse claims from token: {}", ex.getMessage());
            return null;
        }
    }
}
