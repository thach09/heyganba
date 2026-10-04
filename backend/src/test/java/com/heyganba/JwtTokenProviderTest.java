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
    @DisplayName("Secret do dashboard sinh (không phải Base64 nhưng ≥32 ký tự) vẫn dùng được — không chặn deploy vì định dạng")
    void nonBase64SecretWithEnoughEntropyIsAccepted() {
        // Render/nhiều nền tảng sinh secret dạng chuỗi ký tự ngẫu nhiên; chỉ cần ≥32 byte khoá là đủ cho HS256.
        String rawSecret = "zK7pQ2mX9vT4rL8sW1yB6nD3fH5jC0aE";

        JwtTokenProvider provider = new JwtTokenProvider(rawSecret, 1800000L, 604800000L);
        String accessToken = provider.generateAccessToken(principal());

        assertTrue(provider.validateToken(accessToken));
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

    @Test
    @DisplayName("Diễn tập xoay JWT_SECRET: đổi secret lập tức vô hiệu hoá 100% access & refresh token cũ mà không cần can thiệp DB")
    void rotateJwtSecretInvalidatesAllOldTokensImmediately() {
        // 1. Hệ thống chạy với Secret A
        String secretA = "OldSecretWithEnoughEntropyKeyString32Bytes!";
        JwtTokenProvider providerOld = new JwtTokenProvider(secretA, 1800000L, 604800000L);

        UserPrincipal user = principal();
        String oldAccessToken = providerOld.generateAccessToken(user);
        String oldRefreshToken = providerOld.generateRefreshToken(user);

        // Trước khi xoay: cả 2 token đều hợp lệ
        assertTrue(providerOld.validateToken(oldAccessToken));
        assertTrue(providerOld.validateToken(oldRefreshToken));

        // 2. Diễn tập xoay: Secret B được cấu hình thay thế Secret A
        String secretB = "NewRotatedSecretWithSufficientEntropy32Bytes!";
        JwtTokenProvider providerRotated = new JwtTokenProvider(secretB, 1800000L, 604800000L);

        // Sau khi xoay: mọi token sinh bởi Secret A đều KHÔNG thể validate (chữ ký sai khác)
        assertFalse(providerRotated.validateToken(oldAccessToken), "Access token cũ phải bị từ chối ngay lập tức");
        assertFalse(providerRotated.validateToken(oldRefreshToken), "Refresh token cũ phải bị từ chối ngay lập tức");

        // 3. User đăng nhập lại qua Secret B -> nhận token mới hoạt động trơn tru
        String newAccessToken = providerRotated.generateAccessToken(user);
        assertTrue(providerRotated.validateToken(newAccessToken));
        assertEquals("jwt@heyganba.vn", providerRotated.getUsernameFromJwt(newAccessToken));
    }
}
