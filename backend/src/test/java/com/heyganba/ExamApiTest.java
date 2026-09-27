package com.heyganba;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.dto.auth.RegisterRequest;
import com.heyganba.model.entity.GrammarExercise;
import com.heyganba.model.entity.GrammarRule;
import com.heyganba.model.entity.Kana;
import com.heyganba.model.entity.Lesson;
import com.heyganba.model.entity.MockExam;
import com.heyganba.model.entity.Role;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.model.enums.KanaGroup;
import com.heyganba.model.enums.KanaType;
import com.heyganba.model.enums.RoleName;
import com.heyganba.repository.GrammarRuleRepository;
import com.heyganba.repository.KanaRepository;
import com.heyganba.repository.LessonRepository;
import com.heyganba.repository.RoleRepository;
import com.heyganba.repository.StudyActivityRepository;
import com.heyganba.service.ExamService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 5 — Thi thử: sinh đề từ nội dung có sẵn, chấm điểm phía server, chống xem/nộp đề của người khác,
 * streak + heatmap + leaderboard sau khi thi.
 */
class ExamApiTest extends com.heyganba.support.ContentApiTestBase {

    private static final int EXAM_QUESTIONS = 5;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private KanaRepository kanaRepository;

    @Autowired
    private GrammarRuleRepository grammarRuleRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private StudyActivityRepository studyActivityRepository;

    @BeforeEach
    void setUp() {
        roleRepository.save(Role.builder().name(RoleName.ROLE_ADMIN).description("Admin").build());
        roleRepository.save(Role.builder().name(RoleName.ROLE_USER).description("User").build());

        Lesson lesson = lessonRepository.save(Lesson.builder()
                .slug("jpd113-b1")
                .title("Bài 1 — Chào hỏi")
                .curriculumLevel("JPD113")
                .orderIndex(1)
                .build());

        seedKana();
        seedGrammar(lesson);
        seedVocabulary(lesson);
    }

    private void seedKana() {
        String[][] items = { { "あ", "a" }, { "い", "i" }, { "う", "u" }, { "え", "e" }, { "お", "o" }, { "か", "ka" } };
        for (String[] item : items) {
            // Idempotent: khi chạy trên PostgreSQL có Flyway seed sẵn 247 kana thì tái sử dụng bản ghi cũ
            // (tránh vi phạm unique index uq_kana_character_type).
            kanaRepository.findByCharacterAndKanaType(item[0], KanaType.HIRAGANA).orElseGet(() -> kanaRepository.save(Kana.builder()
                    .character(item[0])
                    .romaji(item[1])
                    .kanaType(KanaType.HIRAGANA)
                    .kanaGroup(KanaGroup.GOJUON)
                    .isParticleException(false)
                    .notes("Đọc là " + item[1])
                    .build()));
        }
    }

    private void seedGrammar(Lesson lesson) {
        GrammarRule rule = grammarRuleRepository.save(GrammarRule.builder()
                .title("N1 は N2 です")
                .structure("N1 は N2 です")
                .explanation("は đánh dấu chủ đề.")
                .originalNumber(1)
                .lesson(lesson)
                .orderIndex(1)
                .build());

        grammarExerciseRepository.save(GrammarExercise.builder()
                .grammarRule(rule)
                .questionText("わたし __ がくせい です。")
                .optionsJson("[\"は\",\"を\",\"に\",\"で\"]")
                .correctAnswer("は")
                .explanation("は đánh dấu chủ đề của câu.")
                .isCommonMistake(true)
                .mistakeCategory("particle-ha")
                .build());

        grammarExerciseRepository.save(GrammarExercise.builder()
                .grammarRule(rule)
                .questionText("これ __ 本です。")
                .optionsJson("[\"は\",\"が\",\"の\",\"と\"]")
                .correctAnswer("は")
                .explanation("Câu giới thiệu dùng は.")
                .isCommonMistake(false)
                .build());
    }

    private void seedVocabulary(Lesson lesson) {
        vocabularyRepository.save(Vocabulary.builder().word("本").reading("ほん").meaning("sách, gốc rễ").sinoVietnamese("BẢN").lesson(lesson).build());
        vocabularyRepository.save(Vocabulary.builder().word("車").reading("くるま").meaning("xe hơi").sinoVietnamese("XA").lesson(lesson).build());
        vocabularyRepository.save(Vocabulary.builder().word("花").reading("はな").meaning("hoa").sinoVietnamese("HOA").lesson(lesson).build());
    }

