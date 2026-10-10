package com.heyganba;

import com.heyganba.domain.learning.LearningActivity;
import com.heyganba.dto.flashcard.FlashcardReviewRequest;
import com.heyganba.model.entity.*;
import com.heyganba.model.enums.RoleName;
import com.heyganba.service.*;
import com.heyganba.service.srs.SrsRating;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.Instant;
import static org.junit.jupiter.api.Assertions.*;

class LearningEvidenceTest extends ContentApiTestBase {
    @Autowired GrammarService grammar;
    @Autowired FlashcardService flashcard;
    @Autowired LearningEvidenceService evidence;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager manager;
    @Autowired ApplicationEventPublisher events;
    User learner;
    GrammarRule rule;
    GrammarExercise exercise;
    Vocabulary word;

    @BeforeEach void setup() {
        var role = roleRepository.save(Role.builder().name(RoleName.ROLE_USER).build());
        learner = userRepository.save(User.builder().email("evidence@example.invalid").fullName("Evidence Test")
                .passwordHash(passwordEncoder.encode("Password123!")).role(role).build());
        // Reuse existing regression fixtures, never seed new curriculum into production.
        rule = persistApprovedRule(GrammarRule.builder().title("N1 は N2 です").structure("N1 は N2 です")
                .explanation("Test fixture").orderIndex(1).build());
        exercise = persistApprovedExercise(GrammarExercise.builder().grammarRule(rule).questionText("わたし __ がくせい です。")
                .optionsJson("[\"は\",\"を\"]").correctAnswer("は").build());
        word = persistApprovedVocabulary(Vocabulary.builder().word("本").reading("ほん").meaning("book").build());
    }
    @Test void committedChecksCaptureTrustedReferencesAndDeriveObservedCounts() {
        grammar.checkAnswer(learner.getId(), exercise.getId(), "は", java.util.UUID.randomUUID());
        grammar.checkAnswer(learner.getId(), exercise.getId(), "を", java.util.UUID.randomUUID());
        var progress = evidence.grammarSkill(learner.getId(), rule.getId());
        assertEquals(2, progress.attemptCount());
        assertEquals(1, progress.correctCount());
        assertNotNull(progress.lastPracticedAt());
        assertEquals(0, evidence.grammarSkill(99999L, rule.getId()).attemptCount());
        assertEquals("grammar-exercise:" + exercise.getId(), jdbc.queryForList("SELECT content_ref FROM learning_attempts", String.class).getFirst());
    }
    @Test void srsPreservesRatingSemanticsWithoutInventingSkillTaxonomy() {
        flashcard.review(learner.getId(), new FlashcardReviewRequest(word.getId(), SrsRating.FORGOT, java.util.UUID.randomUUID()));
        assertEquals("FORGOT", jdbc.queryForObject("SELECT result FROM learning_attempts", String.class));
        assertNull(jdbc.queryForObject("SELECT skill_ref FROM learning_attempts", String.class));
        assertEquals("vocabulary:" + word.getId(), jdbc.queryForObject("SELECT content_ref FROM learning_attempts", String.class));
    }
    @Test void rolledBackAnswersDoNotCreateCompletedEvidence() {
        new TransactionTemplate(manager).executeWithoutResult(status -> {
            grammar.checkAnswer(learner.getId(), exercise.getId(), "は", java.util.UUID.randomUUID());
            status.setRollbackOnly();
        });
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM learning_attempts", Integer.class));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM study_activities", Integer.class));
    }
    @Test void eventIdentityDeduplicatesAndUserDeletionRemovesEvidence() {
        var fact = LearningActivity.grammar(learner.getId(), exercise.getId(), rule.getId(), false, Instant.now());
        new TransactionTemplate(manager).executeWithoutResult(status -> { events.publishEvent(fact); events.publishEvent(fact); });
        assertEquals(1, evidence.grammarSkill(learner.getId(), rule.getId()).attemptCount());
        userRepository.delete(learner);
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM learning_attempts", Integer.class));
    }
}
