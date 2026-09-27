package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.dto.auth.RegisterRequest;
import com.heyganba.model.entity.GrammarExercise;
import com.heyganba.model.entity.GrammarRule;
import com.heyganba.model.entity.Lesson;
import com.heyganba.model.entity.Role;
import com.heyganba.model.enums.RoleName;
import com.heyganba.repository.GrammarExerciseRepository;
import com.heyganba.repository.GrammarRuleRepository;
import com.heyganba.repository.LessonRepository;
import com.heyganba.repository.RoleRepository;
import com.heyganba.repository.StreakRepository;
import com.heyganba.repository.UserRepository;
import com.heyganba.service.GrammarService;
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
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 4 — API ngữ pháp: danh sách điểm ngữ pháp (giữ số thứ tự gốc), bài tập điền khuyết,
 * lọc nhóm bẫy thường gặp và chấm điểm phía server (không lộ đáp án trước khi chấm).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GrammarApiTest extends com.heyganba.support.ContentApiTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private GrammarRuleRepository grammarRuleRepository;

    @Autowired
    private GrammarExerciseRepository grammarExerciseRepository;

    @Autowired
    private com.heyganba.repository.VocabularyRepository vocabularyRepository;

    @Autowired
    private com.heyganba.repository.SrsReviewRepository srsReviewRepository;

    @Autowired
    private com.heyganba.repository.KanjiRepository kanjiRepository;

    @Autowired
    private com.heyganba.repository.KanjiPracticeProgressRepository kanjiProgressRepository;

    @Autowired
    private com.heyganba.repository.RadicalRepository radicalRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private StreakRepository streakRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    private GrammarRule particleHaRule;
    private GrammarExercise particleExercise;

    @BeforeEach
    void setUp() {
        // Xoá theo đúng thứ tự phụ thuộc khoá ngoại để test class chạy độc lập với thứ tự Surefire.
        grammarExerciseRepository.deleteAll();
        grammarRuleRepository.deleteAll();
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

        Lesson lessonB1 = lessonRepository.save(Lesson.builder()
                .slug("jpd113-b1")
                .title("Bài 1 — Chào hỏi")
                .curriculumLevel("JPD113")
                .orderIndex(1)
                .build());

        Lesson lessonB2 = lessonRepository.save(Lesson.builder()
                .slug("jpd113-b2")
                .title("Bài 2 — Đồ vật")
                .curriculumLevel("JPD113")
                .orderIndex(2)
                .build());

        particleHaRule = grammarRuleRepository.save(GrammarRule.builder()
                .title("N1 は N2 です")
                .structure("N1 は N2 です")
                .explanation("は đánh dấu chủ đề của câu, khi làm trợ từ đọc là wa.")
                .notes("Phủ định: じゃありません.")
                .originalNumber(5)
                .sourceRef("doc:#5")
                .lesson(lessonB1)
                .orderIndex(1)
                .build());

        GrammarRule particleMoRule = grammarRuleRepository.save(GrammarRule.builder()
                .title("N も")
                .structure("N も ～です")
                .explanation("も thay cho は khi muốn nói cũng.")
                .originalNumber(7)
                .sourceRef("doc:#7")
                .lesson(lessonB2)
                .orderIndex(2)
                .build());

        particleExercise = grammarExerciseRepository.save(GrammarExercise.builder()
                .grammarRule(particleHaRule)
                .questionText("わたし __ がくせい です。")
                .optionsJson("[\"は\",\"を\",\"に\",\"で\"]")
                .correctAnswer("は")
                .explanation("は đánh dấu chủ đề; khi làm trợ từ đọc là wa.")
                .isCommonMistake(true)
                .mistakeCategory("particle-ha")
                .build());

        grammarExerciseRepository.save(GrammarExercise.builder()
                .grammarRule(particleMoRule)
                .questionText("リンさん __ ベトナム人です。")
                .optionsJson("[\"は\",\"も\",\"を\",\"が\"]")
                .correctAnswer("は")
                .explanation("Câu đầu tiên giới thiệu chủ đề nên dùng は.")
                .isCommonMistake(false)
                .build());
    }

    private String registerAndGetToken(String email) throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email(email)
                .password("Password123!")
                .fullName("Grammar Tester")
                .build();

        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("accessToken").asText();
    }

    @Test
    @DisplayName("checkAnswer phải là transaction GHI (nó INSERT study_activities) — chặn hồi quy readOnly")
    void checkAnswerMustStayWritableTransaction() throws Exception {
        Method method = GrammarService.class.getMethod("checkAnswer", Long.class, Long.class, String.class);
        Transactional transactional = method.getAnnotation(Transactional.class);

        assertNotNull(transactional, "checkAnswer cần @Transactional để ghi study_activities");
        assertFalse(transactional.readOnly(),
                "checkAnswer INSERT vào study_activities nên KHÔNG được readOnly=true (PostgreSQL sẽ chặn INSERT)");
    }

    @Test
    @DisplayName("GET /grammar/rules đánh số LIÊN TỤC theo thứ tự dạy và KHÔNG lộ số gốc của nguồn")
    void listRulesUsesContinuousNumbering() throws Exception {
        String token = registerAndGetToken("grammar.rules@heyganba.vn");

        mockMvc.perform(get("/grammar/rules").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].title", is("N1 は N2 です")))
                .andExpect(jsonPath("$.data[0].number", is(1)))
                .andExpect(jsonPath("$.data[0].exerciseCount", is(1)))
                .andExpect(jsonPath("$.data[1].number", is(2)))
                // Nội dung là bản nháp → luôn báo PENDING_REVIEW để UI không hiển thị như đã duyệt.
                .andExpect(jsonPath("$.data[0].reviewStatus", is("PENDING_REVIEW")))
                // Số gốc (source_ref) là metadata nội bộ, không được trả ra API.
                .andExpect(jsonPath("$.data[0].sourceRef").doesNotExist())
                .andExpect(jsonPath("$.data[0].originalNumber").doesNotExist());
    }

    @Test
    @DisplayName("GET /grammar/rules lọc theo bài học")
    void listRulesByLesson() throws Exception {
        String token = registerAndGetToken("grammar.ruleslesson@heyganba.vn");

        mockMvc.perform(get("/grammar/rules")
                        .param("lesson", "jpd113-b2")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].title", is("N も")));
    }

    @Test
    @DisplayName("GET /grammar/rules/{id} trả chi tiết, id lạ trả 404")
    void ruleDetail() throws Exception {
        String token = registerAndGetToken("grammar.ruledetail@heyganba.vn");

        mockMvc.perform(get("/grammar/rules/" + particleHaRule.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.structure", is("N1 は N2 です")))
                .andExpect(jsonPath("$.data.notes", is("Phủ định: じゃありません.")));

        mockMvc.perform(get("/grammar/rules/999999").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", is("NOT_FOUND")));
    }

    @Test
    @DisplayName("GET /grammar/exercises trả câu hỏi + lựa chọn nhưng KHÔNG lộ đáp án")
    void exercisesDoNotLeakCorrectAnswer() throws Exception {
        String token = registerAndGetToken("grammar.exercises@heyganba.vn");

        mockMvc.perform(get("/grammar/exercises")
                        .param("ruleId", particleHaRule.getId().toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].questionText", is("わたし __ がくせい です。")))
                .andExpect(jsonPath("$.data[0].options", hasSize(4)))
                .andExpect(jsonPath("$.data[0].options[0]", is("は")))
                .andExpect(jsonPath("$.data[0].isCommonMistake", is(true)))
                .andExpect(jsonPath("$.data[0].reviewStatus", is("PENDING_REVIEW")))
                .andExpect(jsonPath("$.data[0].correctAnswer").doesNotExist())
                .andExpect(jsonPath("$.data[0].explanation").doesNotExist());
    }

    @Test
    @DisplayName("GET /grammar/exercises?mistakeOnly=true chỉ trả nhóm bẫy thường gặp")
    void exercisesFilterByCommonMistake() throws Exception {
        String token = registerAndGetToken("grammar.mistake@heyganba.vn");

        mockMvc.perform(get("/grammar/exercises")
                        .param("mistakeOnly", "true")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].mistakeCategory", is("particle-ha")));
    }

    @Test
    @DisplayName("POST /grammar/exercises/{id}/check: chấm đúng/sai phía server")
    void checkExerciseServerSide() throws Exception {
        String token = registerAndGetToken("grammar.check@heyganba.vn");

        mockMvc.perform(post("/grammar/exercises/" + particleExercise.getId() + "/check")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userAnswer\":\" は \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.correct", is(true)))
                .andExpect(jsonPath("$.data.correctAnswer", is("は")))
                .andExpect(jsonPath("$.data.ruleTitle", is("N1 は N2 です")))
                .andExpect(jsonPath("$.data.isCommonMistake", is(true)));

        mockMvc.perform(post("/grammar/exercises/" + particleExercise.getId() + "/check")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userAnswer\":\"を\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.correct", is(false)))
                .andExpect(jsonPath("$.data.correctAnswer", is("は")))
                .andExpect(jsonPath("$.data.explanation", is("は đánh dấu chủ đề; khi làm trợ từ đọc là wa.")))
                .andExpect(jsonPath("$.data.mistakeCategory", is("particle-ha")));
    }

    @Test
    @DisplayName("Validate và 404: đáp án rỗng trả 400, bài tập không tồn tại trả 404")
    void checkExerciseValidationAndNotFound() throws Exception {
        String token = registerAndGetToken("grammar.checkinvalid@heyganba.vn");

        mockMvc.perform(post("/grammar/exercises/" + particleExercise.getId() + "/check")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userAnswer\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.userAnswer").exists());

        mockMvc.perform(post("/grammar/exercises/999999/check")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userAnswer\":\"は\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", is("NOT_FOUND")));
    }

    @Test
    @DisplayName("Anonymous không gọi được API ngữ pháp (401)")
    void anonymousIsRejected() throws Exception {
        mockMvc.perform(get("/grammar/rules"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/grammar/exercises"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/grammar/exercises/1/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userAnswer\":\"は\"}"))
                .andExpect(status().isUnauthorized());
    }
}
