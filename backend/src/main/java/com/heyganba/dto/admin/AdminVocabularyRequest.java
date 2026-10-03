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
    private String word;

    @NotBlank(message = "Cách đọc (hiragana/katakana) là bắt buộc")
    private String reading;

    @NotBlank(message = "Ý nghĩa là bắt buộc")
    private String meaning;

    private String sinoVietnamese;
    private String exampleSentence;
    private String exampleReading;
    private String exampleMeaning;
    private String lessonSlug;
}
