package com.heyganba.dto.grammar;

import java.util.List;

/**
 * Bài tập trả cho UI khi luyện tập: CỐ TÌNH không chứa `correctAnswer` để client không thể gian lận
 * (đáp án chỉ trả về sau khi gọi POST /grammar/exercises/{id}/check).
 *
 * `reviewStatus` = PENDING_REVIEW khi câu hỏi còn là bản nháp chờ duyệt tiếng Nhật (UI hiện badge cảnh báo).
 */
public record GrammarExerciseResponse(
        Long id,
        Long ruleId,
        String ruleTitle,
        String questionText,
        List<String> options,
        boolean isCommonMistake,
        String mistakeCategory,
        String reviewStatus
) {
}
