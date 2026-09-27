package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.dto.auth.RegisterRequest;
import com.heyganba.model.entity.Kana;
import com.heyganba.model.entity.Role;
import com.heyganba.model.enums.KanaGroup;
import com.heyganba.model.enums.KanaType;
import com.heyganba.model.enums.RoleName;
import com.heyganba.repository.KanaRepository;
import com.heyganba.repository.RoleRepository;
import com.heyganba.repository.StreakRepository;
import com.heyganba.repository.UserRepository;
import com.heyganba.service.RateLimiterService;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 1 — API kana: tra cứu theo nhóm, chấm điểm quiz phía server (chuẩn hoá Unicode + biến thể romaji),
 * và rate limit 60 request/phút/user cho endpoint chấm điểm.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class KanaApiTest extends com.heyganba.support.ContentApiTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private KanaRepository kanaRepository;

    // userRepository / roleRepository / streakRepository được kế thừa từ ContentApiTestBase.

    @Autowired
    private RateLimiterService rateLimiterService;

    private Kana hiraganaShi;

    @BeforeEach
    void setUp() {
        rateLimiterService.reset();
        // Chỉ xoá thêm bảng `kana` (base class không quản lý bảng này); users/roles/streaks do base xoá theo FK order.
        kanaRepository.deleteAll();

        roleRepository.save(Role.builder().name(RoleName.ROLE_ADMIN).description("Admin").build());
        roleRepository.save(Role.builder().name(RoleName.ROLE_USER).description("User").build());

        hiraganaShi = persistApprovedKana(Kana.builder()
                .character("し")
                .romaji("shi")
                .kanaType(KanaType.HIRAGANA)
                .kanaGroup(KanaGroup.GOJUON)
                .isParticleException(false)
                .notes("Đọc \"shi\", không đọc \"si\".")
                .build());

        persistApprovedKana(Kana.builder()
                .character("は")
                .romaji("ha")
                .kanaType(KanaType.HIRAGANA)
                .kanaGroup(KanaGroup.GOJUON)
                .isParticleException(true)
                .notes("Khi làm trợ từ đọc \"wa\".")
                .build());

        persistApprovedKana(Kana.builder()
                .character("ツォ")
                .romaji("tso")
                .kanaType(KanaType.KATAKANA)
                .kanaGroup(KanaGroup.EXTENDED_KATAKANA)
                .isParticleException(false)
                .notes("Phiên âm \"tso\" — thường gặp khi phiên âm tiếng Ý.")
                .build());

        persistApprovedKana(Kana.builder()
                .character("ヂ")
                .romaji("ji (di)")
                .kanaType(KanaType.KATAKANA)
                .kanaGroup(KanaGroup.DAKUTEN)
                .isParticleException(false)
                .build());

        assertEquals(4, kanaRepository.count());
    }

    private String registerAndGetToken(String email) throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email(email)
                .password("Password123!")
                .fullName("Kana Tester")
                .build();

        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("accessToken").asText();
    }

    private String quizCheckBody(long kanaId, String answer) {
        return "{\"kanaId\":" + kanaId + ",\"userAnswer\":\"" + answer + "\"}";
    }

    @Test
    @DisplayName("GET /kana trả toàn bộ ký tự, kèm cờ trợ từ và ghi chú")
    void listAllKana() throws Exception {
        String token = registerAndGetToken("kana.list@heyganba.vn");

        mockMvc.perform(get("/kana").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(4)))
                .andExpect(jsonPath("$.data[0].character", is("し")))
                .andExpect(jsonPath("$.data[1].isParticleException", is(true)))
                .andExpect(jsonPath("$.data[1].notes", is("Khi làm trợ từ đọc \"wa\".")));
    }

    @Test
    @DisplayName("GET /kana lọc theo type và group (Katakana mở rộng)")
    void filterKanaByTypeAndGroup() throws Exception {
        String token = registerAndGetToken("kana.filter@heyganba.vn");

        mockMvc.perform(get("/kana")
                        .param("type", "KATAKANA")
                        .param("group", "EXTENDED_KATAKANA")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].character", is("ツォ")))
                .andExpect(jsonPath("$.data[0].kanaGroup", is("EXTENDED_KATAKANA")));
    }

    @Test
    @DisplayName("GET /kana với param không hợp lệ trả 400 theo ApiResponse")
    void invalidGroupParamReturnsBadRequest() throws Exception {
        String token = registerAndGetToken("kana.badparam@heyganba.vn");

        mockMvc.perform(get("/kana")
                        .param("group", "NOT_A_GROUP")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error", is("BAD_REQUEST")));
    }

    @Test
    @DisplayName("GET /kana/{id} trả chi tiết, id không tồn tại trả 404")
    void getKanaDetail() throws Exception {
        String token = registerAndGetToken("kana.detail@heyganba.vn");

        mockMvc.perform(get("/kana/" + hiraganaShi.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.romaji", is("shi")));

        mockMvc.perform(get("/kana/999999")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", is("NOT_FOUND")));
    }

    @Test
    @DisplayName("Anonymous gọi /kana bị chặn 401")
    void anonymousCannotReadKana() throws Exception {
        mockMvc.perform(get("/kana"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("Quiz check: đáp án đúng (chuẩn hoá hoa/thường + biến thể romaji si -> shi)")
    void quizCheckAcceptsCorrectAndAliasAnswers() throws Exception {
        String token = registerAndGetToken("kana.quiz@heyganba.vn");

        mockMvc.perform(post("/kana/quiz/check")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(quizCheckBody(hiraganaShi.getId(), "SHI ")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.correct", is(true)))
                .andExpect(jsonPath("$.data.correctAnswer", is("shi")));

        mockMvc.perform(post("/kana/quiz/check")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(quizCheckBody(hiraganaShi.getId(), "si")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.correct", is(true)));

        mockMvc.perform(post("/kana/quiz/check")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(quizCheckBody(hiraganaShi.getId(), "tsu")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.correct", is(false)))
                .andExpect(jsonPath("$.data.correctAnswer", is("shi")));
    }

    @Test
    @DisplayName("Quiz check: chấp nhận đáp án thay thế trong ngoặc (ヂ = ji (di))")
    void quizCheckAcceptsParentheticalVariant() throws Exception {
        String token = registerAndGetToken("kana.alias@heyganba.vn");
        Long id = kanaRepository.findByCharacterAndKanaType("ヂ", KanaType.KATAKANA).orElseThrow().getId();

        for (String answer : new String[] { "di", "ji" }) {
            mockMvc.perform(post("/kana/quiz/check")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(quizCheckBody(id, answer)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.correct", is(true)));
        }
    }

    @Test
    @DisplayName("Quiz check: kanaId không tồn tại trả 404")
    void quizCheckUnknownKanaReturnsNotFound() throws Exception {
        String token = registerAndGetToken("kana.quiz404@heyganba.vn");

        mockMvc.perform(post("/kana/quiz/check")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(quizCheckBody(999999L, "shi")))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Quiz check: thiếu dữ liệu trong body trả 400 kèm chi tiết field")
    void quizCheckValidationErrors() throws Exception {
        String token = registerAndGetToken("kana.quizinvalid@heyganba.vn");

        mockMvc.perform(post("/kana/quiz/check")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kanaId\":null,\"userAnswer\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.kanaId").exists())
                .andExpect(jsonPath("$.error.userAnswer").exists());
    }

    @Test
    @DisplayName("Quiz check: request thứ 61 trong 1 phút bị chặn 429 (rate limit 60/phút/user)")
    void quizCheckIsRateLimited() throws Exception {
        String token = registerAndGetToken("kana.ratelimit@heyganba.vn");
        long kanaId = hiraganaShi.getId();

        int allowed = 0;
        int firstBlockedAt = -1;
        for (int attempt = 1; attempt <= 61; attempt += 1) {
            int status = mockMvc.perform(post("/kana/quiz/check")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(quizCheckBody(kanaId, "shi")))
                    .andReturn()
                    .getResponse()
                    .getStatus();

            if (status == 200) {
                allowed += 1;
            } else if (firstBlockedAt == -1) {
                firstBlockedAt = attempt;
            }
        }

        assertEquals(60, allowed);
        assertEquals(61, firstBlockedAt);

        mockMvc.perform(post("/kana/quiz/check")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(quizCheckBody(kanaId, "shi")))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error", is("TOO_MANY_REQUESTS")));
    }
}
