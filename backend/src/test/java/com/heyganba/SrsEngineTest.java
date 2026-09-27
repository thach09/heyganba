package com.heyganba;

import com.heyganba.service.srs.SrsEngine;
import com.heyganba.service.srs.SrsRating;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit test SM-2 rút gọn (Phase 2.2): interval tăng dần khi trả lời đúng,
 * reset khi quên, ease factor không xuống dưới 1.3, có chặn interval tối đa.
 */
class SrsEngineTest {

    private final Instant now = Instant.parse("2026-09-27T00:00:00Z");

    @Test
    @DisplayName("Trả lời đúng liên tiếp: interval tăng dần 1 → 6 → 15 → 38 ngày")
    void correctAnswersIncreaseInterval() {
        SrsEngine.State state = SrsEngine.State.initial();

        SrsEngine.Outcome first = SrsEngine.apply(state, SrsRating.GOOD, now);
        assertEquals(1, first.repetitions());
        assertEquals(1, first.intervalDays());
        assertEquals(2.5, first.easeFactor(), 0.001);
        assertFalse(first.lapse());

        SrsEngine.Outcome second = SrsEngine.apply(new SrsEngine.State(1, 1, 2.5), SrsRating.GOOD, now);
        assertEquals(2, second.repetitions());
        assertEquals(6, second.intervalDays());

        SrsEngine.Outcome third = SrsEngine.apply(new SrsEngine.State(2, 6, 2.5), SrsRating.GOOD, now);
        assertEquals(3, third.repetitions());
        assertEquals(15, third.intervalDays());

        SrsEngine.Outcome fourth = SrsEngine.apply(new SrsEngine.State(3, 15, 2.5), SrsRating.GOOD, now);
        assertEquals(4, fourth.repetitions());
        assertEquals(38, fourth.intervalDays());
    }

    @Test
    @DisplayName("Đánh giá Dễ đẩy ease factor lên và interval xa hơn so với Được")
    void easyRatingGrowsFasterThanGood() {
        SrsEngine.Outcome easy = SrsEngine.apply(new SrsEngine.State(2, 6, 2.5), SrsRating.EASY, now);
        SrsEngine.Outcome good = SrsEngine.apply(new SrsEngine.State(2, 6, 2.5), SrsRating.GOOD, now);

        assertEquals(2.6, easy.easeFactor(), 0.001);
        assertEquals(2.5, good.easeFactor(), 0.001);
        assertTrue(easy.intervalDays() > good.intervalDays());
    }

    @Test
    @DisplayName("Đánh giá Khó (quality 3): vẫn qua bài nhưng ease factor giảm")
    void hardRatingStillAdvancesButLowersEase() {
        SrsEngine.Outcome hard = SrsEngine.apply(new SrsEngine.State(2, 6, 2.5), SrsRating.HARD, now);

        assertFalse(hard.lapse());
        assertEquals(3, hard.repetitions());
        assertEquals(2.36, hard.easeFactor(), 0.001);
    }

    @Test
    @DisplayName("Quên → reset repetitions về 0 và ôn lại sau 1 ngày")
    void forgotResetsRepetitions() {
        SrsEngine.Outcome lapse = SrsEngine.apply(new SrsEngine.State(5, 60, 2.5), SrsRating.FORGOT, now);

        assertTrue(lapse.lapse());
        assertEquals(0, lapse.repetitions());
        assertEquals(1, lapse.intervalDays());
        assertEquals(1.96, lapse.easeFactor(), 0.001);
    }

    @Test
    @DisplayName("Edge case: ease factor không bao giờ xuống dưới 1.3")
    void easeFactorNeverBelowMinimum() {
        SrsEngine.Outcome first = SrsEngine.apply(new SrsEngine.State(0, 0, 2.5), SrsRating.FORGOT, now);
        assertEquals(1.96, first.easeFactor(), 0.001);

        SrsEngine.Outcome second = SrsEngine.apply(new SrsEngine.State(0, 1, first.easeFactor()), SrsRating.FORGOT, now);
        assertEquals(1.42, second.easeFactor(), 0.001);

        SrsEngine.Outcome third = SrsEngine.apply(new SrsEngine.State(0, 1, second.easeFactor()), SrsRating.FORGOT, now);
        assertEquals(SrsEngine.MIN_EASE_FACTOR, third.easeFactor(), 0.001);

        SrsEngine.Outcome fourth = SrsEngine.apply(new SrsEngine.State(0, 1, third.easeFactor()), SrsRating.FORGOT, now);
        assertEquals(SrsEngine.MIN_EASE_FACTOR, fourth.easeFactor(), 0.001);
    }

    @Test
    @DisplayName("Edge case: interval bị chặn ở mức tối đa 365 ngày")
    void intervalIsCapped() {
        SrsEngine.Outcome outcome = SrsEngine.apply(new SrsEngine.State(20, 365, 2.5), SrsRating.EASY, now);

        assertEquals(SrsEngine.MAX_INTERVAL_DAYS, outcome.intervalDays());
    }

    @Test
    @DisplayName("due date = thời điểm ôn + số ngày interval")
    void dueDateIsComputedFromInterval() {
        SrsEngine.Outcome outcome = SrsEngine.apply(SrsEngine.State.initial(), SrsRating.GOOD, now);

        assertEquals(now.plus(1, ChronoUnit.DAYS), outcome.dueDate());
    }
}
