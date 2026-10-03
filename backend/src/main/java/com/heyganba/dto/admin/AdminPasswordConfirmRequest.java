package com.heyganba.dto.admin;

import jakarta.validation.constraints.NotBlank;

/**
 * Xác thực lại bằng MẬT KHẨU hiện tại của admin (dùng cho `POST /admin/2fa/reset`).
 *
 * Vì sao cần lớp xác thực này: reset 2FA là thao tác hạ bảo mật của tài khoản, nên không được chỉ dựa vào
 * access token còn hạn (token bị lộ = mất luôn 2FA). Yêu cầu nhập lại mật khẩu buộc kẻ tấn công phải có cả
 * mật khẩu, không chỉ token.
 */
public record AdminPasswordConfirmRequest(
        @NotBlank(message = "Mật khẩu xác nhận là bắt buộc")
        String password
) {
}
