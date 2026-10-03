package com.heyganba.dto.notebook;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record NotebookPracticeResultRequest(
        @NotNull(message = "Số câu đúng là bắt buộc")
        @Min(value = 0, message = "Số câu đúng không được âm")
        Integer correctCount,

        @NotNull(message = "Tổng số câu là bắt buộc")
        @Min(value = 1, message = "Tổng số câu phải từ 1 trở lên")
        Integer totalCount
) {
}
