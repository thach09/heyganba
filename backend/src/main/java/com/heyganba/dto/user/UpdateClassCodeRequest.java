package com.heyganba.dto.user;

import jakarta.validation.constraints.Size;

/** Body cập nhật mã lớp học của chính user đang đăng nhập (text tự do, gửi rỗng để xoá lớp). */
public record UpdateClassCodeRequest(
        @Size(max = 50, message = "Class code must be at most 50 characters")
        String classCode
) {
}
