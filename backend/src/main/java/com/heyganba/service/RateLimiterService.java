package com.heyganba.service;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.util.Objects;
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
    private final Clock clock;
    private final int cleanupThreshold;

    public RateLimiterService() {
        this(Clock.systemUTC(), MAX_TRACKED_KEYS);
    }

    RateLimiterService(Clock clock, int cleanupThreshold) {
        this.clock = Objects.requireNonNull(clock);
        if (cleanupThreshold < 1) throw new IllegalArgumentException("Cleanup threshold must be positive");
        this.cleanupThreshold = cleanupThreshold;
    }

    /**
     * @return true nếu request được phép; false nếu vượt quá giới hạn trong cửa sổ thời gian.
     */
    public boolean tryConsume(String key, int limit, Duration window) {
        long windowMillis = windowMillis(window);
        if (windows.size() > cleanupThreshold) {
            purgeExpired(clock.millis());
        }

        Window current = windows.compute(key, (trackingKey, existing) -> {
            long now = clock.millis();
            if (existing == null || existing.expired(now)) {
                return new Window(now, windowMillis, 1);
            }
            // Preserve the duration chosen when this window started. A different caller
            // must not shorten a live window. Publish an immutable per-call count snapshot.
            long count = existing.count() == Long.MAX_VALUE ? Long.MAX_VALUE : existing.count() + 1;
            return new Window(existing.startMillis(), existing.windowMillis(), count);
        });

        return current.count() <= limit;
    }

    /**
     * Kiểm tra cửa sổ hiện tại ĐÃ vượt giới hạn chưa, <b>không</b> tăng bộ đếm.
     *
     * Dùng cho luồng đăng nhập: mỗi lần đăng nhập SAI mới tăng bộ đếm (bằng {@link #tryConsume}),
     * còn trước khi xác thực thì chỉ "nhìn" để chặn sớm — nhờ vậy user đăng nhập đúng nhiều lần
     * không bị tính là tấn công (tránh tự khoá tài khoản của mình).
     */
    public boolean isBlocked(String key, int limit, Duration window) {
        windowMillis(window);
        Window current = windows.get(key);
        if (current == null) {
            return false;
        }
        if (current.expired(clock.millis())) {
            return false;
        }
        return current.count() >= limit;
    }

    /** Xoá toàn bộ trạng thái — dùng trong test để cô lập từng case. */
    public void reset() {
        windows.clear();
    }

    /**
     * Dọn định kỳ theo thời lượng riêng của từng window, không xóa bộ đếm còn hiệu lực.
     */
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 300_000)
    public void scheduledPurge() {
        purgeExpired(clock.millis());
    }

    private void purgeExpired(long now) {
        windows.forEach((key, entry) -> {
            if (entry.expired(now)) windows.remove(key, entry);
        });
    }

    private static long windowMillis(Duration window) {
        long millis = window.toMillis();
        if (millis < 1) throw new IllegalArgumentException("Window must be at least one millisecond");
        return millis;
    }

    private record Window(long startMillis, long windowMillis, long count) {
        private boolean expired(long now) {
            return now - startMillis >= windowMillis;
        }
    }
}
