package com.heyganba.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.common.response.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.io.InputStream;

/**
 * Giới hạn kích thước request body (security-plan.md → "Giới hạn kích thước payload ... tránh DoS qua request nặng").
 *
 * Vì sao cần: backend chạy free tier 512MB RAM; một request JSON vài trăm MB có thể làm instance hết heap trước
 * khi tầng validate vào cuộc. Mọi endpoint chỉ nhận JSON nhỏ (đăng ký, nộp bài thi, chấm quiz/flashcard),
 * KHÔNG có upload file.
 *
 * Cách chặn 2 lớp:
 * 1. `Content-Length` vượt giới hạn → trả 413 ngay, không đọc body.
 * 2. Client stream bằng chunked (không có `Content-Length`) → bọc input stream, vượt giới hạn thì ném
 *    {@code PayloadTooLargeException} ngay giữa lúc đọc (vẫn thành 413, không lách được bằng cách stream).
 */
@Component
@RequiredArgsConstructor
public class MaxPayloadSizeFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;

    @Value("${app.security.max-request-bytes:65536}")
    private long maxRequestBytes;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        long declaredLength = request.getContentLengthLong();
        if (declaredLength > maxRequestBytes) {
            writeTooLarge(response, declaredLength);
            return;
        }

        filterChain.doFilter(new CappedRequest(request, maxRequestBytes), response);
    }

    private void writeTooLarge(HttpServletResponse response, long declaredLength) throws IOException {
        response.setStatus(HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ApiResponse<Void> body = ApiResponse.<Void>builder()
                .success(false)
                .message("Request body is too large (received " + declaredLength
                        + " bytes, limit is " + maxRequestBytes + " bytes)")
                .error("PAYLOAD_TOO_LARGE")
                .build();
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }

    /** Wrapper chỉ thay input stream; mọi hành vi khác giữ nguyên như request gốc. */
    private static final class CappedRequest extends HttpServletRequestWrapper {

        private final long maxBytes;

        private CappedRequest(HttpServletRequest request, long maxBytes) {
            super(request);
            this.maxBytes = maxBytes;
        }

        @Override
        public jakarta.servlet.ServletInputStream getInputStream() throws IOException {
            InputStream original = super.getInputStream();
            return new CappedServletInputStream(original, maxBytes);
        }
    }
}
