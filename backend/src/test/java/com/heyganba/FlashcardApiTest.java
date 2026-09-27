package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.dto.auth.RegisterRequest;
import com.heyganba.model.entity.Lesson;
import com.heyganba.model.entity.Role;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.model.enums.RoleName;
import com.heyganba.repository.LessonRepository;
import com.heyganba.repository.RoleRepository;
import com.heyganba.repository.SrsReviewRepository;
import com.heyganba.repository.StreakRepository;
import com.heyganba.repository.UserRepository;
import com.heyganba.repository.VocabularyRepository;
import com.heyganba.service.srs.SrsDueCache;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 2 — API flashcard/SRS: danh sách từ cần ôn, chấm điểm ôn tập (SM-2),
 * thống kê + streak, và cách ly dữ liệu giữa các user.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FlashcardApiTest extends com.heyganba.support.ContentApiTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private VocabularyRepository vocabularyRepository;

    @Autowired
    private com.heyganba.repository.KanjiRepository kanjiRepository;

    @Autowired
    private com.heyganba.repository.KanjiPracticeProgressRepository kanjiProgressRepository;

    @Autowired
    private com.heyganba.repository.RadicalRepository radicalRepository;

    @Autowired
    private SrsReviewRepository srsReviewRepository;

    @Autowired
    private StreakRepository streakRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private SrsDueCache srsDueCache;

    private Vocabulary wordBook;

    @BeforeEach
    void setUp() {
        srsDueCache.clearAll();
        // Xoá theo đúng thứ tự phụ thuộc khoá ngoại để test class chạy độc lập, không phụ thuộc thứ tự Surefire.
        kanjiProgressRepository.deleteAll();
        kanjiRepository.deleteAll();
        radicalRepository.deleteAll();
        srsReviewRepository.deleteAll();
        streakRepository.deleteAll();
        vocabularyRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();
        lessonRepository.deleteAll();

        roleRepository.save(Role.builder().name(RoleName.ROLE_ADMIN).description("Admin").build());
        roleRepository.save(Role.builder().name(RoleName.ROLE_USER).description("User").build());

        Lesson lesson = lessonRepository.save(Lesson.builder()
                .slug("jpd113-b1")
                .title("Bài 1 — Chào hỏi")
                .curriculumLevel("JPD113")
                .orderIndex(1)
                .build());

        wordBook = persistApprovedVocabulary(Vocabulary.builder()
                .word("本")
                .reading("ほん")
                .meaning("sách")
                .sinoVietnamese("本")
                .exampleSentence("これは本です。")
                .exampleReading("kore wa hon desu")
                .exampleMeaning("Đây là quyển sách.")
                .lesson(lesson)
                .build());

        persistApprovedVocabulary(Vocabulary.builder()
                .word("車")
                .reading("くるま")
                .meaning("xe hơi")
                .lesson(lesson)
                .build());
    }

    private String registerAndGetToken(String email) throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email(email)
                .password("Password123!")
                .fullName("Flashcard Tester")
                .build();

        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("accessToken").asText();
    }

    private String reviewBody(long vocabularyId, String rating) {
        return "{\"vocabularyId\":" + vocabularyId + ",\"rating\":\"" + rating + "\"}";
    }

    @Test
    @DisplayName("User mới: due-today trả về từ mới (isNew = true) theo đúng newLimit")
    void dueTodayReturnsNewWords() throws Exception {
        String token = registerAndGetToken("flash.new@heyganba.vn");

        mockMvc.perform(get("/flashcard/due-today").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].word", is("本")))
                .andExpect(jsonPath("$.data[0].isNew", is(true)))
                .andExpect(jsonPath("$.data[0].meaning", is("sách")));

        mockMvc.perform(get("/flashcard/due-today")
                        .param("newLimit", "1")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)));
    }

    @Test
    @DisplayName("Ôn tập: interval tăng dần 1 → 6 → 16 ngày; 1 lượt ôn CHƯA đủ điều kiện tính streak")
    void reviewAppliesSm2Progression() throws Exception {
        String token = registerAndGetToken("flash.progress@heyganba.vn");
        long vocabularyId = wordBook.getId();

        mockMvc.perform(post("/flashcard/review")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(vocabularyId, "GOOD")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.intervalDays", is(1)))
                .andExpect(jsonPath("$.data.repetitions", is(1)))
                .andExpect(jsonPath("$.data.lapse", is(false)))
                // Streak chỉ tính khi đạt ngưỡng trong ngày (≥10 lượt ôn) — 1 lượt thì streak vẫn 0.
                .andExpect(jsonPath("$.data.currentStreak", is(0)));

        mockMvc.perform(post("/flashcard/review")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(vocabularyId, "good")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.intervalDays", is(6)))
                .andExpect(jsonPath("$.data.repetitions", is(2)));

        mockMvc.perform(post("/flashcard/review")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(vocabularyId, "EASY")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.repetitions", is(3)))
                .andExpect(jsonPath("$.data.intervalDays", is(16)));
    }

    @Test
    @DisplayName("Đánh giá Quên: reset chu kỳ về repetitions = 0, ôn lại sau 1 ngày")
    void forgotResetsSchedule() throws Exception {
        String token = registerAndGetToken("flash.forgot@heyganba.vn");

        mockMvc.perform(post("/flashcard/review")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(wordBook.getId(), "GOOD")))
                .andExpect(status().isOk());

        mockMvc.perform(post("/flashcard/review")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(wordBook.getId(), "FORGOT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.lapse", is(true)))
                .andExpect(jsonPath("$.data.repetitions", is(0)))
                .andExpect(jsonPath("$.data.intervalDays", is(1)));
    }

    @Test
    @DisplayName("Sau khi ôn, từ không còn nằm trong danh sách due-today (cache bị invalidate)")
    void reviewedWordLeavesDueList() throws Exception {
        String token = registerAndGetToken("flash.cache@heyganba.vn");

        mockMvc.perform(get("/flashcard/due-today").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data", hasSize(2)));

        mockMvc.perform(post("/flashcard/review")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(wordBook.getId(), "GOOD")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/flashcard/due-today")
                        .param("newLimit", "0")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    @DisplayName("Dữ liệu ôn tập tách biệt giữa các user")
    void reviewIsIsolatedPerUser() throws Exception {
        String tokenA = registerAndGetToken("flash.a@heyganba.vn");
        String tokenB = registerAndGetToken("flash.b@heyganba.vn");

        mockMvc.perform(post("/flashcard/review")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(wordBook.getId(), "GOOD")))
                .andExpect(status().isOk());

        // User B vẫn thấy 本 là từ mới và chưa học từ nào
        mockMvc.perform(get("/flashcard/due-today").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].isNew", is(true)));

        mockMvc.perform(get("/flashcard/stats").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.learnedWords", is(0)))
                .andExpect(jsonPath("$.data.currentStreak", is(0)));
    }

    @Test
    @DisplayName("Streak chỉ tính khi đủ ngưỡng: lượt ôn thứ 10 trong ngày mới mở streak")
    void streakRequiresDailyThreshold() throws Exception {
        String token = registerAndGetToken("flash.threshold@heyganba.vn");
        long vocabularyId = wordBook.getId();

        for (int attempt = 1; attempt <= 10; attempt += 1) {
            int expectedStreak = attempt >= 10 ? 1 : 0;
            mockMvc.perform(post("/flashcard/review")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(reviewBody(vocabularyId, "GOOD")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.currentStreak", is(expectedStreak)));
        }

        mockMvc.perform(get("/streak").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentStreak", is(1)))
                .andExpect(jsonPath("$.data.todaySrsReviews", is(10)))
                .andExpect(jsonPath("$.data.minSrsReviewsForStreak", is(10)))
                .andExpect(jsonPath("$.data.todayQualified", is(true)));
    }

    @Test
    @DisplayName("Stats phản ánh đúng tiến độ: đã học, từ mới còn lại, từ đến hạn")
    void statsReflectProgress() throws Exception {
        String token = registerAndGetToken("flash.stats@heyganba.vn");

        mockMvc.perform(get("/flashcard/stats").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.learnedWords", is(0)))
                .andExpect(jsonPath("$.data.availableNewWords", is(2)));

        mockMvc.perform(post("/flashcard/review")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(wordBook.getId(), "GOOD")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/flashcard/stats").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.learnedWords", is(1)))
                .andExpect(jsonPath("$.data.availableNewWords", is(1)))
                .andExpect(jsonPath("$.data.dueToday", is(0)))
                // Chỉ 1 lượt ôn trong ngày → chưa đủ ngưỡng streak nên vẫn 0 (xem StreakPolicy).
                .andExpect(jsonPath("$.data.currentStreak", is(0)))
                .andExpect(jsonPath("$.data.longestStreak", is(0)));
    }

    @Test
    @DisplayName("Validate: rating sai/null trả 400, vocabularyId không tồn tại trả 404")
    void validationAndNotFound() throws Exception {
        String token = registerAndGetToken("flash.invalid@heyganba.vn");

        mockMvc.perform(post("/flashcard/review")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(wordBook.getId(), "SOMETHING")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)));

        mockMvc.perform(post("/flashcard/review")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vocabularyId\":null,\"rating\":null}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.vocabularyId").exists())
                .andExpect(jsonPath("$.error.rating").exists());

        mockMvc.perform(post("/flashcard/review")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(999999L, "GOOD")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", is("NOT_FOUND")));
    }

    @Test
    @DisplayName("Anonymous không gọi được API flashcard (401)")
    void anonymousIsRejected() throws Exception {
        mockMvc.perform(get("/flashcard/due-today"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/flashcard/stats"))
                .andExpect(status().isUnauthorized());
    }
}
