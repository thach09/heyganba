package com.heyganba.dto.kana;

/**
 * Kết quả chấm quiz kana. `correctAnswer` luôn được trả về để client hiển thị đáp án đúng khi sai.
 */
public record KanaQuizCheckResponse(
        boolean correct,
        String character,
        String correctAnswer,
        String submittedAnswer
) {
}
