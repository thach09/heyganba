package com.heyganba.dto.grammar;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** Body chấm điểm bài tập điền khuyết (đáp án server tự đối chiếu). */
public record GrammarCheckRequest(
        @NotBlank(message = "userAnswer is required")
        @Size(max = 200, message = "userAnswer must be at most 200 characters")
        String userAnswer,
        @NotNull(message = "attemptId is required") UUID attemptId
) {
}
