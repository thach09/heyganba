package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.dto.auth.RegisterRequest;
import com.heyganba.model.entity.Role;
import com.heyganba.model.enums.RoleName;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test rate limit cho các request GHI vào `/admin/**` (POST/PUT/DELETE) — mức 30 request/phút/admin.
 *
 * Mục đích: một token admin bị lộ hoặc script lỗi không thể spam hàng nghìn thao tác ghi (tạo/sửa/ARCHIVE nội dung,
 * bật/tắt 2FA) trước khi bị chặn. Cơ chế dùng lại đúng `RateLimiterService` như login và các endpoint chấm điểm.
 *
 * Lưu ý về body: dùng body `{}` (thiếu trường bắt buộc ⇒ controller trả 400). Filter chạy TRƯỚC controller nên mọi
 * request vẫn bị tính vào hạn mức — nhờ vậy test không cần tạo dữ liệu thật mà vẫn kiểm được ngưỡng.
 */
class AdminWriteRateLimitTest extends ContentApiTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String RATE_LIMITED_MESSAGE = "TOO_MANY_REQUESTS";

    private void postAdminVocabulary(String token) throws Exception {
        mockMvc.perform(post("/admin/vocabulary")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"));
    }

    @Test
    @DisplayName("POST /admin/** : request thứ 31 trong 1 phút bị chặn 429")
    void adminWriteIsBlockedAfterThirtyRequestsPerMinute() throws Exception {
        String token = adminAccessToken("ratelimit.admin@heyganba.vn");

        // 30 request đầu: qua được filter (controller trả 400 vì body rỗng — không phải 429).
        for (int i = 0; i < 30; i++) {
            postAdminVocabulary(token);
        }

        mockMvc.perform(post("/admin/vocabulary")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error", is(RATE_LIMITED_MESSAGE)));
    }

    @Test
    @DisplayName("Hạn mức tính theo TÀI KHOẢN admin: admin A bị chặn không ảnh hưởng admin B")
    void rateLimitIsPerAdminAccount() throws Exception {
        String tokenA = adminAccessToken("ratelimit.admin.a@heyganba.vn");
        String tokenB = adminAccessToken("ratelimit.admin.b@heyganba.vn");

        for (int i = 0; i < 31; i++) {
            postAdminVocabulary(tokenA);
        }

        // Admin A đã cạn hạn mức.
        mockMvc.perform(post("/admin/vocabulary")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isTooManyRequests());

        // Admin B vẫn còn nguyên hạn mức (400 do validate, KHÔNG phải 429).
        mockMvc.perform(post("/admin/vocabulary")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Request ĐỌC của admin (GET) không bị tính vào hạn mức ghi")
    void adminReadRequestsAreNotRateLimited() throws Exception {
        String token = adminAccessToken("ratelimit.read@heyganba.vn");

        for (int i = 0; i < 40; i++) {
            mockMvc.perform(get("/admin/users").header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk());
        }
    }

    @Test
    @DisplayName("User thường POST vào /admin/** vẫn bị 403 (chặn quyền trước, không phải 429)")
    void standardUserIsForbiddenBeforeRateLimit() throws Exception {
        roleRepository.save(Role.builder().name(RoleName.ROLE_USER).description("Học viên").build());

        RegisterRequest request = RegisterRequest.builder()
                .email("ratelimit.user@heyganba.vn")
                .password("Password123!")
                .fullName("Rate Limit User")
                .build();

        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String userToken = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("accessToken").asText();

        mockMvc.perform(post("/admin/vocabulary")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }
}
