package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.common.exception.BadRequestException;
import com.heyganba.config.UserPrincipal;
import com.heyganba.dto.flashcard.FlashcardReviewRequest;
import com.heyganba.model.entity.*;
import com.heyganba.model.enums.RoleName;
import com.heyganba.repository.LearningMutationReceiptRepository;
import com.heyganba.service.*;
import com.heyganba.service.srs.SrsRating;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

/** Real committed transactions: discard the first result, then replay the identical logical action. */
class LearningMutationRetryTest extends ContentApiTestBase {
    @Autowired GrammarService grammar;
    @Autowired FlashcardService flashcard;
    @Autowired ExpService exp;
    @Autowired StudyActivityService activity;
    @Autowired LearningMutationReceiptRepository receipts;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager manager;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    User learner;
    User other;
    GrammarExercise exercise;
    Vocabulary word;
    Vocabulary nextWord;

    @BeforeEach void fixtures() {
        var role = roleRepository.save(Role.builder().name(RoleName.ROLE_USER).build());
        learner = user(role, "retry-a@example.invalid");
        other = user(role, "retry-b@example.invalid");
        // Reuse the existing LearningEvidenceTest/FlashcardApiTest fixtures.
        var rule = persistApprovedRule(GrammarRule.builder().title("N1 は N2 です").structure("N1 は N2 です")
                .explanation("Test fixture").orderIndex(1).build());
        exercise = persistApprovedExercise(GrammarExercise.builder().grammarRule(rule).questionText("わたし __ がくせい です。")
                .optionsJson("[\"は\",\"を\"]").correctAnswer("は").build());
        word = persistApprovedVocabulary(Vocabulary.builder().word("本").reading("ほん").meaning("book").build());
        nextWord = persistApprovedVocabulary(Vocabulary.builder().word("車").reading("くるま").meaning("xe hơi").build());
    }

    private User user(Role role, String email) {
        return userRepository.save(User.builder().email(email).fullName("Mutation Retry Test")
                .passwordHash(passwordEncoder.encode("Password123!")).role(role).build());
    }

    private long items(User user, String source) {
        return jdbc.queryForObject("SELECT COALESCE(sum(item_count),0) FROM study_activities WHERE user_id=? AND source=?",
                Long.class, user.getId(), source);
    }

    private Map<String, Object> schedule() {
        return jdbc.queryForMap("SELECT repetitions,interval_days,ease_factor,due_date,last_reviewed_at,updated_at "
                + "FROM srs_reviews WHERE user_id=? AND vocabulary_id=?", learner.getId(), word.getId());
    }

