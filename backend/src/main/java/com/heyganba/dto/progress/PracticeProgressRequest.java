package com.heyganba.dto.progress;

import jakarta.validation.constraints.NotBlank;

public record PracticeProgressRequest(
        @NotBlank String targetType, // 'PINYIN', 'HANZI', 'VOCAB'
        @NotBlank String targetKey,
        Integer scoreDelta,
        Boolean isCorrect
) {}
