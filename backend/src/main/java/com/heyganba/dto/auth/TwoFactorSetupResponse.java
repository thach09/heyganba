package com.heyganba.dto.auth;

import lombok.Builder;

@Builder
public record TwoFactorSetupResponse(
        String secret,
        String otpAuthUrl,
        boolean enabled
) {
}
