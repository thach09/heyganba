package com.heyganba.controller;

import com.heyganba.common.response.ApiResponse;
import com.heyganba.config.UserPrincipal;
import com.heyganba.dto.admin.AuditLogResponse;
import com.heyganba.dto.user.UserProfileResponse;
import com.heyganba.model.entity.User;
import com.heyganba.repository.UserRepository;
import com.heyganba.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAdminStatus(
            @AuthenticationPrincipal UserPrincipal admin
    ) {
        Map<String, Object> status = Map.of(
                "authorizedAdmin", admin.getUsername(),
                "role", "ROLE_ADMIN",
                "totalUsers", userRepository.count()
        );
        return ResponseEntity.ok(ApiResponse.success(status, "Admin portal active"));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserProfileResponse>>> listUsers() {
        List<User> users = userRepository.findAll();
        List<UserProfileResponse> dtos = users.stream()
                .map(u -> UserProfileResponse.builder()
                        .id(u.getId())
                        .email(u.getEmail())
                        .fullName(u.getFullName())
                        .role(u.getRole().getName().name())
                        .isActive(u.getIsActive())
                        .createdAt(u.getCreatedAt())
                        .build())
                .toList();

        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> listAuditLogs() {
        return ResponseEntity.ok(ApiResponse.success(auditLogService.getRecent()));
    }
}
