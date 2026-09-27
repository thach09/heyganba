package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.dto.auth.LoginRequest;
import com.heyganba.dto.auth.RefreshTokenRequest;
import com.heyganba.dto.auth.RegisterRequest;
import com.heyganba.model.entity.Role;
import com.heyganba.model.enums.RoleName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.concurrent.atomic.AtomicInteger;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Rate limit chống brute-force cho `/auth/**` (security-plan.md → "Đăng nhập sai nhiều lần liên tiếp:
 * giới hạn số lần thử (rate limit theo tài khoản/IP) để chặn brute-force").
 *
 * Ngưỡng được hạ xuống rất nhỏ qua `@TestPropertySource` để test nhanh và không phụ thuộc con số default
 * (đổi default trong `application.yml` không làm test này đỏ oan). Hành vi cần kiểm chứng:
 * 1. Đủ số lần SAI → request tiếp theo bị 429, kể cả khi mật khẩu đúng.
 * 2. Đăng nhập ĐÚNG nhiều lần không bị tính vào ngân sách lỗi (không tự khoá tài khoản của mình).
 * 3. Khoá theo TÀI KHOẢN: user A bị khoá không ảnh hưởng user B.
 * 4. Khoá theo IP: IP A bị khoá không ảnh hưởng IP B — và IP lấy từ phần tử CUỐI `X-Forwarded-For`,
 *    không phải phần tử đầu do client tự gửi (nếu sai, IP B sẽ bị coi là IP A và test đỏ).
 * 5. Đăng ký và refresh token cũng bị giới hạn.
 */
@TestPropertySource(properties = {
        "app.security.auth.login-max-failed-attempts-per-email=3",
        "app.security.auth.login-max-failed-attempts-per-ip=3",
        "app.security.auth.register-max-attempts-per-ip=5",
        "app.security.auth.refresh-max-attempts-per-ip=2"
})
class AuthRateLimitTest extends com.heyganba.support.ContentApiTestBase {

    private static final String JSON = MediaType.APPLICATION_JSON_VALUE;

    /** IP giả của client: mọi request của JUnit đều có remoteAddr là 127.0.0.1 nên phải gắn header. */
    private static final String IP_A = "203.0.113.7";
    private static final String IP_B = "198.51.100.9";

    /** Tiền tố do client tự gửi — KHÔNG được dùng làm khoá rate limit (xem ClientIpResolver). */
    private static final String SPOOFED_PREFIX = "1.2.3.4, ";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private final AtomicInteger emailCounter = new AtomicInteger();

    @BeforeEach
    void setUp() {
        roleRepository.save(Role.builder().name(RoleName.ROLE_ADMIN).description("Admin").build());
        roleRepository.save(Role.builder().name(RoleName.ROLE_USER).description("User").build());
    }

    private String uniqueEmail(String prefix) {
        return prefix + emailCounter.incrementAndGet() + "@heyganba.vn";
    }

    private String registerBody(String email, String password) throws Exception {
        return objectMapper.writeValueAsString(RegisterRequest.builder()
                .email(email)
                .password(password)
                .fullName("Rate Limit User")
                .build());
    }

    private String loginBody(String email, String password) throws Exception {
        return objectMapper.writeValueAsString(LoginRequest.builder()
                .email(email)
                .password(password)
                .build());
    }

    private void register(String email, String password, String ip) throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(JSON)
                        .content(registerBody(email, password))
                        .header("X-Forwarded-For", SPOOFED_PREFIX + ip))
                .andExpect(status().isCreated());
    }

    private org.springframework.test.web.servlet.ResultActions login(String email, String password, String ip)
            throws Exception {
        return mockMvc.perform(post("/auth/login")
                .contentType(JSON)
                .content(loginBody(email, password))
                .header("X-Forwarded-For", SPOOFED_PREFIX + ip));
    }

    @Test
    @DisplayName("Sai mật khẩu đủ số lần → lần đăng nhập sau bị chặn 429 (kể cả mật khẩu đúng)")
    void failedLogins_ExceedLimit_ReturnsTooManyRequests() throws Exception {
        String email = uniqueEmail("ratelimit.blocked");
        register(email, "CorrectPassword123!", IP_A);

        for (int attempt = 1; attempt <= 3; attempt++) {
            login(email, "WrongPassword123!", IP_A).andExpect(status().isUnauthorized());
        }

        login(email, "CorrectPassword123!", IP_A)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error", is("TOO_MANY_REQUESTS")));
    }

    @Test
    @DisplayName("Đăng nhập ĐÚNG nhiều lần không bị tính vào ngân sách lỗi")
    void successfulLogins_DoNotConsumeFailedAttemptBudget() throws Exception {
        String email = uniqueEmail("ratelimit.success");
        register(email, "CorrectPassword123!", IP_A);

        for (int attempt = 1; attempt <= 5; attempt++) {
            login(email, "CorrectPassword123!", IP_A)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.accessToken", notNullValue()));
        }
    }

    @Test
    @DisplayName("Hết lượt ở tài khoản/IP này không ảnh hưởng tài khoản khác ở IP khác")
    void failedAttempts_AreNotGlobal() throws Exception {
        String blockedEmail = uniqueEmail("ratelimit.accountA");
        String healthyEmail = uniqueEmail("ratelimit.accountB");
        register(blockedEmail, "CorrectPassword123!", IP_A);
        register(healthyEmail, "CorrectPassword123!", IP_B);

        for (int attempt = 1; attempt <= 3; attempt++) {
            login(blockedEmail, "WrongPassword123!", IP_A).andExpect(status().isUnauthorized());
        }

        login(blockedEmail, "CorrectPassword123!", IP_A).andExpect(status().isTooManyRequests());
        login(healthyEmail, "CorrectPassword123!", IP_B).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Khoá theo IP lấy từ phần tử CUỐI X-Forwarded-For: IP A hết lượt không chặn IP B")
    void failedAttempts_AreScopedPerClientIp() throws Exception {
        String victimEmail = uniqueEmail("ratelimit.ipvictim");
        String[] failingEmails = {
                uniqueEmail("ratelimit.ipfail"),
                uniqueEmail("ratelimit.ipfail"),
                uniqueEmail("ratelimit.ipfail")
        };

        for (String email : failingEmails) {
            register(email, "CorrectPassword123!", IP_A);
        }
        register(victimEmail, "CorrectPassword123!", IP_A);

        for (String email : failingEmails) {
            login(email, "WrongPassword123!", IP_A).andExpect(status().isUnauthorized());
        }

        // IP_A đã hết lượt vì 3 lần sai (mỗi tài khoản chỉ sai 1 lần) → chặn cả tài khoản chưa từng sai.
        login(victimEmail, "CorrectPassword123!", IP_A).andExpect(status().isTooManyRequests());
        // IP_B sạch → vẫn đăng nhập được. Nếu resolver lấy phần tử ĐẦU của X-Forwarded-For thì cả 2 IP
        // đều thành "1.2.3.4" và assertion này sẽ đỏ.
        login(victimEmail, "CorrectPassword123!", IP_B).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Giới hạn đăng ký theo IP: vượt số lần cho phép trả 429")
    void register_ExceedLimitPerIp_ReturnsTooManyRequests() throws Exception {
        for (int attempt = 1; attempt <= 5; attempt++) {
            register(uniqueEmail("ratelimit.register"), "CorrectPassword123!", IP_A);
        }

        mockMvc.perform(post("/auth/register")
                        .contentType(JSON)
                        .content(registerBody(uniqueEmail("ratelimit.register"), "CorrectPassword123!"))
                        .header("X-Forwarded-For", SPOOFED_PREFIX + IP_A))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error", is("TOO_MANY_REQUESTS")));
    }

    @Test
    @DisplayName("Giới hạn refresh token theo IP: vượt số lần cho phép trả 429")
    void refresh_ExceedLimitPerIp_ReturnsTooManyRequests() throws Exception {
        String refreshBody = objectMapper.writeValueAsString(
                RefreshTokenRequest.builder().refreshToken("not-a-valid-token").build());

        for (int attempt = 1; attempt <= 2; attempt++) {
            mockMvc.perform(post("/auth/refresh")
                            .contentType(JSON)
                            .content(refreshBody)
                            .header("X-Forwarded-For", SPOOFED_PREFIX + IP_A))
                    .andExpect(status().isBadRequest());
        }

        mockMvc.perform(post("/auth/refresh")
                        .contentType(JSON)
                        .content(refreshBody)
                        .header("X-Forwarded-For", SPOOFED_PREFIX + IP_A))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error", is("TOO_MANY_REQUESTS")));
    }
}
