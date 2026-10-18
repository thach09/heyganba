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
    @NotBlank(message = "Chữ Hán là bắt buộc")
    @jakarta.validation.constraints.Size(max=10)
    private String character;

    @NotNull(message = "Số nét là bắt buộc")
    @Min(value = 1, message = "Số nét phải tối thiểu là 1")
    private Integer strokeCount;

    @jakarta.validation.constraints.Size(max=50)
    @jakarta.validation.constraints.Size(max=100)
    private String pinyin;
    @jakarta.validation.constraints.Size(max=10)
    @jakarta.validation.constraints.Size(max=10)
    private String traditional;
    @jakarta.validation.constraints.Size(max=100)
    private String sinoVietnamese;

    @NotBlank(message = "Ý nghĩa là bắt buộc")
    @jakarta.validation.constraints.Size(max=10000)
    private String meaning;

    @jakarta.validation.constraints.Size(max=2000)
    private String mnemonic;
    @jakarta.validation.constraints.Size(max=50)
    private String lessonSlug;
}
