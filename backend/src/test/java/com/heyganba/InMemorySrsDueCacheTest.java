package com.heyganba;

import com.heyganba.dto.flashcard.FlashcardDueResponse;
import com.heyganba.service.StreakService;
import com.heyganba.service.srs.InMemorySrsDueCache;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit test cache SRS in-memory (implementation ĐANG DÙNG ở mọi môi trường — Redis chưa kích hoạt).
 *
 * TTL cache = hết ngày theo `app.streak.zone` (giờ VN) nên cache tự hết hạn đúng lúc reset "ngày học".
 */
class InMemorySrsDueCacheTest {

    private static final List<FlashcardDueResponse> ITEMS = List.of(
            new FlashcardDueResponse(1L, "日本", "にほん", "Nhật Bản", "Nhật Bản", null, null, null,
                    "jpd113-b1", false, 3, 1, 2.5, Instant.now())
    );

    @Test
    @DisplayName("put/get/invalidate/clearAll hoạt động đúng theo userId")
    void roundTripByUser() {
        InMemorySrsDueCache cache = new InMemorySrsDueCache(StreakService.DEFAULT_ZONE);

        assertTrue(cache.get(7L).isEmpty());

        cache.put(7L, ITEMS);
        Optional<List<FlashcardDueResponse>> cached = cache.get(7L);
        assertTrue(cached.isPresent());
        assertEquals(1, cached.get().size());
        assertEquals("日本", cached.get().get(0).word());

        // Cách ly giữa các user
        assertTrue(cache.get(8L).isEmpty());

        cache.invalidate(7L);
        assertTrue(cache.get(7L).isEmpty());

        cache.put(7L, ITEMS);
        cache.clearAll();
        assertTrue(cache.get(7L).isEmpty());
    }
}
