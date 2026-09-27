package com.heyganba.dto.exam;

import java.time.Instant;

/** Một lượt thi đã nộp trong lịch sử thi của user. */
public record ExamHistoryResponse(
        Long examId,
        int correctCount,
        int totalCount,
        double scorePercent,
        int durationMinutes,
        Integer durationSeconds,
        Instant submittedAt
) {
}
