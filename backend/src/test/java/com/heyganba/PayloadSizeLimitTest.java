package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.dto.auth.RegisterRequest;
import com.heyganba.model.entity.Role;
import com.heyganba.model.enums.RoleName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Giới hạn kích thước request body (security-plan.md → "Giới hạn kích thước payload ... tránh DoS qua request nặng").
 * Ngưỡng default 64KB (`app.security.max-request-bytes`) — body lớn hơn phải bị chặn TRƯỚC khi parse JSON
 * (nếu parse trước thì instance 512MB của Render đã tốn RAM cho payload rác).
 */
class PayloadSizeLimitTest extends com.heyganba.support.ContentApiTestBase {

    private static final int OVERSIZED_BODY_BYTES = 70_000;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        roleRepository.save(Role.builder().name(RoleName.ROLE_ADMIN).description("Admin").build());
        roleRepository.save(Role.builder().name(RoleName.ROLE_USER).description("User").build());
    }

    @Test
    @DisplayName("Body vượt giới hạn trả 413 PAYLOAD_TOO_LARGE theo ApiResponse")
    void oversizedBody_ReturnsPayloadTooLarge() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("x".repeat(OVERSIZED_BODY_BYTES)))
                .andExpect(status().is(413))
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error", is("PAYLOAD_TOO_LARGE")));
    }

    @Test
    @DisplayName("Body bình thường vẫn đi qua filter và xử lý đúng (201 Created)")
    void normalSizedBody_IsNotBlocked() throws Exception {
        String body = objectMapper.writeValueAsString(RegisterRequest.builder()
                .email("payload.limit@heyganba.vn")
                .password("Password123!")
                .fullName("Payload Limit User")
                .build());

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)));
    }
}
