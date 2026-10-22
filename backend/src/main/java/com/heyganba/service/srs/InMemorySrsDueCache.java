package com.heyganba.service.srs;

import com.heyganba.dto.flashcard.FlashcardDueResponse;
import com.heyganba.service.StreakService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Implementation in-memory của {@link SrsDueCache}: TTL = hết ngày hiện tại **theo `app.streak.zone`**
 * (mặc định giờ VN) để qua ngày mới cache tự hết hạn, khớp mốc "ngày học" dùng cho streak/heatmap.
 *
 * Đây là implementation ĐANG DÙNG (`app.srs.cache` chưa set hoặc = `memory`) ở mọi môi trường;
 * bật Redis bằng `app.srs.cache=redis`.
 */
@Component
@ConditionalOnProperty(name = "app.srs.cache", havingValue = "memory", matchIfMissing = true)
public class InMemorySrsDueCache implements SrsDueCache {

    private static final int MAX_ENTRIES = 10_000;
    // All access shares this instance's monitor: admission/expiration/replacement are atomic.
    private final Map<Long, Entry> cache = new HashMap<>();
    private final ZoneId zone;
    private final Clock clock;
    private final int maxEntries;

    @Autowired
    public InMemorySrsDueCache(@Value("${app.streak.zone:" + StreakService.DEFAULT_ZONE + "}") String zoneId) {
        this(zoneId, Clock.systemUTC(), MAX_ENTRIES);
    }

    InMemorySrsDueCache(String zoneId, Clock clock, int maxEntries) {
        this.zone = ZoneId.of(zoneId);
        this.clock = Objects.requireNonNull(clock);
        if (maxEntries < 1) throw new IllegalArgumentException("Cache capacity must be positive");
        this.maxEntries = maxEntries;
    }

    @Override
    public synchronized Optional<List<FlashcardDueResponse>> get(Long userId) {
        Objects.requireNonNull(userId);
        Entry entry = cache.get(userId);
        if (entry == null) {
            return Optional.empty();
        }
        if (!entry.expiresAt().isAfter(clock.instant())) {
            cache.remove(userId);
            return Optional.empty();
        }
        return Optional.of(entry.items());
    }

    @Override
    public synchronized void put(Long userId, List<FlashcardDueResponse> items) {
        Objects.requireNonNull(userId);
        List<FlashcardDueResponse> snapshot = List.copyOf(items);
        Instant now = clock.instant();
        if (!cache.containsKey(userId) && cache.size() >= maxEntries) {
            purgeExpired(now);
            // Admission is optional: FlashcardService returns its repository result even
            // when it cannot be cached. The database stays authoritative; respect the cap.
            if (cache.size() >= maxEntries) return;
        }
        cache.put(userId, new Entry(snapshot, endOfToday(now)));
    }

    /**
     * Dọn dẹp định kỳ 15 phút/lần các entry SRS đã hết hạn theo múi giờ học, tránh tích tụ rác bộ nhớ.
     */
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 900_000)
    public synchronized void purgeExpired() {
        purgeExpired(clock.instant());
    }

    private void purgeExpired(Instant now) {
        cache.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(now));
    }

    @Override
    public synchronized void invalidate(Long userId) {
        Objects.requireNonNull(userId);
        cache.remove(userId);
    }

    @Override
    public synchronized void clearAll() {
        cache.clear();
    }

    private Instant endOfToday(Instant now) {
        return now.atZone(zone).toLocalDate().plusDays(1).atStartOfDay(zone).toInstant();
    }

    private record Entry(List<FlashcardDueResponse> items, Instant expiresAt) {
    }
}
