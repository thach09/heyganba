package com.heyganba.dto.progress;

import jakarta.validation.constraints.NotBlank;

public record PracticeProgressRequest(
        @NotBlank @jakarta.validation.constraints.Pattern(regexp="PINYIN|HANZI|VOCAB") String targetType, // 'PINYIN', 'HANZI', 'VOCAB'
        @NotBlank @jakarta.validation.constraints.Size(max=50) @com.heyganba.common.validation.PlainText String targetKey,
        Integer scoreDelta,
        Boolean isCorrect
) {}
