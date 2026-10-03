package com.heyganba.dto.notebook;

import jakarta.validation.constraints.NotBlank;

public record CreateNotebookRequest(
        @NotBlank(message = "Tên sổ từ vựng là bắt buộc")
        String title,
        String description
) {
}
