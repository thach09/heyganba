package com.heyganba.dto.exam;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Bài nộp: danh sách đáp án theo index câu hỏi (server tự đối chiếu, không nhận điểm từ client). */
public record ExamSubmitRequest(
        @NotEmpty(message = "answers is required")
        @Valid
        List<Answer> answers
) {
    /** Đáp án của 1 câu; index khớp với `index` trong ExamQuestionResponse. */
    public record Answer(
            @NotNull(message = "index is required")
            Integer index,

            @Size(max = 255, message = "answer must be at most 255 characters")
            String answer
    ) {
    }
}
