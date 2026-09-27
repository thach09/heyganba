package com.heyganba.dto.exam;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** Yêu cầu sinh đề thi thử. Bỏ trống thì dùng mặc định 20 câu / 20 phút. */
public record ExamGenerateRequest(
        @Min(value = 5, message = "totalQuestions must be at least 5")
        @Max(value = 50, message = "totalQuestions must be at most 50")
        Integer totalQuestions,

        @Min(value = 5, message = "durationMinutes must be at least 5")
        @Max(value = 120, message = "durationMinutes must be at most 120")
        Integer durationMinutes
) {
}
