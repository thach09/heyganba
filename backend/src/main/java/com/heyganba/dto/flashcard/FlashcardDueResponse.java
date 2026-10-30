package com.heyganba.dto.flashcard;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.heyganba.model.entity.SrsReview;
import com.heyganba.model.entity.Vocabulary;

import java.time.Instant;

/** Một thẻ trong danh sách từ ôn tập / flashcard */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record FlashcardDueResponse(
        Long vocabularyId,
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
        String reading,
        String meaning,
        String sinoVietnamese,
        String exampleSentence,
        String exampleReading,
        String exampleMeaning,
        String lessonSlug,
        boolean isNew,
        int intervalDays,
        int repetitions,
        double easeFactor,
        Instant dueDate
) {
    /** Backward compatibility 14-arg constructor */
    public FlashcardDueResponse(
            Long vocabularyId,
            String word,
            String reading,
            String meaning,
            String sinoVietnamese,
            String exampleSentence,
            String exampleReading,
            String exampleMeaning,
            String lessonSlug,
            boolean isNew,
            int intervalDays,
            int repetitions,
            double easeFactor,
            Instant dueDate
    ) {
        this(
                vocabularyId,
                word,
                null,
                reading,
                null,
                sinoVietnamese,
                null,
                meaning,
                1,
                1,
                exampleSentence,
                exampleReading,
                exampleMeaning,
                reading,
                meaning,
                sinoVietnamese,
                exampleSentence,
                exampleReading,
                exampleMeaning,
                lessonSlug,
                isNew,
                intervalDays,
                repetitions,
                easeFactor,
                dueDate
        );
    }

    public static FlashcardDueResponse fromReview(SrsReview review) {
        Vocabulary v = review.getVocabulary();
        return new FlashcardDueResponse(
                v.getId(),
                v.getWord(),
                v.getTraditional(),
                v.getPinyin() != null ? v.getPinyin() : v.getReading(),
                v.getPinyinNormalized(),
                v.publishedHanViet(),
                v.getPartOfSpeech(),
                v.getMeaningVi() != null ? v.getMeaningVi() : v.getMeaning(),
                v.getHskLevel() != null ? v.getHskLevel() : 1,
                v.getLessonNumber() != null ? v.getLessonNumber() : 1,
                v.publishedExampleSentence(),
                v.publishedExampleReading(),
                v.publishedExampleMeaning(),
                v.getReading(),
                v.getMeaning(),
                v.publishedHanViet(),
                v.publishedExampleSentence(),
                v.publishedExampleReading(),
                v.publishedExampleMeaning(),
                v.getLesson() != null ? v.getLesson().getSlug() : ("hsk1-lesson-" + (v.getLessonNumber() != null ? v.getLessonNumber() : 1)),
                false,
                review.getIntervalDays(),
                review.getRepetitions(),
                review.getEaseFactor(),
                review.getDueDate()
        );
    }

    public static FlashcardDueResponse fromNewVocabulary(Vocabulary v) {
        return new FlashcardDueResponse(
                v.getId(),
                v.getWord(),
                v.getTraditional(),
                v.getPinyin() != null ? v.getPinyin() : v.getReading(),
                v.getPinyinNormalized(),
                v.publishedHanViet(),
                v.getPartOfSpeech(),
                v.getMeaningVi() != null ? v.getMeaningVi() : v.getMeaning(),
                v.getHskLevel() != null ? v.getHskLevel() : 1,
                v.getLessonNumber() != null ? v.getLessonNumber() : 1,
                v.publishedExampleSentence(),
                v.publishedExampleReading(),
                v.publishedExampleMeaning(),
                v.getReading(),
                v.getMeaning(),
                v.publishedHanViet(),
                v.publishedExampleSentence(),
                v.publishedExampleReading(),
                v.publishedExampleMeaning(),
                v.getLesson() != null ? v.getLesson().getSlug() : ("hsk1-lesson-" + (v.getLessonNumber() != null ? v.getLessonNumber() : 1)),
                true,
                0,
                0,
                2.5,
                null
        );
    }
}
