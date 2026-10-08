package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.dto.auth.RegisterRequest;
import com.heyganba.model.entity.GrammarExercise;
import com.heyganba.model.entity.GrammarRule;
import com.heyganba.model.entity.Kana;
import com.heyganba.model.entity.Kanji;
import com.heyganba.model.entity.Lesson;
import com.heyganba.model.entity.Radical;
import com.heyganba.model.entity.Role;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.model.enums.KanaGroup;
import com.heyganba.model.enums.KanaType;
import com.heyganba.model.enums.RoleName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Set;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * CHẶN RÒ RỈ NỘI DUNG CHỜ DUYỆT.
 *
 * Bối cảnh (bug bảo mật thật, 27/09/2026): database production có 100% nội dung ở trạng thái `PENDING_REVIEW`
 * (chưa được giáo viên tiếng Nhật duyệt) nhưng API vẫn trả đủ cho user thường — UI chỉ hiện thêm banner cảnh báo.
 *
 * Quy tắc đã chốt: user KHÔNG phải admin chỉ được nhận nội dung `reviewStatus = APPROVED`
 * ({@code com.heyganba.common.security.ContentAccess}); nội dung nháp bị chặn ngay ở API
 * (404 khi truy cập theo id, không xuất hiện trong danh sách), KHÔNG chỉ ẩn ở UI.
 * Admin vẫn thấy đủ bản nháp để rà soát nội dung.
 */
