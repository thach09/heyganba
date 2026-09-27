package com.heyganba.dto.flashcard;

import com.heyganba.model.entity.SrsReview;
import com.heyganba.model.entity.Vocabulary;

import java.time.Instant;

/** Một thẻ trong danh sách "từ cần ôn hôm nay" (kèm trạng thái SRS để UI hiển thị tiến độ ẩn). */
public record FlashcardDueResponse(
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
    public static FlashcardDueResponse fromReview(SrsReview review) {
        Vocabulary vocabulary = review.getVocabulary();
        return new FlashcardDueResponse(
                vocabulary.getId(),
                vocabulary.getWord(),
                vocabulary.getReading(),
                vocabulary.getMeaning(),
                vocabulary.getSinoVietnamese(),
                vocabulary.getExampleSentence(),
                vocabulary.getExampleReading(),
                vocabulary.getExampleMeaning(),
                vocabulary.getLesson() != null ? vocabulary.getLesson().getSlug() : null,
                false,
                review.getIntervalDays(),
                review.getRepetitions(),
                review.getEaseFactor(),
                review.getDueDate()
        );
    }

    public static FlashcardDueResponse fromNewVocabulary(Vocabulary vocabulary) {
        return new FlashcardDueResponse(
                vocabulary.getId(),
                vocabulary.getWord(),
                vocabulary.getReading(),
                vocabulary.getMeaning(),
                vocabulary.getSinoVietnamese(),
                vocabulary.getExampleSentence(),
                vocabulary.getExampleReading(),
                vocabulary.getExampleMeaning(),
                vocabulary.getLesson() != null ? vocabulary.getLesson().getSlug() : null,
                true,
                0,
                0,
                2.5,
                null
        );
    }
}
