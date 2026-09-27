package com.heyganba.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {

    private Long id;
    private String email;
    private String fullName;
    private String role;
    private Boolean isActive;
    /** Mã lớp học (text tự do, có thể null) — dùng cho leaderboard theo lớp. */
    private String classCode;
    private Instant createdAt;
}
