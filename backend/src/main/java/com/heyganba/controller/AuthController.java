package com.heyganba.controller;

import com.heyganba.common.exception.TooManyRequestsException;
import com.heyganba.common.response.ApiResponse;
import com.heyganba.common.util.ClientIpResolver;
import com.heyganba.dto.auth.AuthResponse;
import com.heyganba.dto.auth.LoginRequest;
import com.heyganba.dto.auth.RefreshTokenRequest;
import com.heyganba.dto.auth.RegisterRequest;
import com.heyganba.service.AuthService;
import com.heyganba.service.RateLimiterService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/**
 * Auth API — kèm rate limit chống brute-force (security-plan.md → "Đăng nhập sai nhiều lần liên tiếp: giới hạn
 * số lần thử (rate limit theo tài khoản/IP) để chặn brute-force").
 *
 * Hai lớp giới hạn cho `/auth/login`:
 * - Theo TÀI KHOẢN (email): lớp chính. Chỉ đếm lần đăng nhập SAI → đăng nhập đúng nhiều lần không bị khoá oan.
 * - Theo IP: lớp phụ chống flood. Đặt rộng hơn nhiều vì cả lớp học/quán net có thể dùng chung 1 IP (NAT).
 *
 * Ngưỡng đọc từ `app.security.auth.*` (có default) nên chỉnh được bằng biến môi trường khi cần.
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final Duration LOGIN_WINDOW = Duration.ofMinutes(15);
    private static final Duration REGISTER_WINDOW = Duration.ofHours(1);
    private static final Duration REFRESH_WINDOW = Duration.ofMinutes(15);

    private final AuthService authService;
    private final RateLimiterService rateLimiterService;
    private final com.heyganba.service.RefreshCookieService refreshCookieService;
    private final com.heyganba.service.ProductEventService productEvents;

    @Value("${app.security.auth.login-max-failed-attempts-per-email:5}")
    private int loginMaxFailedAttemptsPerEmail;

    @Value("${app.security.auth.login-max-failed-attempts-per-ip:100}")
    private int loginMaxFailedAttemptsPerIp;

    @Value("${app.security.auth.register-max-attempts-per-ip:30}")
    private int registerMaxAttemptsPerIp;

    @Value("${app.security.auth.refresh-max-attempts-per-ip:300}")
    private int refreshMaxAttemptsPerIp;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest
    ) {
        String ipKey = "auth-register-ip:" + ClientIpResolver.resolve(httpRequest);
        if (!rateLimiterService.tryConsume(ipKey, registerMaxAttemptsPerIp, REGISTER_WINDOW)) {
            throw new TooManyRequestsException(
                    "Too many registration attempts from this network. Please try again later.");
        }

        refreshCookieService.browser(httpRequest);
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .headers(refreshCookieService.headers(httpRequest, response))
                .body(ApiResponse.success(response, "User registered successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        String emailKey = "auth-login-email:" + request.getEmail().toLowerCase().trim();
        String ipKey = "auth-login-ip:" + ClientIpResolver.resolve(httpRequest);

        if (rateLimiterService.isBlocked(emailKey, loginMaxFailedAttemptsPerEmail, LOGIN_WINDOW)
                || rateLimiterService.isBlocked(ipKey, loginMaxFailedAttemptsPerIp, LOGIN_WINDOW)) {
            throw new TooManyRequestsException(
                    "Too many failed login attempts. Please wait 15 minutes and try again.");
        }

        try {
            refreshCookieService.browser(httpRequest);
            AuthResponse response = authService.login(request);
            if (response.getUserId() != null) productEvents.login(response.getUserId());
            return ResponseEntity.ok().headers(refreshCookieService.headers(httpRequest, response))
                    .body(ApiResponse.success(response, "Logged in successfully"));
        } catch (AuthenticationException ex) {
            // Chỉ đếm khi xác thực THẤT BẠI, tránh tự khoá tài khoản của chính người dùng.
            rateLimiterService.tryConsume(emailKey, loginMaxFailedAttemptsPerEmail, LOGIN_WINDOW);
            rateLimiterService.tryConsume(ipKey, loginMaxFailedAttemptsPerIp, LOGIN_WINDOW);
            throw ex;
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @RequestBody(required = false) RefreshTokenRequest request,
            HttpServletRequest httpRequest
    ) {
        String ipKey = "auth-refresh-ip:" + ClientIpResolver.resolve(httpRequest);
        if (!rateLimiterService.tryConsume(ipKey, refreshMaxAttemptsPerIp, REFRESH_WINDOW)) {
            throw new TooManyRequestsException("Too many token refresh attempts. Please try again later.");
        }

        String token = refreshCookieService.browser(httpRequest) ? refreshCookieService.token(httpRequest)
                : request == null ? null : request.getRefreshToken();
        // One-time upgrade of existing body-token sessions to a browser cookie.
        if ((token == null || token.isBlank()) && request != null) token = request.getRefreshToken();
        if (token == null || token.isBlank() || token.length() > 4096) {
            throw new com.heyganba.common.exception.BadRequestException("Refresh token is required");
        }
        AuthResponse response = authService.refreshToken(RefreshTokenRequest.builder().refreshToken(token).build());
        return ResponseEntity.ok().headers(refreshCookieService.headers(httpRequest, response))
                .body(ApiResponse.success(response, "Token refreshed successfully"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestBody(required = false) com.heyganba.dto.auth.LogoutRequest request,
            HttpServletRequest httpRequest
    ) {
        String bearer = httpRequest.getHeader("Authorization");
        String accessToken = (bearer != null && bearer.startsWith("Bearer "))
                ? bearer.substring(7)
                : null;
        boolean browser = refreshCookieService.browser(httpRequest);
        String refreshToken = browser ? refreshCookieService.token(httpRequest) : request != null ? request.getRefreshToken() : null;

        authService.logout(accessToken, refreshToken);
        var builder = ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore());
        if (browser) builder.header(org.springframework.http.HttpHeaders.SET_COOKIE, refreshCookieService.clear());
        return builder.body(ApiResponse.success(null, "Logged out successfully"));
    }

    @org.springframework.web.bind.annotation.PutMapping("/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.heyganba.config.UserPrincipal user,
            @Valid @RequestBody com.heyganba.dto.auth.ChangePasswordRequest request,
            HttpServletRequest httpRequest) {
        if (!rateLimiterService.tryConsume("auth-password:" + user.getId(), 5, LOGIN_WINDOW)) {
            throw new TooManyRequestsException("Bạn đã thử nhiều lần. Vui lòng thử lại sau 15 phút.");
        }
        String bearer = httpRequest.getHeader("Authorization");
        boolean browser = refreshCookieService.browser(httpRequest);
        authService.changePassword(user.getId(), request, bearer.substring(7));
        var builder = ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore());
        if (browser) builder.header(org.springframework.http.HttpHeaders.SET_COOKIE, refreshCookieService.clear());
        return builder.body(ApiResponse.success(null, "Đã đổi mật khẩu và đăng xuất tất cả thiết bị"));
    }
}
