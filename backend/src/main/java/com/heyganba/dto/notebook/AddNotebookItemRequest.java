package com.heyganba.dto.notebook;

import jakarta.validation.constraints.NotNull;

public record AddNotebookItemRequest(
        @NotNull(message = "ID từ vựng là bắt buộc")
        Long vocabularyId,
        @com.heyganba.common.validation.PlainText @jakarta.validation.constraints.Size(max = 2000) String customNote
) {
}