    private String registerAndGetToken(String email) throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email(email)
                .password("Password123!")
                .fullName("Exam Tester")
                .build();

        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("accessToken").asText();
    }

    private long generateExam(String token) throws Exception {
        MvcResult result = mockMvc.perform(post("/exam/generate")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totalQuestions\":" + EXAM_QUESTIONS + ",\"durationMinutes\":10}"))
                .andExpect(status().isOk())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("examId").asLong();
    }

    private List<JsonNode> storedQuestions(long examId) throws Exception {
        MockExam exam = mockExamRepository.findById(examId).orElseThrow();
        List<JsonNode> questions = new ArrayList<>();
        objectMapper.readTree(exam.getQuestionsJson()).forEach(questions::add);
        return questions;
    }

    private String answerPayload(List<JsonNode> questions, boolean allCorrect) throws Exception {
        List<Map<String, Object>> answers = new ArrayList<>();
        for (JsonNode question : questions) {
            String correct = question.get("correctAnswer").asText();
            String answer = allCorrect ? correct : wrongOption(question);
            answers.add(Map.of("index", question.get("index").asInt(), "answer", answer));
        }
        return objectMapper.writeValueAsString(Map.of("answers", answers));
    }

    private String wrongOption(JsonNode question) {
        for (JsonNode option : question.get("options")) {
            if (!option.asText().equals(question.get("correctAnswer").asText())) {
                return option.asText();
            }
        }
        return "khong-dung";
    }

    @Test
    @DisplayName("POST /exam/generate: đề gồm 5 câu, có lựa chọn nhưng KHÔNG lộ đáp án")
    void generateExamWithoutAnswers() throws Exception {
        String token = registerAndGetToken("exam.generate@heyganba.vn");

        mockMvc.perform(post("/exam/generate")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totalQuestions\":5,\"durationMinutes\":10}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalQuestions", is(5)))
                .andExpect(jsonPath("$.data.durationMinutes", is(10)))
                .andExpect(jsonPath("$.data.status", is("IN_PROGRESS")))
                .andExpect(jsonPath("$.data.questions", hasSize(5)))
                .andExpect(jsonPath("$.data.questions[0].options.length()", greaterThan(1)))
                .andExpect(jsonPath("$.data.questions[0].correctAnswer").doesNotExist())
                .andExpect(jsonPath("$.data.expiresAt").exists());
    }

    @Test
    @DisplayName("Validate: số câu ngoài khoảng 5–50 trả 400; anonymous bị chặn 401")
    void generateValidation() throws Exception {
        String token = registerAndGetToken("exam.invalid@heyganba.vn");

        mockMvc.perform(post("/exam/generate")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totalQuestions\":3,\"durationMinutes\":10}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.totalQuestions").exists());

        mockMvc.perform(post("/exam/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totalQuestions\":5}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Nộp đúng hết: chấm 100% phía server + streak 1 + có ghi nhật ký học")
    void submitAllCorrect() throws Exception {
        String token = registerAndGetToken("exam.correct@heyganba.vn");
        long examId = generateExam(token);
        String payload = answerPayload(storedQuestions(examId), true);

        mockMvc.perform(post("/exam/" + examId + "/submit")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.correctCount", is(EXAM_QUESTIONS)))
                .andExpect(jsonPath("$.data.totalCount", is(EXAM_QUESTIONS)))
                .andExpect(jsonPath("$.data.scorePercent", is(100.0)))
                .andExpect(jsonPath("$.data.currentStreak", is(1)))
                .andExpect(jsonPath("$.data.details", hasSize(EXAM_QUESTIONS)))
                .andExpect(jsonPath("$.data.details[0].correct", is(true)));

        assertEquals(1, studyActivityRepository.countByUserId(userIdOf("exam.correct@heyganba.vn")));
    }

    @Test
    @DisplayName("Nộp sai: trả đáp án đúng + giải thích để review")
    void submitWithWrongAnswers() throws Exception {
        String token = registerAndGetToken("exam.wrong@heyganba.vn");
        long examId = generateExam(token);
        String payload = answerPayload(storedQuestions(examId), false);

        mockMvc.perform(post("/exam/" + examId + "/submit")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.correctCount", is(0)))
                .andExpect(jsonPath("$.data.scorePercent", is(0.0)))
                .andExpect(jsonPath("$.data.details[0].correct", is(false)))
                .andExpect(jsonPath("$.data.details[0].correctAnswer").exists());
    }

    @Test
    @DisplayName("Nộp lại cùng đề không bị tính điểm/streak 2 lần (idempotent)")
    void resubmitIsIdempotent() throws Exception {
        String token = registerAndGetToken("exam.resubmit@heyganba.vn");
        long examId = generateExam(token);
        String payload = answerPayload(storedQuestions(examId), true);

        for (int attempt = 0; attempt < 2; attempt += 1) {
            mockMvc.perform(post("/exam/" + examId + "/submit")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(payload))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.correctCount", is(EXAM_QUESTIONS)))
                    .andExpect(jsonPath("$.data.currentStreak", is(1)));
        }

        assertEquals(1, studyActivityRepository.countByUserId(userIdOf("exam.resubmit@heyganba.vn")));
        assertEquals(1, examResultRepository.countByUserId(userIdOf("exam.resubmit@heyganba.vn")));
    }

    private Long userIdOf(String email) {
        return userRepository.findByEmail(email).orElseThrow().getId();
    }

    @Test
    @DisplayName("Cách ly dữ liệu: user khác không xem/nộp được đề của mình (404)")
    void examIsIsolatedPerUser() throws Exception {
        String tokenA = registerAndGetToken("exam.owner@heyganba.vn");
        String tokenB = registerAndGetToken("exam.other@heyganba.vn");
        long examId = generateExam(tokenA);

        mockMvc.perform(get("/exam/" + examId).header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", is("NOT_FOUND")));

        mockMvc.perform(get("/exam/" + examId + "/result").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/exam/" + examId + "/submit")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":[{\"index\":0,\"answer\":\"は\"}]}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Lịch sử thi và xem lại kết quả sau khi nộp")
    void historyAndResult() throws Exception {
        String token = registerAndGetToken("exam.history@heyganba.vn");
        long examId = generateExam(token);

        mockMvc.perform(post("/exam/" + examId + "/submit")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(answerPayload(storedQuestions(examId), true)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/exam/history").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].examId", is((int) examId)))
                .andExpect(jsonPath("$.data[0].scorePercent", is(100.0)))
                .andExpect(jsonPath("$.data[0].totalCount", is(EXAM_QUESTIONS)));

        mockMvc.perform(get("/exam/" + examId + "/result").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.details", hasSize(EXAM_QUESTIONS)))
                .andExpect(jsonPath("$.data.scorePercent", is(100.0)));
    }

    @Test
    @DisplayName("Streak + heatmap ghi nhận hoạt động thi; leaderboard xếp hạng theo điểm")
    void streakHeatmapAndLeaderboard() throws Exception {
        String token = registerAndGetToken("exam.progress@heyganba.vn");
        long examId = generateExam(token);

        mockMvc.perform(post("/exam/" + examId + "/submit")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(answerPayload(storedQuestions(examId), true)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/streak").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentStreak", is(1)))
                .andExpect(jsonPath("$.data.activeDays", is(1)))
                .andExpect(jsonPath("$.data.zone").exists());

        mockMvc.perform(get("/streak/heatmap")
                        .param("days", "7")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(7)))
                .andExpect(jsonPath("$.data[6].itemCount", is(EXAM_QUESTIONS)))
                .andExpect(jsonPath("$.data[6].correctCount", is(EXAM_QUESTIONS)));

        mockMvc.perform(get("/leaderboard")
                        .param("limit", "10")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scope", is("ALL")))
                .andExpect(jsonPath("$.data.pointsFormula").exists())
                .andExpect(jsonPath("$.data.entries", hasSize(1)))
                .andExpect(jsonPath("$.data.entries[0].rank", is(1)))
                .andExpect(jsonPath("$.data.entries[0].fullName", is("Exam Tester")))
                .andExpect(jsonPath("$.data.entries[0].bestExamScore", is(100.0)))
                .andExpect(jsonPath("$.data.entries[0].points", greaterThan(0)));
    }

    @Test
    @DisplayName("Câu hỏi kana/từ vựng mang audioText cho TTS tạm (placeholder chờ audio thu thật)")
    void questionsCarryAudioTextForTtsPlaceholder() throws Exception {
        String token = registerAndGetToken("exam.audio@heyganba.vn");
        long examId = generateExam(token);

        boolean foundKanaWithAudio = false;
        for (JsonNode question : storedQuestions(examId)) {
            if ("KANA".equals(question.get("type").asText())) {
                assertEquals(question.get("questionText").asText(), question.get("audioText").asText());
                foundKanaWithAudio = true;
            }
        }
        assertEquals(true, foundKanaWithAudio, "Đề phải có câu KANA để kiểm tra audioText");
    }

    @Test
    @DisplayName("Đề cũ lưu trước khi có audioText vẫn đọc được (audioText = null) — tương thích ngược")
    void legacyStoredQuestionsWithoutAudioTextDeserialize() throws Exception {
        String legacyJson = "[{\"index\":0,\"type\":\"KANA\",\"questionText\":\"あ\","
                + "\"options\":[\"a\",\"i\",\"u\",\"e\"],\"correctAnswer\":\"a\",\"explanation\":null}]";

        List<ExamService.Question> questions = objectMapper.readValue(legacyJson,
                objectMapper.getTypeFactory().constructCollectionType(List.class, ExamService.Question.class));

        assertEquals(1, questions.size());
        assertEquals("あ", questions.get(0).questionText());
        assertNull(questions.get(0).audioText());
    }

    @Test
    @DisplayName("class_code: đăng ký kèm lớp, cập nhật lớp và lọc leaderboard theo lớp")
    void classCodeAndClassLeaderboard() throws Exception {
        // Đăng ký kèm mã lớp ngay từ đầu.
        RegisterRequest withClass = RegisterRequest.builder()
                .email("exam.classa@heyganba.vn")
                .password("Password123!")
                .fullName("Học viên lớp A")
                .classCode("JPD113-A")
                .build();

        MvcResult registered = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(withClass)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.classCode", is("JPD113-A")))
                .andReturn();

        String tokenA = objectMapper.readTree(registered.getResponse().getContentAsString())
                .get("data").get("accessToken").asText();

        // User B đăng ký không có lớp rồi cập nhật lớp qua PUT /users/me/class-code.
        String tokenB = registerAndGetToken("exam.classb@heyganba.vn");

        mockMvc.perform(put("/users/me/class-code")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"classCode\":\"JPD113-B\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.classCode", is("JPD113-B")));

        mockMvc.perform(get("/users/me").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.classCode", is("JPD113-B")));

        // Cả 2 cùng thi để có điểm trên bảng xếp hạng.
        for (String token : List.of(tokenA, tokenB)) {
            long examId = generateExam(token);
            mockMvc.perform(post("/exam/" + examId + "/submit")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(answerPayload(storedQuestions(examId), true)))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(get("/leaderboard")
                        .param("classCode", "jpd113-a")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scope", is("CLASS:jpd113-a")))
                .andExpect(jsonPath("$.data.entries", hasSize(1)))
                .andExpect(jsonPath("$.data.entries[0].fullName", is("Học viên lớp A")));

        mockMvc.perform(get("/leaderboard")
                        .param("classCode", "LOP-KHONG-TON-TAI")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.entries", hasSize(0)));

        mockMvc.perform(get("/leaderboard").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scope", is("ALL")))
                .andExpect(jsonPath("$.data.entries", hasSize(2)));
    }

    @Test
    @DisplayName("Nộp bài với danh sách đáp án rỗng trả 400; leaderboard yêu cầu đăng nhập")
    void submitValidationAndLeaderboardAuth() throws Exception {
        String token = registerAndGetToken("exam.validation@heyganba.vn");
        long examId = generateExam(token);

        mockMvc.perform(post("/exam/" + examId + "/submit")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.answers").exists());

        mockMvc.perform(get("/leaderboard"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/streak"))
                .andExpect(status().isUnauthorized());
    }
}
