package com.heyganba.service.srs;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * SM-2 rút gọn cho trạm Flashcard (Phase 2).
 *
 * Khác SM-2 gốc: chỉ dùng 4 mức đánh giá (Dễ / Được / Khó / Quên) thay vì 6 mức 0–5,
 * và chặn interval tối đa để tránh chu kỳ phình vô hạn.
 *
 * Thuật toán thuần (không phụ thuộc Spring/DB) → unit test trực tiếp.
 */
public final class SrsEngine {

    public static final double INITIAL_EASE_FACTOR = 2.5;
    public static final double MIN_EASE_FACTOR = 1.3;
    public static final int FIRST_INTERVAL_DAYS = 1;
    public static final int SECOND_INTERVAL_DAYS = 6;
    public static final int MAX_INTERVAL_DAYS = 365;

    private SrsEngine() {
    }

    /** Trạng thái SRS hiện tại của 1 cặp (user, từ vựng). */
    public record State(int repetitions, int intervalDays, double easeFactor) {
        public static State initial() {
            return new State(0, 0, INITIAL_EASE_FACTOR);
        }
    }

    /** Kết quả sau khi user đánh giá 1 thẻ. */
    public record Outcome(int repetitions, int intervalDays, double easeFactor, Instant dueDate, boolean lapse) {
    }

    public static Outcome apply(State state, SrsRating rating, Instant now) {
        int quality = rating.quality();
        boolean lapse = rating.isLapse();

        double easeFactor = state.easeFactor()
                + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor);
        easeFactor = Math.round(easeFactor * 100.0) / 100.0;

        int repetitions;
        int intervalDays;

        if (lapse) {
            repetitions = 0;
            intervalDays = FIRST_INTERVAL_DAYS;
        } else {
            repetitions = state.repetitions() + 1;
            if (repetitions == 1) {
                intervalDays = FIRST_INTERVAL_DAYS;
            } else if (repetitions == 2) {
                intervalDays = SECOND_INTERVAL_DAYS;
            } else {
                int base = Math.max(state.intervalDays(), SECOND_INTERVAL_DAYS);
                intervalDays = (int) Math.round(base * easeFactor);
            }
            intervalDays = Math.min(intervalDays, MAX_INTERVAL_DAYS);
        }

        Instant dueDate = now.plus(intervalDays, ChronoUnit.DAYS);
        return new Outcome(repetitions, intervalDays, easeFactor, dueDate, lapse);
    }
}
