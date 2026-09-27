package com.heyganba.dto.kana;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Body chấm điểm quiz nhận diện kana: server tự đối chiếu đáp án, không tin kết quả từ client.
 */
public record KanaQuizCheckRequest(
        @NotNull(message = "kanaId is required")
        Long kanaId,

        @NotBlank(message = "userAnswer is required")
        @Size(max = 50, message = "userAnswer must be at most 50 characters")
        String userAnswer
) {
}