    private String token(User user) { return jwtTokenProvider.generateAccessToken(UserPrincipal.create(user)); }
    private String grammarBody(UUID id, String answer) throws Exception {
        return mapper.writeValueAsString(Map.of("attemptId", id, "userAnswer", answer));
    }
    private String reviewBody(UUID id, Vocabulary target, SrsRating rating) throws Exception {
        return mapper.writeValueAsString(new FlashcardReviewRequest(target.getId(), rating, id));
    }
    private String check(String body) throws Exception {
        var response = mvc.perform(post("/grammar/exercises/" + exercise.getId() + "/check")
                        .header("Authorization", "Bearer " + token(learner)).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true))
                .andReturn().getResponse().getContentAsString();
        // ApiResponse.timestamp describes each HTTP response; the complete typed result must replay exactly.
        return mapper.readTree(response).get("data").toString();
    }
    private String review(String body) throws Exception {
        var response = mvc.perform(post("/flashcard/review").header("Authorization", "Bearer " + token(learner))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true))
                .andReturn().getResponse().getContentAsString();
        return mapper.readTree(response).get("data").toString();
    }

    @Test void grammarCommitLostResponseRetryReturnsOriginalResultOnce() throws Exception {
        var body = grammarBody(UUID.randomUUID(), "は");
        String lostResponse = check(body); // The client does not receive this committed response.
        assertEquals(1, items(learner, "GRAMMAR"));
        assertEquals(mapper.readTree(lostResponse), mapper.readTree(check(body)));
        assertEquals(1, items(learner, "GRAMMAR"));
        assertEquals(1, receipts.count());
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM learning_attempts WHERE user_id=?", Long.class, learner.getId()));
        assertEquals(10, exp.calculateUserExp(learner.getId()).totalExp());
        check(grammarBody(UUID.randomUUID(), "は"));
        assertEquals(2, items(learner, "GRAMMAR"));
    }

    @Test void srsCommitLostResponseRetryPreservesStateAndReplaysOldOutcome() throws Exception {
        var body = reviewBody(UUID.randomUUID(), word, SrsRating.GOOD);
        String lostResponse = review(body);
        var firstState = schedule();
        assertEquals(mapper.readTree(lostResponse), mapper.readTree(review(body)));
        assertEquals(firstState, schedule());
        assertEquals(1, items(learner, "FLASHCARD"));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM learning_attempts WHERE user_id=?", Long.class, learner.getId()));
        review(reviewBody(UUID.randomUUID(), word, SrsRating.GOOD));
        var nextState = schedule();
        assertNotEquals(firstState, nextState);
        assertEquals(mapper.readTree(lostResponse), mapper.readTree(review(body)));
        assertEquals(nextState, schedule());
        assertEquals(2, items(learner, "FLASHCARD"));
        review(reviewBody(UUID.randomUUID(), nextWord, SrsRating.FORGOT));
        assertEquals(3, items(learner, "FLASHCARD"));
        assertEquals(2, srsReviewRepository.countByUserId(learner.getId()));
    }

    @Test void keyReuseCannotChangeTheAnswerRatingOrContent() {
        var grammarId = UUID.randomUUID();
        grammar.checkAnswer(learner.getId(), exercise.getId(), "は", grammarId);
        assertThrows(BadRequestException.class, () -> grammar.checkAnswer(learner.getId(), exercise.getId(), "を", grammarId));
        var srsId = UUID.randomUUID();
        flashcard.review(learner.getId(), new FlashcardReviewRequest(word.getId(), SrsRating.GOOD, srsId));
        assertThrows(BadRequestException.class, () -> flashcard.review(learner.getId(), new FlashcardReviewRequest(word.getId(), SrsRating.HARD, srsId)));
        assertThrows(BadRequestException.class, () -> flashcard.review(learner.getId(), new FlashcardReviewRequest(nextWord.getId(), SrsRating.GOOD, srsId)));
        assertEquals(1, items(learner, "GRAMMAR")); assertEquals(1, items(learner, "FLASHCARD"));
    }

    @Test void attemptIdentityIsScopedByLearnerAndOperationAndDeletedWithLearner() {
        var id = UUID.randomUUID();
        grammar.checkAnswer(learner.getId(), exercise.getId(), "は", id);
        grammar.checkAnswer(other.getId(), exercise.getId(), "を", id);
        flashcard.review(learner.getId(), new FlashcardReviewRequest(word.getId(), SrsRating.GOOD, id));
        assertEquals(1, items(learner, "GRAMMAR")); assertEquals(1, items(other, "GRAMMAR"));
        assertEquals(1, items(learner, "FLASHCARD")); assertEquals(0, items(other, "FLASHCARD"));
        assertEquals(3, receipts.count());
        jdbc.update("DELETE FROM study_activities WHERE user_id=?", learner.getId());
        jdbc.update("DELETE FROM srs_reviews WHERE user_id=?", learner.getId());
        userRepository.deleteById(learner.getId());
        assertEquals(1, receipts.count());
    }

    @Test void rolledBackMutationsLeaveNeitherEffectsNorReceiptsAndCanRetry() {
        var grammarId = UUID.randomUUID(); var srsId = UUID.randomUUID();
        new TransactionTemplate(manager).executeWithoutResult(status -> {
            grammar.checkAnswer(learner.getId(), exercise.getId(), "は", grammarId);
            flashcard.review(learner.getId(), new FlashcardReviewRequest(word.getId(), SrsRating.GOOD, srsId));
            status.setRollbackOnly();
        });
        assertEquals(0, receipts.count()); assertEquals(0, studyActivityRepository.count());
        assertEquals(0, srsReviewRepository.count());
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM learning_attempts", Long.class));
        grammar.checkAnswer(learner.getId(), exercise.getId(), "は", grammarId);
        flashcard.review(learner.getId(), new FlashcardReviewRequest(word.getId(), SrsRating.GOOD, srsId));
        assertEquals(2, receipts.count()); assertEquals(1, items(learner, "GRAMMAR")); assertEquals(1, items(learner, "FLASHCARD"));
    }

    private void concurrentRetry(Callable<?> mutation) throws Exception {
        var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            Callable<?> call = () -> { assertTrue(start.await(5, TimeUnit.SECONDS)); return mutation.call(); };
            var first = pool.submit(call); var second = pool.submit(call); start.countDown();
            assertEquals(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS));
        }
    }

    @Test void concurrentRetriesSerializeIntoOneEffectForEachModule() throws Exception {
        var grammarId = UUID.randomUUID(); var srsId = UUID.randomUUID();
        concurrentRetry(() -> grammar.checkAnswer(learner.getId(), exercise.getId(), "は", grammarId));
        concurrentRetry(() -> flashcard.review(learner.getId(), new FlashcardReviewRequest(word.getId(), SrsRating.GOOD, srsId)));
        assertEquals(1, items(learner, "GRAMMAR")); assertEquals(1, items(learner, "FLASHCARD"));
        assertEquals(1, schedule().get("repetitions")); assertEquals(2, receipts.count());
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM learning_attempts", Long.class));
    }

    @Test void retriesDoNotDuplicateStreakQualificationOrExpAtThresholds() {
        for (int i = 0; i < 9; i++) {
            grammar.checkAnswer(learner.getId(), exercise.getId(), "は", UUID.randomUUID());
            flashcard.review(learner.getId(), new FlashcardReviewRequest(word.getId(), SrsRating.GOOD, UUID.randomUUID()));
        }
        var grammarId = UUID.randomUUID(); var srsId = UUID.randomUUID();
        grammar.checkAnswer(learner.getId(), exercise.getId(), "は", grammarId);
        flashcard.review(learner.getId(), new FlashcardReviewRequest(word.getId(), SrsRating.GOOD, srsId));
        var streak = activity.getStreak(learner.getId());
        long totalExp = exp.calculateUserExp(learner.getId()).totalExp();
        grammar.checkAnswer(learner.getId(), exercise.getId(), "は", grammarId);
        flashcard.review(learner.getId(), new FlashcardReviewRequest(word.getId(), SrsRating.GOOD, srsId));
        assertEquals(10, items(learner, "GRAMMAR")); assertEquals(10, items(learner, "FLASHCARD"));
        assertEquals(1, streak.currentStreak()); assertEquals(streak, activity.getStreak(learner.getId()));
        assertEquals(150, totalExp); assertEquals(totalExp, exp.calculateUserExp(learner.getId()).totalExp());
    }

    @Test void apiRequiresValidAttemptIdsAndKeepsAnonymousBoundary() throws Exception {
        for (String attempt : new String[]{"", ",\"attemptId\":\"invalid\""}) {
            mvc.perform(post("/grammar/exercises/" + exercise.getId() + "/check").header("Authorization", "Bearer " + token(learner))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"userAnswer\":\"は\"" + attempt + "}"))
                    .andExpect(status().isBadRequest());
            mvc.perform(post("/flashcard/review").header("Authorization", "Bearer " + token(learner))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"vocabularyId\":" + word.getId() + ",\"rating\":\"GOOD\"" + attempt + "}"))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(post("/grammar/exercises/" + exercise.getId() + "/check").contentType(MediaType.APPLICATION_JSON)
                        .content(grammarBody(UUID.randomUUID(), "は"))).andExpect(status().isUnauthorized());
        mvc.perform(post("/flashcard/review").contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(UUID.randomUUID(), word, SrsRating.GOOD))).andExpect(status().isUnauthorized());
        assertEquals(0, receipts.count()); assertEquals(0, studyActivityRepository.count());
    }
}
