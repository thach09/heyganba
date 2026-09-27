package com.heyganba.dto.exam;

import java.util.List;

/**
 * Câu hỏi trong đề gửi cho client — KHÔNG chứa đáp án (đáp án giữ ở server).
 *
 * `audioText`: text để frontend đọc bằng Web Speech API (browser TTS).
 * ⚠️ PLACEHOLDER: đây là giải pháp tạm cho phần "nghe" khi chưa có file audio thu thật;
 * khi có audio thật sẽ thay bằng URL file (field `audioUrl`) và bỏ TTS.
 */
public record ExamQuestionResponse(
        int index,
        String type,
        String questionText,
        List<String> options,
        String audioText
) {
}
