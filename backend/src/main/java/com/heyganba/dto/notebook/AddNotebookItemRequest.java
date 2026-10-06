package com.heyganba.dto.notebook;

import jakarta.validation.constraints.NotNull;

public record AddNotebookItemRequest(
        @NotNull(message = "ID từ vựng là bắt buộc")
        Long vocabularyId,
        @jakarta.validation.constraints.Size(max = 2000) String customNote
) {
}
