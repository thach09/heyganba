package com.heyganba.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.common.response.ApiResponse;
import com.heyganba.common.util.ClientIpResolver;
import com.heyganba.service.RateLimiterService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Set;

/**
 * Rate limit cho mọi request GHI vào khu vực quản trị: `/admin/**` với POST / PUT / DELETE.
 *
 * Vì sao cần: các endpoint ghi của admin (tạo/sửa nội dung, ARCHIVE nội dung, bật/tắt/reset 2FA) đều tốn ghi DB và
 * ghi audit log; một token admin bị lộ hoặc một script lỗi có thể spam hàng nghìn request ghi trước khi ai phát hiện.
 * Mức chặn: **30 request/phút/admin** — dùng lại đúng {@link RateLimiterService} (fixed-window in-memory) mà login
 * và các endpoint chấm điểm quiz/flashcard đang dùng, không thêm cơ chế mới.
 *
 * Khoá đếm theo TÀI KHOẢN admin (không theo IP) đúng như yêu cầu "30 request/phút/admin": nhiều admin sau cùng một
 * IP (mạng trường học) không làm hao hạn mức của nhau. Request chưa xác thực thì Spring Security đã trả 401/403
 * TRƯỚC filter này (filter chạy sau chuỗi security) nên không cần đếm; trường hợp vẫn lọt thì khoá theo IP.
 *
 * Áp cho DELETE vì thao tác "ARCHIVE nội dung" của admin panel đi qua `DELETE /admin/{content}/{id}`
 * (soft-delete → `review_status = ARCHIVED`).
 */
@Component
@RequiredArgsConstructor
public class AdminWriteRateLimitFilter extends OncePerRequestFilter {

    /** Mức chặn: 30 thao tác ghi/phút/admin (đề xuất đã chốt trong security-plan.md). */
    public static final int ADMIN_WRITE_RATE_LIMIT = 30;
    public static final Duration ADMIN_WRITE_RATE_WINDOW = Duration.ofMinutes(1);

    private static final Set<String> WRITE_METHODS = Set.of("POST", "PUT", "DELETE");
    private static final String ADMIN_PATH_PREFIX = "/admin";
    private static final String ANONYMOUS_PRINCIPAL = "anonymousUser";

    /** 429 — không dùng hằng của servlet API vì `HttpServletResponse` không có SC_TOO_MANY_REQUESTS. */
    private static final int HTTP_TOO_MANY_REQUESTS = 429;

    private final RateLimiterService rateLimiterService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (!isAdminWriteRequest(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String actor = resolveActor(authentication);
        String key = actor != null
                ? "admin-write:user:" + actor
                : "admin-write:ip:" + ClientIpResolver.resolve(request);

        if (!rateLimiterService.tryConsume(key, ADMIN_WRITE_RATE_LIMIT, ADMIN_WRITE_RATE_WINDOW)) {
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setStatus(HTTP_TOO_MANY_REQUESTS);
            ApiResponse<Void> body = ApiResponse.<Void>builder()
                    .success(false)
                    .message("Quá nhiều thao tác quản trị trong một phút. Vui lòng thử lại sau.")
                    .error("TOO_MANY_REQUESTS")
                    .build();
            response.getWriter().write(objectMapper.writeValueAsString(body));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private static String resolveActor(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        String name = authentication.getName();
        if (name == null || name.isBlank() || ANONYMOUS_PRINCIPAL.equals(name)) {
            return null;
        }
        return name;
    }

    private static boolean isAdminWriteRequest(HttpServletRequest request) {
        if (!WRITE_METHODS.contains(request.getMethod())) {
            return false;
        }
        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }
        return path.equals(ADMIN_PATH_PREFIX) || path.startsWith(ADMIN_PATH_PREFIX + "/");
    }
}