class ContentReviewVisibilityTest extends com.heyganba.support.ContentApiTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private Kana approvedKana;
    private Kana pendingKana;
    private Kanji pendingKanji;
    private GrammarRule pendingRule;
    private GrammarExercise pendingExercise;
    private Vocabulary pendingWord;
    private String userToken;

    @BeforeEach
    void seedApprovedAndPendingContent() throws Exception {
        roleRepository.save(Role.builder().name(RoleName.ROLE_ADMIN).description("Admin").build());
        roleRepository.save(Role.builder().name(RoleName.ROLE_USER).description("User").build());

        Lesson lesson = lessonRepository.save(Lesson.builder()
                .slug("visibility-b1")
                .title("Bài kiểm tra hiển thị")
                .curriculumLevel("JPD113")
                .orderIndex(1)
                .build());

        Radical visibleRadical = radicalRepository.save(Radical.builder()
                .radical("日").strokeCount(4).name("hi").meaning("mặt trời").build());
        Radical pendingOnlyRadical = radicalRepository.save(Radical.builder()
                .radical("月").strokeCount(4).name("tsuki").meaning("mặt trăng").build());

        approvedKana = persistApprovedKana(Kana.builder()
                .character("あ").romaji("a").kanaType(KanaType.HIRAGANA).kanaGroup(KanaGroup.GOJUON)
                .isParticleException(false).build());
        pendingKana = kanaRepository.save(Kana.builder()
                .character("ぱ").romaji("pa").kanaType(KanaType.HIRAGANA).kanaGroup(KanaGroup.GOJUON)
                .isParticleException(false).build());

        persistApprovedKanji(Kanji.builder()
                .character("日").strokeCount(4).onyomi("ニチ").kunyomi("ひ")
                .sinoVietnamese("NHẬT").meaning("mặt trời, ngày").lesson(lesson)
                .radicals(Set.of(visibleRadical)).build());
        pendingKanji = kanjiRepository.save(Kanji.builder()
                .character("月").strokeCount(4).onyomi("ゲツ").kunyomi("つき")
                .sinoVietnamese("NGUYỆT").meaning("mặt trăng, tháng").lesson(lesson)
                .radicals(Set.of(pendingOnlyRadical)).build());

        GrammarRule approvedRule = persistApprovedRule(GrammarRule.builder()
                .title("N1 は N2 です").structure("N1 は N2 です")
                .explanation("は đánh dấu chủ đề").lesson(lesson).orderIndex(1).build());
        pendingRule = grammarRuleRepository.save(GrammarRule.builder()
                .title("N1 が N2").structure("N1 が N2")
                .explanation("が nhấn mạnh chủ ngữ").lesson(lesson).orderIndex(2).build());

        persistApprovedExercise(exercise(approvedRule, "わたし __ がくせい です。", "は"));
        pendingExercise = grammarExerciseRepository.save(
                exercise(pendingRule, "PENDING-ねこ __ います。", "が"));

        persistApprovedVocabulary(Vocabulary.builder()
                .word("本").reading("ほん").meaning("sách, gốc rễ").sinoVietnamese("BẢN").lesson(lesson).build());
        pendingWord = vocabularyRepository.save(Vocabulary.builder()
                .word("車").reading("くるま").meaning("xe hơi").sinoVietnamese("XA").lesson(lesson).build());

        userToken = registerAndGetToken("visibility.user@heyganba.vn");
    }

    private GrammarExercise exercise(GrammarRule rule, String questionText, String correctAnswer) {
        return GrammarExercise.builder()
                .grammarRule(rule)
                .questionText(questionText)
                .optionsJson("[\"" + correctAnswer + "\",\"を\",\"に\",\"で\"]")
                .correctAnswer(correctAnswer)
                .explanation("Giải thích")
                .isCommonMistake(false)
                .build();
    }

    private String registerAndGetToken(String email) throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email(email)
                .password("Password123!")
                .fullName("Visibility User")
                .build();

        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("accessToken").asText();
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    // ------------------------------------------------------------------
    // User thường: chỉ nội dung APPROVED
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Kana: danh sách chỉ có kana đã duyệt; kana chờ duyệt trả 404 (cả khi chấm quiz)")
    void kana_hidesPendingContent() throws Exception {
        mockMvc.perform(get("/kana").header("Authorization", bearer(userToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].character", is("あ")));

        mockMvc.perform(get("/kana/" + pendingKana.getId()).header("Authorization", bearer(userToken)))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/kana/" + approvedKana.getId()).header("Authorization", bearer(userToken)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/kana/quiz/check")
                        .header("Authorization", bearer(userToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kanaId\":" + pendingKana.getId() + ",\"userAnswer\":\"pa\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/kana/quiz/check")
                        .header("Authorization", bearer(userToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kanaId\":" + approvedKana.getId() + ",\"userAnswer\":\"a\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.correct", is(true)));
    }

    @Test
    @DisplayName("Kanji + bộ thủ: chỉ trả nội dung đã duyệt; bộ thủ chỉ thuộc kanji nháp cũng bị ẩn")
    void kanjiAndRadicals_hidePendingContent() throws Exception {
        mockMvc.perform(get("/kanji").header("Authorization", bearer(userToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].character", is("日")));

        mockMvc.perform(get("/kanji/" + pendingKanji.getId()).header("Authorization", bearer(userToken)))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/radicals").header("Authorization", bearer(userToken)))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("hi")))
                .andExpect(content().string(not(containsString("tsuki"))));
    }

    @Test
    @DisplayName("Ngữ pháp: chỉ trả điểm/câu đã duyệt, exerciseCount cũng chỉ đếm câu đã duyệt")
    void grammar_hidesPendingContent() throws Exception {
        mockMvc.perform(get("/grammar/rules").header("Authorization", bearer(userToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].title", is("N1 は N2 です")))
                .andExpect(jsonPath("$.data[0].exerciseCount", is(1)));

        mockMvc.perform(get("/grammar/rules/" + pendingRule.getId()).header("Authorization", bearer(userToken)))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/grammar/exercises").header("Authorization", bearer(userToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(content().string(not(containsString("PENDING-"))));

        mockMvc.perform(post("/grammar/exercises/" + pendingExercise.getId() + "/check")
                        .header("Authorization", bearer(userToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userAnswer\":\"が\",\"attemptId\":\"" + java.util.UUID.randomUUID() + "\"}"))
                .andExpect(status().isNotFound());
    }

    // ------------------------------------------------------------------
    // Flashcard / thi thử: nguồn dữ liệu cũng phải lọc
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Flashcard: từ chờ duyệt không vào phiên ôn, không ôn được, không đếm vào tổng từ khả dụng")
    void flashcard_hidesPendingContent() throws Exception {
        mockMvc.perform(get("/flashcard/due-today").header("Authorization", bearer(userToken)))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("本")))
                .andExpect(content().string(not(containsString("車"))));

        mockMvc.perform(post("/flashcard/review")
                        .header("Authorization", bearer(userToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vocabularyId\":" + pendingWord.getId() + ",\"rating\":\"GOOD\",\"attemptId\":\"" + java.util.UUID.randomUUID() + "\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/flashcard/stats").header("Authorization", bearer(userToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.availableNewWords", is(1)));
    }

    @Test
    @DisplayName("Thi thử: đề sinh ra không chứa nội dung chờ duyệt")
    void examGeneration_usesOnlyApprovedContent() throws Exception {
        MvcResult result = mockMvc.perform(post("/exam/generate")
                        .header("Authorization", bearer(userToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totalQuestions\":5,\"durationMinutes\":5}"))
                .andExpect(status().isOk())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertFalse(body.contains("PENDING-"), "Đề thi không được chứa câu hỏi chờ duyệt");
        assertFalse(body.contains("月"), "Đề thi không được chứa kanji chờ duyệt");
        assertFalse(body.contains("車"), "Đề thi không được chứa từ vựng chờ duyệt");
    }

    // ------------------------------------------------------------------
    // Admin: vẫn thấy đủ để rà soát; công cụ review-status chỉ admin
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Admin: thấy cả nội dung chờ duyệt (danh sách + theo id) và gọi được /content/review-status")
    void admin_seesPendingContent() throws Exception {
        String adminToken = adminAccessToken("visibility.admin@heyganba.vn");

        mockMvc.perform(get("/kana").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));

        mockMvc.perform(get("/kana/" + pendingKana.getId()).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/grammar/exercises").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(content().string(containsString("PENDING-")));

        mockMvc.perform(get("/content/review-status").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.allApproved", is(false)))
                .andExpect(jsonPath("$.data.totalPendingReview", is(5)));
    }

    @Test
    @DisplayName("User thường: /content/review-status bị chặn 403 (công cụ nội bộ của admin)")
    void reviewStatus_isAdminOnly() throws Exception {
        mockMvc.perform(get("/content/review-status").header("Authorization", bearer(userToken)))
                .andExpect(status().isForbidden());
    }
}
