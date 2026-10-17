package com.heyganba.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    @jakarta.validation.constraints.Size(max=100)
    private String email;

    @NotBlank(message = "Password is required")
    @jakarta.validation.constraints.Size(max=128)
    private String password;

    @jakarta.validation.constraints.Size(max=12)
    private String twoFactorCode;
}
