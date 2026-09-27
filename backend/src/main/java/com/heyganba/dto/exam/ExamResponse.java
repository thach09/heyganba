package com.heyganba.dto.exam;

import java.time.Instant;
import java.util.List;

/** Đề thi thử đang làm (kèm hạn nộp để UI hiển thị đồng hồ đếm ngược). */
public record ExamResponse(
        Long examId,
        int totalQuestions,
        int durationMinutes,
        Instant startedAt,
        Instant expiresAt,
        String status,
        List<ExamQuestionResponse> questions
) {
}
