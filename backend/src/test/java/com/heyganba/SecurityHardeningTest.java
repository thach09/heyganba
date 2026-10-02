package com.heyganba;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.dto.auth.LoginRequest;
import com.heyganba.dto.auth.RefreshTokenRequest;
import com.heyganba.dto.auth.RegisterRequest;
import com.heyganba.model.entity.Role;
import com.heyganba.model.entity.User;
import com.heyganba.model.enums.RoleName;
import com.heyganba.repository.RoleRepository;
import com.heyganba.repository.StreakRepository;
import com.heyganba.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 0 — kiểm tra các lỗ hổng/edge case ở tầng auth & error handling:
 * token dùng lẫn loại, tài khoản bị khoá, body JSON lỗi, validation, path/method không tồn tại.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityHardeningTest extends com.heyganba.support.ContentApiTestBase {

    private static final String JSON = MediaType.APPLICATION_JSON_VALUE;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    // userRepository / roleRepository / streakRepository được kế thừa từ ContentApiTestBase.

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Role userRole;

    @BeforeEach
    void setUp() {
        // Không tự xoá users/streaks ở đây: ContentApiTestBase đã xoá theo đúng thứ tự khoá ngoại
        // (mock_exams, exam_results, study_activities... trước users) nên test không phụ thuộc thứ tự chạy.
        roleRepository.save(Role.builder().name(RoleName.ROLE_ADMIN).description("Admin").build());
        userRole = roleRepository.save(Role.builder().name(RoleName.ROLE_USER).description("User").build());
    }

    private JsonNode registerAndGetData(String email, String password, String fullName) throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email(email)
                .password(password)
                .fullName(fullName)
                .build();

        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
    }

    private User createDisabledUser(String email, String password) {
        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .fullName("Disabled User")
                .role(userRole)
                .isActive(false)
                .build();
        return userRepository.save(user);
    }

    @Test
    @DisplayName("HSTS: request HTTPS nhận Strict-Transport-Security, request HTTP thường thì không")
    void hstsHeaderOnlyOnSecureRequests() throws Exception {
        mockMvc.perform(get("/health").secure(true))
                .andExpect(status().isOk())
                .andExpect(header().string("Strict-Transport-Security", "max-age=31536000"));

        // Local dev (http) không nhận HSTS để không ép trình duyệt chuyển HTTPS khi phát triển.
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Strict-Transport-Security"));
    }

    @Test
    @DisplayName("Security headers: nosniff + X-Frame-Options DENY + Referrer-Policy + CSP")
    void securityHeaders_NoSniffAndFrameDeny() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"));
    }

    @Test
    @DisplayName("Actuator health: KHÔNG báo DOWN khi chưa bật Redis (chỉ số Redis phải bị tắt)")
    void actuatorHealth_IsUpWithoutRedis() throws Exception {
        // Bug đã gặp thật trên production 27/09/2026: `/actuator/health` trả 503 vì RedisHealthIndicator
        // thử kết nối localhost:6379 (không có Redis) → cả health DOWN dù app + Postgres khoẻ.
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UP")));
    }

    @Test
    @DisplayName("Actuator: env/beans KHÔNG mở, kể cả khi đã đăng nhập (chỉ health/info)")
    void actuatorSensitiveEndpoints_AreNotExposed() throws Exception {
        JsonNode data = registerAndGetData("hard.actuator@heyganba.vn", "Password123!", "Hard Actuator");
        String bearer = "Bearer " + data.get("accessToken").asText();

        // Ẩn danh: filter chain chặn trước (mặc định là authenticated) → 401.
        mockMvc.perform(get("/actuator/env"))
                .andExpect(status().isUnauthorized());

        // Đã đăng nhập nhưng endpoint không nằm trong exposure.include → 404 (không rò cấu hình).
        mockMvc.perform(get("/actuator/env").header("Authorization", bearer))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/actuator/beans").header("Authorization", bearer))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("CORS: chỉ origin cấu hình được phép; origin lạ bị từ chối, không dùng wildcard")
    void cors_AllowsOnlyConfiguredOrigins() throws Exception {
        mockMvc.perform(options("/health")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));

        mockMvc.perform(options("/health")
                        .header("Origin", "https://evil-attacker.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    @DisplayName("SQLi ở query param enum -> 400 (không đi vào DB, không 500)")
    void queryParamSqlInjection_IsRejected() throws Exception {
        JsonNode data = registerAndGetData("hard.sqli@heyganba.vn", "Password123!", "Hard Sqli");

        mockMvc.perform(get("/kana")
                        .param("group", "' OR '1'='1")
                        .header("Authorization", "Bearer " + data.get("accessToken").asText()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("Mật khẩu lưu dạng BCrypt và KHÔNG bao giờ trả về trong response")
    void password_IsBcryptHashedAndNeverReturned() throws Exception {
        JsonNode data = registerAndGetData("hard.bcrypt@heyganba.vn", "Password123!", "Hard Bcrypt");

        User user = userRepository.findByEmail("hard.bcrypt@heyganba.vn").orElseThrow();
        assertTrue(user.getPasswordHash().startsWith("$2a$") || user.getPasswordHash().startsWith("$2b$"),
                "password_hash phải là BCrypt: " + user.getPasswordHash());
        assertFalse(user.getPasswordHash().contains("Password123!"));

        mockMvc.perform(get("/users/me")
                        .header("Authorization", "Bearer " + data.get("accessToken").asText()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.password").doesNotExist());
    }

    @Test
    @DisplayName("Access token hợp lệ vẫn gọi được API protected (đối chứng)")
    void accessToken_CanCallProtectedApi() throws Exception {
        JsonNode data = registerAndGetData("hard.ok@heyganba.vn", "Password123!", "Hardening OK");

        mockMvc.perform(get("/users/me")
                        .header("Authorization", "Bearer " + data.get("accessToken").asText()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email", is("hard.ok@heyganba.vn")));
    }

    @Test
    @DisplayName("Refresh token KHÔNG dùng được như access token (401)")
    void refreshToken_CannotCallProtectedApi() throws Exception {
        JsonNode data = registerAndGetData("hard.refresh@heyganba.vn", "Password123!", "Hard Refresh");

        mockMvc.perform(get("/users/me")
                        .header("Authorization", "Bearer " + data.get("refreshToken").asText()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error", is("UNAUTHORIZED")));
    }

    @Test
    @DisplayName("Access token KHÔNG dùng được ở endpoint /auth/refresh (400)")
    void accessToken_CannotBeUsedAtRefreshEndpoint() throws Exception {
        JsonNode data = registerAndGetData("hard.mix@heyganba.vn", "Password123!", "Hard Mix");

        RefreshTokenRequest refreshRequest = RefreshTokenRequest.builder()
                .refreshToken(data.get("accessToken").asText())
                .build();

        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("Tài khoản bị khoá (is_active = false) không đăng nhập được (401)")
    void disabledUser_CannotLogin() throws Exception {
        createDisabledUser("hard.disabled@heyganba.vn", "Password123!");

        LoginRequest loginRequest = LoginRequest.builder()
                .email("hard.disabled@heyganba.vn")
                .password("Password123!")
                .build();

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("Token cũ bị vô hiệu khi tài khoản bị khoá giữa chừng (401)")
    void disabledAfterIssuingToken_TokenIsRejected() throws Exception {
        JsonNode data = registerAndGetData("hard.revoke@heyganba.vn", "Password123!", "Hard Revoke");
        String accessToken = data.get("accessToken").asText();

        User user = userRepository.findByEmail("hard.revoke@heyganba.vn").orElseThrow();
        user.setIsActive(false);
        userRepository.save(user);

        mockMvc.perform(get("/users/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("Refresh token của tài khoản bị khoá bị từ chối (400)")
    void disabledUser_CannotRefreshToken() throws Exception {
        JsonNode data = registerAndGetData("hard.refreshdisabled@heyganba.vn", "Password123!", "Hard Refresh Disabled");
        String refreshToken = data.get("refreshToken").asText();

        User user = userRepository.findByEmail("hard.refreshdisabled@heyganba.vn").orElseThrow();
        user.setIsActive(false);
        userRepository.save(user);

        RefreshTokenRequest refreshRequest = RefreshTokenRequest.builder().refreshToken(refreshToken).build();

        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("Body JSON sai định dạng trả 400 theo ApiResponse (không phải 500)")
    void malformedJsonBody_ReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ this-is-not-json "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error", is("BAD_REQUEST")));
    }

    @Test
    @DisplayName("Validation lỗi trả 400 kèm chi tiết từng field")
    void validationErrors_ReturnFieldDetails() throws Exception {
        RegisterRequest invalid = RegisterRequest.builder()
                .email("not-an-email")
                .password("123")
                .fullName("A")
                .build();

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error", hasKey("email")))
                .andExpect(jsonPath("$.error", hasKey("password")))
                .andExpect(jsonPath("$.error", hasKey("fullName")));
    }

    @Test
    @DisplayName("Endpoint không tồn tại trả 404 theo ApiResponse (không phải 500)")
    void unknownEndpoint_ReturnsNotFoundApiResponse() throws Exception {
        JsonNode data = registerAndGetData("hard.404@heyganba.vn", "Password123!", "Hard 404");

        mockMvc.perform(get("/definitely-not-exists")
                        .header("Authorization", "Bearer " + data.get("accessToken").asText()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error", is("NOT_FOUND")));
    }

    @Test
    @DisplayName("Sai HTTP method trả 405 theo ApiResponse")
    void wrongHttpMethod_ReturnsMethodNotAllowed() throws Exception {
        mockMvc.perform(get("/auth/login"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error", is("METHOD_NOT_ALLOWED")));
    }

    @Test
    @DisplayName("Logout vô hiệu hoá access token: gọi API protected sau logout nhận 401 Unauthorized")
    void logout_RevokesAccessToken_ApiReturns401() throws Exception {
        JsonNode data = registerAndGetData("hard.logout@heyganba.vn", "Password123!", "Hard Logout");
        String accessToken = data.get("accessToken").asText();
        String refreshToken = data.get("refreshToken").asText();

        // Kiểm tra trước: access token hợp lệ gọi /users/me nhận 200 OK
        mockMvc.perform(get("/users/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Gọi POST /auth/logout thu hồi cả access token và refresh token
        com.heyganba.dto.auth.LogoutRequest logoutRequest = com.heyganba.dto.auth.LogoutRequest.builder()
                .refreshToken(refreshToken)
                .build();

        mockMvc.perform(post("/auth/logout")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(logoutRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Logged out successfully")));

        // Dùng lại access token cũ gọi /users/me -> bị chặn 401 Unauthorized
        mockMvc.perform(get("/users/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error", is("UNAUTHORIZED")));
    }

    @Test
    @DisplayName("Logout vô hiệu hoá refresh token: gọi /auth/refresh sau logout nhận 401 Unauthorized")
    void logout_RevokesRefreshToken_RefreshEndpointReturns401() throws Exception {
        JsonNode data = registerAndGetData("hard.logout.refresh@heyganba.vn", "Password123!", "Hard Refresh Logout");
        String accessToken = data.get("accessToken").asText();
        String refreshToken = data.get("refreshToken").asText();

        // Gọi POST /auth/logout
        com.heyganba.dto.auth.LogoutRequest logoutRequest = com.heyganba.dto.auth.LogoutRequest.builder()
                .refreshToken(refreshToken)
                .build();

        mockMvc.perform(post("/auth/logout")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(logoutRequest)))
                .andExpect(status().isOk());

        // Thử dùng refresh token cũ để refresh -> nhận 401 Unauthorized
        RefreshTokenRequest refreshRequest = RefreshTokenRequest.builder()
                .refreshToken(refreshToken)
                .build();

        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error", is("UNAUTHORIZED")));
    }
}
