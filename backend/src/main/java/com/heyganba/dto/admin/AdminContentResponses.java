package com.heyganba.dto.admin;

import com.heyganba.model.entity.*;
import com.heyganba.model.enums.ReviewStatus;

/** Scalar snapshots: never serialize lazy JPA associations from admin CRUD responses. */
public final class AdminContentResponses {
    private AdminContentResponses() {}
    private static String status(ReviewStatus value) { return value == null ? "PENDING_REVIEW" : value.name(); }

    public record VocabularyItem(Long id, String word, String reading, String meaning, String sinoVietnamese,
            String exampleSentence, String exampleReading, String exampleMeaning, String pinyin,
            String meaningVi, String reviewStatus) {
        public static VocabularyItem from(Vocabulary v) {
            return new VocabularyItem(v.getId(),v.getWord(),v.getReading(),v.getMeaning(),v.getSinoVietnamese(),
                    v.getExampleSentence(),v.getExampleReading(),v.getExampleMeaning(),v.getPinyin(),v.getMeaningVi(),status(v.getReviewStatus()));
        }
    }
    public record HanziItem(Long id, String character, Integer strokeCount, String pinyin, String traditional,
            String sinoVietnamese, String meaning, String mnemonic, String reviewStatus) {
        public static HanziItem from(Kanji v) {
            return new HanziItem(v.getId(),v.getCharacter(),v.getStrokeCount(),v.getPinyin(),v.getTraditional(),
                    v.getSinoVietnamese(),v.getMeaning(),v.getMnemonic(),status(v.getReviewStatus()));
        }
    }
    public record ExerciseItem(Long id, Long grammarRuleId, String questionText, String optionsJson,
            String correctAnswer, String explanation, Boolean isCommonMistake, String mistakeCategory, String reviewStatus) {
        public static ExerciseItem from(GrammarExercise v) {
            return new ExerciseItem(v.getId(),v.getGrammarRule() == null ? null : v.getGrammarRule().getId(),
                    v.getQuestionText(),v.getOptionsJson(),v.getCorrectAnswer(),v.getExplanation(),
                    v.getIsCommonMistake(),v.getMistakeCategory(),status(v.getReviewStatus()));
        }
    }
}
