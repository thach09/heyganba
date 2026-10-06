package com.heyganba.dto.notebook;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateNotebookRequest(
        @NotBlank(message = "Tên sổ từ vựng là bắt buộc")
        @Size(max = 200) String title,
        @Size(max = 2000) String description
) {
}
