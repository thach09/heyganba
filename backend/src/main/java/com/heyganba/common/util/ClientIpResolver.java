package com.heyganba.common.util;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Lấy IP thật của client khi app chạy sau reverse proxy (Render ở production, Vite proxy ở local).
 *
 * Vì sao không dùng mỗi {@code request.getRemoteAddr()}: ở production Render đứng trước app nên giá trị đó là
 * IP của proxy → mọi user bị gộp vào 1 khoá rate limit (một người spam là cả lớp bị chặn).
 *
 * Vì sao lấy phần tử <b>CUỐI</b> của {@code X-Forwarded-For}: mỗi proxy ghi thêm IP nó nhận được vào cuối chuỗi,
 * còn client có thể tự gửi header giả ở đầu chuỗi. Lấy phần tử cuối = giá trị do proxy gần nhất quan sát được,
 * không do kẻ tấn công kiểm soát.
 *
 * Lưu ý: rate limit theo IP chỉ là lớp phụ (chống flood). Lớp chính chống brute-force là theo TÀI KHOẢN (email)
 * vì IP có thể bị chia sẻ qua NAT của trường học/quán net.
 */
public final class ClientIpResolver {

    /** IPv6 dài tối đa 45 ký tự — chặn giá trị rác/quá dài để không làm phình khoá trong map rate limit. */
    private static final int MAX_IP_LENGTH = 45;

    private static final String UNKNOWN_IP = "unknown";

    private ClientIpResolver() {
    }

    public static String resolve(HttpServletRequest request) {
        if (request == null) {
            return UNKNOWN_IP;
        }

        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            String[] hops = forwardedFor.split(",");
            String candidate = hops[hops.length - 1].trim();
            if (isPlausibleIp(candidate)) {
                return candidate;
            }
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && isPlausibleIp(realIp.trim())) {
            return realIp.trim();
        }

        String remoteAddr = request.getRemoteAddr();
        return (remoteAddr == null || remoteAddr.isBlank()) ? UNKNOWN_IP : remoteAddr;
    }

    /** Chỉ nhận chuỗi trông giống IPv4/IPv6 để header lạ không tạo khoá rate limit tuỳ ý. */
    private static boolean isPlausibleIp(String value) {
        return value.length() <= MAX_IP_LENGTH && value.matches("[0-9a-fA-F.:]+");
    }
}
