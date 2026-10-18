package com.heyganba;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.config.UserPrincipal;
import com.heyganba.model.entity.*;
import com.heyganba.model.enums.*;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class LearningInsightsApiTest extends ContentApiTestBase {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired com.heyganba.service.StreakService streak;
    User user; String token;
    @BeforeEach void seed() {
        var role=roleRepository.save(Role.builder().name(RoleName.ROLE_USER).build());
        user=userRepository.save(User.builder().email("insights@test.example").fullName("Học viên").passwordHash("unused").role(role).isActive(true).build());
        token=jwtTokenProvider.generateAccessToken(UserPrincipal.create(user));
    }
    @Test void sixLevelsCountDistinctApprovedWordsAndActualReviews() throws Exception {
        var word=persistApprovedVocabulary(Vocabulary.builder().word("学习").pinyin("xuéxí").meaningVi("học").hskLevel(3).build());
        persistApprovedVocabulary(Vocabulary.builder().word("学习").pinyin("xuéxí").meaningVi("học").hskLevel(3).build());
        vocabularyRepository.save(Vocabulary.builder().word("草稿").hskLevel(3).build());
        srsReviewRepository.save(SrsReview.builder().user(user).vocabulary(word).repetitions(1).dueDate(Instant.now()).build());
        mvc.perform(get("/progress/insights").header("Authorization","Bearer "+token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.levels.length()").value(6)).andExpect(jsonPath("$.data.levels[2].totalWords").value(1)).andExpect(jsonPath("$.data.levels[2].learnedWords").value(1));
    }
    @Test void questsRequireEvidenceAndCannotDoubleAward() throws Exception {
        mvc.perform(post("/progress/quests/SRS/claim").header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
        studyActivityRepository.save(StudyActivity.builder().user(user).activityDate(streak.today(Instant.now())).source("FLASHCARD").itemCount(10).correctCount(8).build());
        for (int i=0;i<2;i++) mvc.perform(post("/progress/quests/SRS/claim").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.data.wallet.bamboo").value(8));
        assertThat(questClaimRepository.findByUserId(user.getId())).hasSize(1);
        mvc.perform(get("/exp").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.data.totalExp").value(80));
        mvc.perform(post("/progress/companion/feed").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.data.bamboo").value(7)).andExpect(jsonPath("$.data.affectionExp").value(25));
    }
    @Test void yesterdayDoesNotCompleteTodayAndWalletIsPrivate() throws Exception {
        studyActivityRepository.save(StudyActivity.builder().user(user).activityDate(streak.today(Instant.now()).minusDays(1)).source("FLASHCARD").itemCount(100).correctCount(100).build());
        mvc.perform(post("/progress/quests/SRS/claim").header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
        mvc.perform(get("/progress/insights")).andExpect(status().isUnauthorized());
    }
    @Test void sentenceOrderIsServerGradedAndReplayDoesNotRecordTwice() throws Exception {
        var rule=persistApprovedRule(GrammarRule.builder().title("Câu phán đoán").structure("A 是 B").explanation("Câu mẫu").orderIndex(1).hskLevel(1).build());
        var exercise=persistApprovedExercise(GrammarExercise.builder().grammarRule(rule).exerciseType("SENTENCE_ORDER").questionText("Sắp câu mẫu").optionsJson("[\"我\",\"是\",\"学生\",\"。\"]").correctAnswer("我是学生。").build());
        mvc.perform(get("/grammar/exercises").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.data[0].exerciseType").value("SENTENCE_ORDER")).andExpect(jsonPath("$.data[0].correctAnswer").doesNotExist());
        String body=json.writeValueAsString(Map.of("userAnswer","我 是 学生。","attemptId",UUID.randomUUID()));
        for(int i=0;i<2;i++) mvc.perform(post("/grammar/exercises/"+exercise.getId()+"/check").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk()).andExpect(jsonPath("$.data.correct").value(true));
        assertThat(studyActivityRepository.findByUserId(user.getId()).stream().mapToInt(StudyActivity::getItemCount).sum()).isEqualTo(1);
    }
    @Test void wrongPracticeCannotRequestExpOrMasteryDelta() throws Exception {
        mvc.perform(post("/progress/practice").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"targetType\":\"HANZI\",\"targetKey\":\"学\",\"scoreDelta\":100,\"isCorrect\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.expAwarded").value(0)).andExpect(jsonPath("$.data.masteryScore").value(0)).andExpect(jsonPath("$.data.totalExp").value(0));
        String body=mvc.perform(get("/progress/mastery").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.data[0].user").doesNotExist()).andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("passwordHash","twoFactorSecret","tokenVersion","insights@test.example");
    }
}
