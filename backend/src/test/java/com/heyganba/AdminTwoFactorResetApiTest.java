package com.heyganba;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.model.entity.User;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test `POST /admin/2fa/reset` — đường thoát khi admin MẤT thiết bị Authenticator.
 *
 * Ba điều bắt buộc phải đúng:
 *  1. Đúng mật khẩu hiện tại → tắt 2FA và xoá secret.
 *  2. Sai mật khẩu → từ chối và KHÔNG đổi trạng thái 2FA (không được vô tình mở khoá tài khoản).
 *  3. Sau reset phải setup LẠI TỪ ĐẦU: secret cũ không còn, lần setup sau sinh secret mới.
 */
class AdminTwoFactorResetApiTest extends ContentApiTestBase {

    private static final String ADMIN_EMAIL = "2fa.reset.admin@heyganba.vn";
    private static final String ADMIN_PASSWORD = "AdminPass123!";
    private static final String OLD_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String adminWith2faEnabled() {
        String token = adminAccessToken(ADMIN_EMAIL);
        User admin = userRepository.findByEmail(ADMIN_EMAIL).orElseThrow();
        admin.setTwoFactorSecret(OLD_SECRET);
        admin.setIsTwoFactorEnabled(true);
        userRepository.save(admin);
        return token;
    }

    private User reloadAdmin() {
        return userRepository.findByEmail(ADMIN_EMAIL).orElseThrow();
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder resetRequest(
            String token, String body) {
        return post("/admin/2fa/reset")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
    }

    @Test
    @DisplayName("Reset với đúng mật khẩu: tắt 2FA + xoá secret")
    void resetWithCorrectPasswordDisablesAndClearsSecret() throws Exception {
        String token = adminWith2faEnabled();

        mockMvc.perform(resetRequest(token, "{\"password\":\"" + ADMIN_PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        User admin = reloadAdmin();
        assertThat(admin.getIsTwoFactorEnabled()).isFalse();
        assertThat(admin.getTwoFactorSecret()).isNull();

        // Status endpoint cũng phải phản ánh đã tắt (và vẫn không lộ secret).
        mockMvc.perform(get("/admin/2fa/status").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.enabled", is(false)));
    }

    @Test
    @DisplayName("Reset với SAI mật khẩu: trả 400 và giữ nguyên secret + trạng thái bật 2FA")
    void resetWithWrongPasswordIsRejectedAndKeepsSecret() throws Exception {
        String token = adminWith2faEnabled();

        mockMvc.perform(resetRequest(token, "{\"password\":\"WrongPass123!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)));

        User admin = reloadAdmin();
        assertThat(admin.getIsTwoFactorEnabled()).isTrue();
        assertThat(admin.getTwoFactorSecret()).isEqualTo(OLD_SECRET);
    }

    @Test
    @DisplayName("Thiếu mật khẩu (body rỗng) bị validate chặn 400 và không đổi trạng thái")
    void resetWithoutPasswordIsRejected() throws Exception {
        String token = adminWith2faEnabled();

        mockMvc.perform(resetRequest(token, "{}"))
                .andExpect(status().isBadRequest());

        assertThat(reloadAdmin().getTwoFactorSecret()).isEqualTo(OLD_SECRET);
        assertThat(reloadAdmin().getIsTwoFactorEnabled()).isTrue();
    }

    @Test
    @DisplayName("Sau reset phải setup LẠI TỪ ĐẦU: secret mới khác secret cũ, trạng thái vẫn tắt")
    void afterResetSetupStartsFromScratch() throws Exception {
        String token = adminWith2faEnabled();

        mockMvc.perform(resetRequest(token, "{\"password\":\"" + ADMIN_PASSWORD + "\"}"))
                .andExpect(status().isOk());

        assertThat(reloadAdmin().getTwoFactorSecret()).isNull();

        MvcResult setup = mockMvc.perform(post("/admin/2fa/setup").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.enabled", is(false)))
                .andReturn();

        JsonNode data = objectMapper.readTree(setup.getResponse().getContentAsString()).get("data");
        String newSecret = data.get("secret").asText();

        assertThat(newSecret).isNotBlank();
        assertThat(newSecret).isNotEqualTo(OLD_SECRET);
        assertThat(reloadAdmin().getTwoFactorSecret()).isEqualTo(newSecret);
        assertThat(reloadAdmin().getIsTwoFactorEnabled()).isFalse();
    }

    @Test
    @DisplayName("Reset yêu cầu đăng nhập: ẩn danh bị chặn 401")
    void resetRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/admin/2fa/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"whatever\"}"))
                .andExpect(status().isUnauthorized());
    }
}
