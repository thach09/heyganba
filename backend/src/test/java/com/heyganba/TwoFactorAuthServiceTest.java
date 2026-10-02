package com.heyganba;

import com.heyganba.service.TwoFactorAuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TwoFactorAuthServiceTest {

    private TwoFactorAuthService twoFactorAuthService;

    @BeforeEach
    void setUp() {
        twoFactorAuthService = new TwoFactorAuthService();
    }

    @Test
    @DisplayName("Tạo secret key 32 ký tự Base32 hợp lệ")
    void generateSecret_validBase32() {
        String secret = twoFactorAuthService.generateSecret();
        assertThat(secret).isNotNull();
        assertThat(secret).hasSize(32);
        assertThat(secret).matches("^[A-Z2-7]{32}$");
    }

    @Test
    @DisplayName("Tạo otpauth URI đúng định dạng chuẩn RFC 6238")
    void getOtpAuthUrl_validFormat() {
        String secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
        String email = "admin@heyganba.vn";
        String url = twoFactorAuthService.getOtpAuthUrl(email, secret);

        assertThat(url).startsWith("otpauth://totp/");
        assertThat(url).contains("HeyGanba");
        assertThat(url).contains("admin%40heyganba.vn");
        assertThat(url).contains("secret=" + secret);
    }

    @Test
    @DisplayName("Từ chối mã sai định dạng hoặc mã rỗng")
    void verifyCode_invalidInputs() {
        String secret = twoFactorAuthService.generateSecret();
        assertThat(twoFactorAuthService.verifyCode(secret, null)).isFalse();
        assertThat(twoFactorAuthService.verifyCode(secret, "")).isFalse();
        assertThat(twoFactorAuthService.verifyCode(secret, "12345")).isFalse();
        assertThat(twoFactorAuthService.verifyCode(secret, "1234567")).isFalse();
        assertThat(twoFactorAuthService.verifyCode(secret, "abcdef")).isFalse();
        assertThat(twoFactorAuthService.verifyCode(null, "123456")).isFalse();
    }
}
