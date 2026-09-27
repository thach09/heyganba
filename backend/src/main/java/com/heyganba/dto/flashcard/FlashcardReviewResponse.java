package com.heyganba.dto.flashcard;

import java.time.Instant;

/** Kết quả SRS mới sau khi user đánh giá 1 thẻ. */
public record FlashcardReviewResponse(
        Long vocabularyId,
        String rating,
        int intervalDays,
        int repetitions,
        double easeFactor,
        Instant nextDueDate,
        boolean lapse,
        int currentStreak,
        int longestStreak
) {
}
