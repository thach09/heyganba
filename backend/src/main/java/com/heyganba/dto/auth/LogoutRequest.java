package com.heyganba.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogoutRequest {

    /** Refresh token cần thu hồi cùng lúc với access token khi đăng xuất. */
    private String refreshToken;
}
