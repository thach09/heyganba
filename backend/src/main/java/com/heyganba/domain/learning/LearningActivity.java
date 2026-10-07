package com.heyganba.domain.learning;

import java.time.Instant;
import java.util.UUID;

/** Version 1 facts, no raw learner answer or academic taxonomy. */
public record LearningActivity(UUID id, Long learnerId, Type activityType, String contentRef,
                               String skillRef, Result result, Instant occurredAt, Module module) {
    public enum Type { SRS_REVIEW, GRAMMAR_ANSWER }
    public enum Result { RECALLED, FORGOT, CORRECT, INCORRECT }
    public enum Module { SRS, GRAMMAR }

    public static LearningActivity grammar(Long learner, Long exercise, Long rule, boolean correct, Instant at) {
        return new LearningActivity(UUID.randomUUID(), learner, Type.GRAMMAR_ANSWER,
                "grammar-exercise:" + exercise, "grammar-rule:" + rule,
                correct ? Result.CORRECT : Result.INCORRECT, at, Module.GRAMMAR);
    }
    public static LearningActivity srs(Long learner, Long vocabulary, boolean recalled, Instant at) {
        return new LearningActivity(UUID.randomUUID(), learner, Type.SRS_REVIEW,
                "vocabulary:" + vocabulary, null, recalled ? Result.RECALLED : Result.FORGOT, at, Module.SRS);
    }
}
