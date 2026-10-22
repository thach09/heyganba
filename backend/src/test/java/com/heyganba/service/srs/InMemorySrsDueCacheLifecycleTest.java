package com.heyganba.service.srs;

import com.heyganba.dto.flashcard.FlashcardDueResponse;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.service.StreakService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class InMemorySrsDueCacheLifecycleTest {
    private final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-10-21T16:00:00Z"));
    private final Clock clock = mock(Clock.class);

    private InMemorySrsDueCache cache(String zone, int capacity) {
        when(clock.instant()).thenAnswer(ignored -> now.get());
        return new InMemorySrsDueCache(zone, clock, capacity);
    }

    private static List<FlashcardDueResponse> items(long id) {
        return List.of(FlashcardDueResponse.fromNewVocabulary(Vocabulary.builder().id(id).word("synthetic").build()));
    }

    private static Map<?, ?> entries(InMemorySrsDueCache cache) {
        return (Map<?, ?>) ReflectionTestUtils.getField(cache, "cache");
    }

    @Test void productionCapacityIsTenThousandAndActualAdmissionIsBounded() {
        assertThat(ReflectionTestUtils.getField(new InMemorySrsDueCache(StreakService.DEFAULT_ZONE), "maxEntries")).isEqualTo(10_000);
        InMemorySrsDueCache cache = cache(StreakService.DEFAULT_ZONE, 10_000);
        for (long id = 0; id < 10_001; id++) cache.put(id, List.of());
        assertThat(entries(cache)).hasSize(10_000);
        assertThat(cache.get(9_999L)).contains(List.of());
        assertThat(cache.get(10_000L)).isEmpty();
    }

    @Test void fullCacheStillUpdatesExistingUsersWithoutEvictingOtherActiveUsers() {
        InMemorySrsDueCache cache = cache(StreakService.DEFAULT_ZONE, 2);
        cache.put(1L, items(1));
        cache.put(2L, items(2));
        cache.put(3L, items(3));
        cache.put(1L, items(99));
        assertThat(entries(cache)).hasSize(2);
        assertThat(cache.get(1L)).contains(items(99));
        assertThat(cache.get(2L)).contains(items(2));
        assertThat(cache.get(3L)).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({
            "Asia/Ho_Chi_Minh,2026-10-21T16:59:00Z,2026-10-21T17:00:00Z",
            "UTC,2026-10-21T23:59:00Z,2026-10-22T00:00:00Z",
            "America/New_York,2026-03-08T05:00:00Z,2026-03-09T04:00:00Z",
            "Europe/Berlin,2026-10-24T22:00:00Z,2026-10-25T23:00:00Z"
    })
    void expiresExactlyAtConfiguredLocalMidnightIncludingDst(String zone, String start, String expiry) {
        InMemorySrsDueCache cache = cache(zone, 2);
        now.set(Instant.parse(start));
        cache.put(1L, items(1));
        now.set(Instant.parse(expiry).minusNanos(1));
        assertThat(cache.get(1L)).contains(items(1));
        now.set(Instant.parse(expiry));
        assertThat(cache.get(1L)).isEmpty();
        assertThat(entries(cache)).isEmpty();
    }

    @Test void scheduledPurgeRemovesExpiredEntriesAndRetainsSameDayEntries() {
        InMemorySrsDueCache cache = cache(StreakService.DEFAULT_ZONE, 2);
        cache.put(1L, items(1));
        cache.purgeExpired();
        assertThat(entries(cache)).hasSize(1);
        now.set(Instant.parse("2026-10-21T17:00:00Z"));
        cache.purgeExpired();
        assertThat(entries(cache)).isEmpty();
        cache.put(2L, items(2));
        cache.purgeExpired();
        assertThat(cache.get(2L)).contains(items(2));
    }

    @Test void capacityCleanupReclaimsExpiredSlotsAndPreservesARefreshedUser() {
        InMemorySrsDueCache cache = cache(StreakService.DEFAULT_ZONE, 2);
        cache.put(1L, items(1));
        cache.put(2L, items(2));
        now.set(Instant.parse("2026-10-21T17:00:00Z"));
        cache.put(1L, items(11));
        cache.put(3L, items(3));
        assertThat(entries(cache)).hasSize(2);
        assertThat(cache.get(1L)).contains(items(11));
        assertThat(cache.get(2L)).isEmpty();
        assertThat(cache.get(3L)).contains(items(3));
    }

    @Test void invalidateAndClearAllFreeCapacityAndPreserveEmptyListHits() {
        InMemorySrsDueCache cache = cache(StreakService.DEFAULT_ZONE, 1);
        cache.put(1L, List.of());
        assertThat(cache.get(1L)).contains(List.of());
        cache.invalidate(2L);
        assertThat(cache.get(1L)).isPresent();
        cache.invalidate(1L);
        cache.put(2L, items(2));
        assertThat(cache.get(2L)).isPresent();
        cache.clearAll();
        assertThat(entries(cache)).isEmpty();
        cache.put(3L, items(3));
        assertThat(cache.get(3L)).isPresent();
    }

    @Test void listsAreCopiedAndReturnedAsImmutableSnapshots() {
        InMemorySrsDueCache cache = cache(StreakService.DEFAULT_ZONE, 1);
        var input = new ArrayList<>(items(1));
        cache.put(1L, input);
        input.clear();
        assertThat(cache.get(1L)).contains(items(1));
        assertThatThrownBy(() -> cache.get(1L).orElseThrow().clear()).isInstanceOf(UnsupportedOperationException.class);
    }

    @Test void nullKeysAndInvalidListsRemainRejected() {
        InMemorySrsDueCache cache = cache(StreakService.DEFAULT_ZONE, 1);
        assertThatNullPointerException().isThrownBy(() -> cache.get(null));
        assertThatNullPointerException().isThrownBy(() -> cache.put(null, List.of()));
        assertThatNullPointerException().isThrownBy(() -> cache.invalidate(null));
        assertThatNullPointerException().isThrownBy(() -> cache.put(1L, null));
        assertThatNullPointerException().isThrownBy(() -> cache.put(1L, java.util.Arrays.asList((FlashcardDueResponse) null)));
        assertThat(entries(cache)).isEmpty();
    }

    @Test void concurrentAdmissionNeverExceedsCapacity() throws Exception {
        InMemorySrsDueCache cache = cache(StreakService.DEFAULT_ZONE, 8);
        var pool = Executors.newFixedThreadPool(12);
        CountDownLatch start = new CountDownLatch(1);
        var futures = new ArrayList<Future<?>>();
        try {
            for (long id = 0; id < 128; id++) {
                long userId = id;
                futures.add(pool.submit(() -> {
                    await(start);
                    cache.put(userId, items(userId));
                    synchronized (cache) { assertThat(entries(cache).size()).isLessThanOrEqualTo(8); }
                }));
            }
            start.countDown();
            for (Future<?> future : futures) future.get(5, TimeUnit.SECONDS);
            assertThat(entries(cache)).hasSize(8);
        } finally {
            start.countDown();
            pool.shutdownNow();
        }
    }

    @Test void concurrentReadUpdateInvalidateClearAndPurgeRemainConsistent() throws Exception {
        InMemorySrsDueCache cache = cache(StreakService.DEFAULT_ZONE, 8);
        var pool = Executors.newFixedThreadPool(8);
        var futures = new ArrayList<Future<?>>();
        try {
            for (int worker = 0; worker < 8; worker++) {
                long id = worker;
                futures.add(pool.submit(() -> {
                    for (int i = 0; i < 50; i++) {
                        cache.put(id, items(id));
                        cache.get(id).ifPresent(cards -> assertThat(cards.getFirst().vocabularyId()).isEqualTo(id));
                        cache.invalidate(id);
                        cache.purgeExpired();
                        if (i % 7 == 0) cache.clearAll();
                        synchronized (cache) { assertThat(entries(cache).size()).isLessThanOrEqualTo(8); }
                    }
                }));
            }
            for (Future<?> future : futures) future.get(5, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void expiredReadOrCleanupCannotDeleteARefreshRacingWithIt(boolean readInsteadOfPurge) throws Exception {
        InMemorySrsDueCache cache = cache(StreakService.DEFAULT_ZONE, 1);
        cache.put(1L, items(1));
        now.set(Instant.parse("2026-10-21T17:00:00Z"));
        CountDownLatch inspectedClock = new CountDownLatch(1);
        CountDownLatch releaseCleanup = new CountDownLatch(1);
        CountDownLatch refreshStarted = new CountDownLatch(1);
        when(clock.instant()).thenAnswer(ignored -> {
            Instant snapshot = now.get();
            if (Thread.currentThread().getName().equals("cache-cleaner")) {
                inspectedClock.countDown();
                await(releaseCleanup);
            }
            return snapshot;
        });
        var pool = Executors.newFixedThreadPool(2);
        try {
            Future<?> cleanup = pool.submit(() -> {
                Thread.currentThread().setName("cache-cleaner");
                if (readInsteadOfPurge) cache.get(1L); else cache.purgeExpired();
            });
            await(inspectedClock);
            Future<?> refresh = pool.submit(() -> {
                refreshStarted.countDown();
                cache.put(1L, items(99));
            });
            await(refreshStarted);
            releaseCleanup.countDown();
            cleanup.get(5, TimeUnit.SECONDS);
            refresh.get(5, TimeUnit.SECONDS);
            assertThat(cache.get(1L)).contains(items(99));
            cache.purgeExpired();
            assertThat(cache.get(1L)).contains(items(99));
        } finally {
            releaseCleanup.countDown();
            pool.shutdownNow();
        }
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) throw new AssertionError("Barrier timed out");
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new AssertionError(error);
        }
    }
}
