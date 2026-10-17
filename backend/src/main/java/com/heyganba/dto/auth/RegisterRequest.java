package com.heyganba.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    @jakarta.validation.constraints.Size(max=100)
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 50, message = "Password must be between 6 and 50 characters")
    @jakarta.validation.constraints.Size(max=128)
    private String password;

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    @jakarta.validation.constraints.Size(max=100)
    private String fullName;

    /** Mã lớp học (tuỳ chọn, text tự do) — dùng cho leaderboard theo lớp. */
    @Size(max = 50, message = "Class code must be at most 50 characters")
    @jakarta.validation.constraints.Size(max=50)
    private String classCode;
}
