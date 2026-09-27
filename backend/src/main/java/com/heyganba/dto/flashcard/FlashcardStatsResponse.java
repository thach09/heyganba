package com.heyganba.dto.flashcard;

/** Thống kê trạm Flashcard cho user đang đăng nhập. */
public record FlashcardStatsResponse(
        long learnedWords,
        long dueToday,
        long availableNewWords,
        int currentStreak,
        int longestStreak
) {
}
