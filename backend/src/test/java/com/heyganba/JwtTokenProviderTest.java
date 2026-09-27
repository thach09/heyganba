package com.heyganba;

import com.heyganba.config.JwtTokenProvider;
import com.heyganba.config.UserPrincipal;
import com.heyganba.model.entity.Role;
import com.heyganba.model.entity.User;
import com.heyganba.model.enums.RoleName;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit test cấu hình JWT — bắt đúng lỗi đã gặp khi deploy Render: thiếu `JWT_SECRET` thì app phải
 * fail-fast với thông báo hành động được (thay vì PlaceholderResolutionException khó đọc).
 */
class JwtTokenProviderTest {

    private static final String VALID_SECRET = Base64.getEncoder().encodeToString(new byte[48]);

    private UserPrincipal principal() {
        User user = User.builder()
                .id(1L)
                .email("jwt@heyganba.vn")
                .fullName("JWT Test")
                .passwordHash("x")
                .role(Role.builder().name(RoleName.ROLE_USER).description("User").build())
                .isActive(true)
                .build();
        return UserPrincipal.create(user);
    }

    @Test
    @DisplayName("Thiếu JWT_SECRET (chuỗi rỗng) → fail-fast kèm hướng dẫn cách sửa")
    void blankSecretFailsFastWithActionableMessage() {
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> new JwtTokenProvider("", 1800000L, 604800000L));

        assertTrue(ex.getMessage().contains("JWT_SECRET"), "thông báo phải nhắc tên biến cần set");
        assertTrue(ex.getMessage().contains("Render"), "thông báo phải chỉ nơi sửa (Render Environment)");
    }

    @Test
    @DisplayName("JWT_SECRET quá ngắn (< 32 byte sau decode) → fail-fast, không chạy với secret yếu")
    void tooShortSecretFailsFast() {
        String shortSecret = Base64.getEncoder().encodeToString(new byte[16]);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> new JwtTokenProvider(shortSecret, 1800000L, 604800000L));

        assertTrue(ex.getMessage().contains("quá ngắn"));
    }

    @Test
    @DisplayName("Secret hợp lệ: sinh token + validate được; access/refresh phân biệt đúng")
    void validSecretGeneratesAndValidatesTokens() {
        JwtTokenProvider provider = new JwtTokenProvider(VALID_SECRET, 1800000L, 604800000L);

        String accessToken = provider.generateAccessToken(principal());
        String refreshToken = provider.generateRefreshToken(principal());

        assertTrue(provider.validateToken(accessToken));
        assertTrue(provider.validateToken(refreshToken));
        assertTrue(provider.isAccessToken(accessToken));
        assertFalse(provider.isAccessToken(refreshToken));
        assertTrue(provider.isRefreshToken(refreshToken));
        assertEquals("jwt@heyganba.vn", provider.getUsernameFromJwt(accessToken));
    }
}
