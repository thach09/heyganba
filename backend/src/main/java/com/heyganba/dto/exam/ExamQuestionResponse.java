package com.heyganba.dto.exam;

import java.util.List;

/**
 * Câu hỏi trong đề gửi cho client — KHÔNG chứa đáp án (đáp án giữ ở server).
 *
 * `audioText`: CHUỖI KANA để phát bằng audio TTS của server (`GET /api/v1/audio/tts`, Google Translate TTS +
 * cache). Với từ vựng phải là `reading` (kana) chứ KHÔNG phải chữ kanji — TTS nhận kanji sẽ đọc theo cách đọc
 * phổ biến nhất và sai với từ ghép.
 */
public record ExamQuestionResponse(
        int index,
        String type,
        String questionText,
        List<String> options,
        String audioText
) {
}
