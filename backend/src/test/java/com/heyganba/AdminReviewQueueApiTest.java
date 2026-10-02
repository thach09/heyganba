package com.heyganba;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.dto.auth.RegisterRequest;
import com.heyganba.model.entity.GrammarExercise;
import com.heyganba.model.entity.GrammarRule;
import com.heyganba.model.entity.Lesson;
import com.heyganba.model.entity.Role;
import com.heyganba.model.enums.RoleName;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test quy trình duyệt nội dung mới (27/09/2026): hàng đợi "Cần kiểm" của admin.
 *
 * Yêu cầu: item `needs_human_check = TRUE` phải được đưa LÊN ĐẦU danh sách để người biết tiếng Nhật vào duyệt
 * mà không phải lọc thủ công, và endpoint phải chỉ mở cho ADMIN.
 */
class AdminReviewQueueApiTest extends ContentApiTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private void seedExercises() {
        Lesson lesson = lessonRepository.save(Lesson.builder()
                .slug("review-queue-b1")
                .title("Bài review queue")
                .curriculumLevel("JPD113")
                .orderIndex(1)
                .build());

        GrammarRule rule = grammarRuleRepository.save(GrammarRule.builder()
                .title("N1 は N2 です")
                .structure("N1 は N2 です")
                .explanation("は đánh dấu chủ đề.")
                .lesson(lesson)
                .orderIndex(1)
                .build());

        // Câu đã đối chiếu được nguồn (JLPT N5) ⇒ không cần người kiểm.
        grammarExerciseRepository.save(GrammarExercise.builder()
                .grammarRule(rule)
                .questionText("わたし __ がくせい です。")
                .optionsJson("[\"は\",\"を\",\"に\",\"で\"]")
                .correctAnswer("は")
                .explanation("は đánh dấu chủ đề.")
                .isCommonMistake(false)
                .needsHumanCheck(false)
                .sourceRef("doc:#1 | jlpt-n5: wa - topic marker は")
                .build());

        // Câu CẦN người kiểm: cặp trợ từ は/が cùng có trong lựa chọn.
        grammarExerciseRepository.save(GrammarExercise.builder()
                .grammarRule(rule)
                .questionText("サッカー __ スポーツ です。")
                .optionsJson("[\"は\",\"が\",\"を\",\"と\"]")
                .correctAnswer("は")
                .explanation("は đánh dấu chủ đề.")
                .isCommonMistake(true)
                .mistakeCategory("particle-ha")
                .needsHumanCheck(true)
                .reviewNote("Cặp trợ từ は/が cùng có trong lựa chọn: cần giáo viên chốt 1 đáp án.")
                .sourceRef("doc:#1 | jlpt-n5: wa - topic marker は")
                .build());
    }

    private String registerAndGetToken(String email) throws Exception {
        roleRepository.save(Role.builder().name(RoleName.ROLE_USER).description("Học viên").build());

        RegisterRequest request = RegisterRequest.builder()
                .email(email)
                .password("Password123!")
                .fullName("Review Queue")
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
    @DisplayName("GET /admin/review-queue: item needs_human_check = TRUE được đưa LÊN ĐẦU kèm lý do")
    void needsHumanCheckItemsComeFirst() throws Exception {
        seedExercises();
        String token = adminAccessToken("queue.admin@heyganba.vn");

        MvcResult result = mockMvc.perform(get("/admin/review-queue?limit=10").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].needsHumanCheck", is(true)))
                .andExpect(jsonPath("$.data[0].contentType", is("GRAMMAR_EXERCISE")))
                .andExpect(jsonPath("$.data[0].reviewNote", containsString("cần giáo viên chốt 1 đáp án")))
                .andExpect(jsonPath("$.data[0].reviewStatus", is("PENDING_REVIEW")))
                .andExpect(jsonPath("$.data[0].sourceRef", containsString("jlpt-n5")))
                .andReturn();

        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
        assertEquals(2, data.size(), "Hàng đợi phải trả cả câu đã kiểm (xếp sau) khi không lọc");
        assertEquals(false, data.get(1).get("needsHumanCheck").asBoolean());
    }

    @Test
    @DisplayName("GET /admin/review-queue?onlyNeedsCheck=true: chỉ trả item cần người kiểm")
    void onlyNeedsCheckFilter() throws Exception {
        seedExercises();
        String token = adminAccessToken("queue.filter@heyganba.vn");

        mockMvc.perform(get("/admin/review-queue?onlyNeedsCheck=true").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()", is(1)))
                .andExpect(jsonPath("$.data[0].needsHumanCheck", is(true)));
    }

    @Test
    @DisplayName("GET /content/review-status: có đếm needsHumanCheck theo loại + tổng")
    void reviewStatusCountsNeedsHumanCheck() throws Exception {
        seedExercises();
        String token = adminAccessToken("queue.status@heyganba.vn");

        MvcResult result = mockMvc.perform(get("/content/review-status").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalNeedsHumanCheck", greaterThanOrEqualTo(1)))
                .andReturn();

        JsonNode types = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("types");
        JsonNode exerciseType = null;
        for (JsonNode type : types) {
            if ("GRAMMAR_EXERCISE".equals(type.get("contentType").asText())) {
                exerciseType = type;
            }
        }
        assertNotNull(exerciseType);
        assertEquals(1, exerciseType.get("needsHumanCheck").asLong());
    }

    @Test
    @DisplayName("GET /admin/review-queue: user thường bị chặn 403")
    void standardUserIsForbidden() throws Exception {
        String userToken = registerAndGetToken("queue.user@heyganba.vn");

        mockMvc.perform(get("/admin/review-queue").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error", is("FORBIDDEN")));
    }

    @Test
    @DisplayName("GET /admin/review-queue: ẩn danh bị chặn 401")
    void anonymousIsUnauthorized() throws Exception {
        mockMvc.perform(get("/admin/review-queue"))
                .andExpect(status().isUnauthorized());
    }
}
