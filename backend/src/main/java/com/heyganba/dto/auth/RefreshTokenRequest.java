package com.heyganba.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshTokenRequest {

    @jakarta.validation.constraints.Size(max=4096)
    @jakarta.validation.constraints.Size(max=4096)
    private String refreshToken;
}
