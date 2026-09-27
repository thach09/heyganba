package com.heyganba.dto.grammar;

/** Kết quả chấm bài tập: trả kèm đáp án đúng + giải thích để UI hiển thị khi sai. */
public record GrammarCheckResponse(
        boolean correct,
        Long exerciseId,
        Long ruleId,
        String ruleTitle,
        String questionText,
        String submittedAnswer,
        String correctAnswer,
        String explanation,
        boolean isCommonMistake,
        String mistakeCategory
) {
}
