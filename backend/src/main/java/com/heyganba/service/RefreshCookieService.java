package com.heyganba.service;

import com.heyganba.dto.auth.AuthResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.util.Arrays;

/** Optional browser transport; API clients can continue using the existing JWT body protocol. */
@Service
@RequiredArgsConstructor
public class RefreshCookieService {
    public static final String NAME = "heyganba_refresh";
    @Value("${app.cors.allowed-origins}") private String origins;
    @Value("${app.security.refresh-cookie-secure:true}") private boolean secure;
    @Value("${app.jwt.refresh-token-expiration-ms:604800000}") private long ttl;

    public boolean browser(HttpServletRequest request) {
        if (!"cookie".equals(request.getHeader("X-Auth-Transport"))) return false;
        String origin = request.getHeader("Origin");
        // A custom header plus an exact Origin allowlist protects cookie-backed operations against CSRF.
        if (origin == null || Arrays.stream(origins.split(",")).map(String::trim).noneMatch(origin::equals)) {
            throw new AccessDeniedException("Untrusted browser origin");
        }
        return true;
    }

    public String token(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies()).filter(c -> NAME.equals(c.getName()))
                .map(Cookie::getValue).findFirst().orElse(null);
    }

    public HttpHeaders headers(HttpServletRequest request, AuthResponse response) {
        HttpHeaders headers = new HttpHeaders();
        headers.setCacheControl("no-store");
        if (browser(request) && response.getRefreshToken() != null) {
            headers.add(HttpHeaders.SET_COOKIE, cookie(response.getRefreshToken(), Duration.ofMillis(ttl)));
            response.setRefreshToken(null);
        }
        return headers;
    }

    public String clear() { return cookie("", Duration.ZERO); }

    private String cookie(String token, Duration age) {
        return ResponseCookie.from(NAME, token).httpOnly(true).secure(secure).sameSite("Lax")
                .path("/api/v1/auth").maxAge(age).build().toString();
    }
}
