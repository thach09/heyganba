package com.heyganba.dto.admin;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminKanjiRequest {
    @NotBlank(message = "Chữ Kanji là bắt buộc")
    private String character;

    @NotNull(message = "Số nét là bắt buộc")
    @Min(value = 1, message = "Số nét phải tối thiểu là 1")
    private Integer strokeCount;

    private String onyomi;
    private String kunyomi;
    private String sinoVietnamese;

    @NotBlank(message = "Ý nghĩa là bắt buộc")
    private String meaning;

    private String mnemonic;
    private String lessonSlug;
}
