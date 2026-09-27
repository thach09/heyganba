package com.heyganba.service;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiter in-memory dạng fixed-window, dùng cho các endpoint chấm điểm (quiz/flashcard/thi thử).
 *
 * Lý do tự implement thay vì thêm Bucket4j: phase 1 chưa cần cluster (Render free tier chạy 1 instance) và
 * tránh thêm dependency ngoài phạm vi phase. Khi scale ngang hoặc Phase 2 có Redis, thay class này bằng
 * bucket trên Redis mà không đổi chữ ký phương thức.
 */
@Component
public class RateLimiterService {

    private static final int MAX_TRACKED_KEYS = 10_000;

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    /**
     * @return true nếu request được phép; false nếu vượt quá giới hạn trong cửa sổ thời gian.
     */
    public boolean tryConsume(String key, int limit, Duration window) {
        long now = System.currentTimeMillis();

        if (windows.size() > MAX_TRACKED_KEYS) {
            purgeExpired(now, window.toMillis());
        }

        Window current = windows.compute(key, (trackingKey, existing) -> {
            if (existing == null || now - existing.startMillis >= window.toMillis()) {
                return new Window(now);
            }
            existing.count++;
            return existing;
        });

        return current.count <= limit;
    }

    /**
     * Kiểm tra cửa sổ hiện tại ĐÃ vượt giới hạn chưa, <b>không</b> tăng bộ đếm.
     *
     * Dùng cho luồng đăng nhập: mỗi lần đăng nhập SAI mới tăng bộ đếm (bằng {@link #tryConsume}),
     * còn trước khi xác thực thì chỉ "nhìn" để chặn sớm — nhờ vậy user đăng nhập đúng nhiều lần
     * không bị tính là tấn công (tránh tự khoá tài khoản của mình).
     */
    public boolean isBlocked(String key, int limit, Duration window) {
        Window current = windows.get(key);
        if (current == null) {
            return false;
        }
        if (System.currentTimeMillis() - current.startMillis >= window.toMillis()) {
            return false;
        }
        return current.count >= limit;
    }

    /** Xoá toàn bộ trạng thái — dùng trong test để cô lập từng case. */
    public void reset() {
        windows.clear();
    }

    private void purgeExpired(long now, long windowMillis) {
        windows.entrySet().removeIf(entry -> now - entry.getValue().startMillis >= windowMillis);
    }

    private static final class Window {
        private final long startMillis;
        private int count = 1;

        private Window(long startMillis) {
            this.startMillis = startMillis;
        }
    }
}
