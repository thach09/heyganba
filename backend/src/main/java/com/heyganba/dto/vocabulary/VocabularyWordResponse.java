package com.heyganba.dto.vocabulary;

import com.heyganba.model.entity.Vocabulary;

public record VocabularyWordResponse(
        Long id,
        String word,
        String traditional,
        String pinyin,
        String pinyinNormalized,
        String hanViet,
        String partOfSpeech,
        String meaningVi,
        Integer hskLevel,
        Integer lessonNumber,
        String exampleZh,
        String examplePinyin,
        String exampleVi,
        String audioUrl,
        String reviewStatus,
        String lessonSlug,
        String lessonTitle
) {
    public static VocabularyWordResponse from(Vocabulary v) {
        return new VocabularyWordResponse(
                v.getId(),
                v.getWord(),
                v.getTraditional(),
                v.getPinyin() != null ? v.getPinyin() : v.getReading(),
                v.getPinyinNormalized(),
                v.publishedHanViet(),
                v.getPartOfSpeech(),
                v.getMeaningVi() != null ? v.getMeaningVi() : v.getMeaning(),
                v.getHskLevel(),
                v.getLessonNumber(),
                v.publishedExampleSentence(),
                v.publishedExampleReading(),
                v.publishedExampleMeaning(),
                v.getAudioUrl(),
                v.getReviewStatus() != null ? v.getReviewStatus().name() : "PENDING_REVIEW",
                v.getLesson() != null ? v.getLesson().getSlug() : null,
                v.getLesson() != null ? v.getLesson().getTitle() : null
        );
    }
}
