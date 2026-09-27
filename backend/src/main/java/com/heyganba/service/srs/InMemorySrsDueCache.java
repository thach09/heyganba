package com.heyganba.service.srs;

import com.heyganba.dto.flashcard.FlashcardDueResponse;
import com.heyganba.service.StreakService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

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

    private final ConcurrentHashMap<Long, Entry> cache = new ConcurrentHashMap<>();
    private final ZoneId zone;

    public InMemorySrsDueCache(@Value("${app.streak.zone:" + StreakService.DEFAULT_ZONE + "}") String zoneId) {
        this.zone = ZoneId.of(zoneId);
    }

    @Override
    public Optional<List<FlashcardDueResponse>> get(Long userId) {
        Entry entry = cache.get(userId);
        if (entry == null) {
            return Optional.empty();
        }
        if (entry.expiresAt().isBefore(Instant.now())) {
            cache.remove(userId, entry);
            return Optional.empty();
        }
        return Optional.of(entry.items());
    }

    @Override
    public void put(Long userId, List<FlashcardDueResponse> items) {
        cache.put(userId, new Entry(List.copyOf(items), endOfToday()));
    }

    @Override
    public void invalidate(Long userId) {
        cache.remove(userId);
    }

    @Override
    public void clearAll() {
        cache.clear();
    }

    private Instant endOfToday() {
        return Instant.now().atZone(zone).toLocalDate().plusDays(1).atStartOfDay(zone).toInstant();
    }

    private record Entry(List<FlashcardDueResponse> items, Instant expiresAt) {
    }
}
