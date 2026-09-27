package com.heyganba.dto.kanji;

import java.time.Instant;

/** Kết quả sau khi user luyện viết 1 kanji (server tự tăng, không tin số đếm từ client). */
public record KanjiProgressResponse(
        Long kanjiId,
        String character,
        int practiceCount,
        Instant lastPracticedAt
) {
}
