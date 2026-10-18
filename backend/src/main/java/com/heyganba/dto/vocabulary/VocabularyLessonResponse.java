package com.heyganba.dto.vocabulary;

public record VocabularyLessonResponse(
        Long id,
        String slug,
        String title,
        String description,
        String curriculumLevel,
        Integer orderIndex,
        int wordCount
) {
}
