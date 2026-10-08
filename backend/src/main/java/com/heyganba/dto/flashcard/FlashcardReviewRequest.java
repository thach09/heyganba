package com.heyganba.dto.flashcard;

import com.heyganba.service.srs.SrsRating;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** Body submit kết quả ôn tập: chọn mức Dễ / Được / Khó / Quên cho 1 từ. */
public record FlashcardReviewRequest(
        @NotNull(message = "vocabularyId is required")
        Long vocabularyId,

        @NotNull(message = "rating is required (EASY / GOOD / HARD / FORGOT)")
        SrsRating rating,
        @NotNull(message = "attemptId is required") UUID attemptId
) {
}
