package com.heyganba.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record TwoFactorCodeRequest(
        @NotBlank(message = "Mã xác thực 2FA là bắt buộc")
        @Pattern(regexp = "^\\d{6}$", message = "Mã xác thực 2FA phải gồm đúng 6 chữ số")
        String code
) {
}
