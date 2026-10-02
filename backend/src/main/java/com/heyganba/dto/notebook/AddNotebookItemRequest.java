package com.heyganba.dto.notebook;

import jakarta.validation.constraints.NotNull;

public record AddNotebookItemRequest(
        @NotNull(message = "ID từ vựng là bắt buộc")
        Long vocabularyId,
        String customNote
) {
}
