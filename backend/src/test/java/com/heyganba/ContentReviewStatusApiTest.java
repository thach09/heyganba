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
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test endpoint trạng thái duyệt nội dung (Phase 4/5): bảo đảm nội dung nháp KHÔNG bị coi là đã sẵn sàng
 * và danh sách migration staging-only được báo đúng.
 */
class ContentReviewStatusApiTest extends ContentApiTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String registerAndGetToken(String email) throws Exception {
        Role userRole = roleRepository.save(Role.builder()
                .name(RoleName.ROLE_USER)
                .description("Học viên")
                .build());

        RegisterRequest request = RegisterRequest.builder()
                .email(email)
                .password("Password123!")
                .fullName("Nội dung Review")
                .build();

        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        assertNotNull(userRole.getId());
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("accessToken").asText();
    }

    private JsonNode typeOf(JsonNode types, String contentType) {
        for (JsonNode type : types) {
            if (contentType.equals(type.get("contentType").asText())) {
                return type;
            }
        }
        throw new AssertionError("Không thấy loại nội dung " + contentType + " trong response");
    }

    @Test
    @DisplayName("GET /content/review-status: đếm đúng nội dung chờ duyệt + liệt kê migration staging-only")
    void reportsPendingContentAndStagingOnlyMigrations() throws Exception {
        Lesson lesson = lessonRepository.save(Lesson.builder()
                .slug("review-b1")
                .title("Bài review")
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

        grammarExerciseRepository.save(GrammarExercise.builder()
                .grammarRule(rule)
                .questionText("わたし __ がくせい です。")
                .optionsJson("[\"は\",\"を\",\"に\",\"で\"]")
                .correctAnswer("は")
                .explanation("は đánh dấu chủ đề.")
                .isCommonMistake(true)
                .mistakeCategory("particle-ha")
                .build());

        String token = registerAndGetToken("content.review@heyganba.vn");

        MvcResult result = mockMvc.perform(get("/content/review-status").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.types", hasSize(5)))
                .andExpect(jsonPath("$.data.allApproved", is(false)))
                .andExpect(jsonPath("$.data.totalPendingReview", greaterThan(0)))
                .andExpect(jsonPath("$.data.stagingOnlyMigrations", hasItem("V12__expand_grammar_exercises.sql")))
                .andExpect(jsonPath("$.data.note", containsString("CHƯA được duyệt")))
                .andReturn();

        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
        JsonNode grammarExercise = typeOf(data.get("types"), "GRAMMAR_EXERCISE");
        assertEquals(1, grammarExercise.get("pendingReview").asLong());
        assertEquals(0, grammarExercise.get("approved").asLong());
        assertEquals(1, grammarExercise.get("total").asLong());

        JsonNode grammarRule = typeOf(data.get("types"), "GRAMMAR_RULE");
        assertEquals(1, grammarRule.get("pendingReview").asLong());
    }

    @Test
    @DisplayName("GET /content/review-status yêu cầu đăng nhập (401 khi ẩn danh)")
    void requiresAuthentication() throws Exception {
        mockMvc.perform(get("/content/review-status"))
                .andExpect(status().isUnauthorized());
    }
}
