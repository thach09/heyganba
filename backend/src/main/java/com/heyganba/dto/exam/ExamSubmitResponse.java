package com.heyganba.dto.exam;

import java.util.List;

/** Kết quả sau khi chấm (kèm chi tiết từng câu để user review lại). */
public record ExamSubmitResponse(
        Long examId,
        int correctCount,
        int totalCount,
        double scorePercent,
        Integer durationSeconds,
        int currentStreak,
        List<QuestionResult> details
) {
    public record QuestionResult(
            int index,
            String type,
            String questionText,
            String submittedAnswer,
            String correctAnswer,
            String explanation,
            boolean correct
    ) {
    }
}
