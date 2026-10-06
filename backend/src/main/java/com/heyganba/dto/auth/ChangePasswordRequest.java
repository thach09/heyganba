package com.heyganba.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank @Size(max = 50) String currentPassword,
        @NotBlank @Size(min = 6, max = 50) String newPassword,
        @Size(max = 4096) String refreshToken) {}
