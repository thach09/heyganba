package com.heyganba.dto.admin;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminVocabularyRequest {
    @NotBlank(message = "Từ vựng là bắt buộc")
    @jakarta.validation.constraints.Size(max=50)
    private String word;

    @NotBlank(message = "Cách đọc (hiragana/katakana) là bắt buộc")
    @jakarta.validation.constraints.Size(max=100)
    private String reading;

    @NotBlank(message = "Ý nghĩa là bắt buộc")
    @jakarta.validation.constraints.Size(max=10000)
    private String meaning;

    @jakarta.validation.constraints.Size(max=100)
    private String sinoVietnamese;
    @jakarta.validation.constraints.Size(max=2000)
    private String exampleSentence;
    @jakarta.validation.constraints.Size(max=2000)
    private String exampleReading;
    @jakarta.validation.constraints.Size(max=2000)
    private String exampleMeaning;
    @jakarta.validation.constraints.Size(max=50)
    private String lessonSlug;
}
