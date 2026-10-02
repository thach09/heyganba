package com.heyganba.controller;

import com.heyganba.common.response.ApiResponse;
import com.heyganba.config.UserPrincipal;
import com.heyganba.dto.admin.AdminExerciseRequest;
import com.heyganba.dto.admin.AdminKanjiRequest;
import com.heyganba.dto.admin.AdminVocabularyRequest;
import com.heyganba.dto.admin.AdminPasswordConfirmRequest;
import com.heyganba.dto.admin.AdminReviewQueueItem;
import com.heyganba.dto.admin.AuditLogResponse;
import com.heyganba.dto.auth.TwoFactorCodeRequest;
import com.heyganba.dto.auth.TwoFactorSetupResponse;
import com.heyganba.dto.user.UserProfileResponse;
import com.heyganba.model.entity.GrammarExercise;
import com.heyganba.model.entity.Kanji;
import com.heyganba.model.entity.User;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.repository.UserRepository;
import com.heyganba.service.AdminContentService;
import com.heyganba.service.AuditLogService;
import com.heyganba.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final AuthService authService;
    private final AdminContentService adminContentService;

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

    // ================= TAB "CẦN KIỂM" (hàng đợi duyệt nội dung) =================

    /**
     * Danh sách cho tab "Cần kiểm" của admin panel: các item `needs_human_check = TRUE` được đưa LÊN ĐẦU,
     * sau đó mới tới phần đã đối chiếu được nguồn (để người biết tiếng Nhật không phải lọc thủ công).
     *
     * @param limit          số dòng tối đa (trần 200)
     * @param onlyNeedsCheck true = chỉ trả các item cần người kiểm
     */
    @GetMapping("/review-queue")
    public ResponseEntity<ApiResponse<List<AdminReviewQueueItem>>> reviewQueue(
            @RequestParam(required = false, defaultValue = "50") int limit,
            @RequestParam(required = false, defaultValue = "false") boolean onlyNeedsCheck
    ) {
        return ResponseEntity.ok(ApiResponse.success(adminContentService.reviewQueue(limit, onlyNeedsCheck)));
    }

    // ================= 2FA QUẢN TRỊ VIÊN =================

    @GetMapping("/2fa/status")
    public ResponseEntity<ApiResponse<TwoFactorSetupResponse>> getTwoFactorStatus(
            @AuthenticationPrincipal UserPrincipal admin
    ) {
        return ResponseEntity.ok(ApiResponse.success(authService.getTwoFactorStatus(admin.getId())));
    }

    @PostMapping("/2fa/setup")
    public ResponseEntity<ApiResponse<TwoFactorSetupResponse>> setupTwoFactor(
            @AuthenticationPrincipal UserPrincipal admin
    ) {
        return ResponseEntity.ok(ApiResponse.success(authService.setupTwoFactor(admin.getId()), "Đã khởi tạo secret 2FA"));
    }

    @PostMapping("/2fa/enable")
    public ResponseEntity<ApiResponse<Void>> enableTwoFactor(
            @AuthenticationPrincipal UserPrincipal admin,
            @Valid @RequestBody TwoFactorCodeRequest request
    ) {
        authService.enableTwoFactor(admin.getId(), request.code());
        return ResponseEntity.ok(ApiResponse.success(null, "Đã kích hoạt 2FA thành công"));
    }

    @PostMapping("/2fa/disable")
    public ResponseEntity<ApiResponse<Void>> disableTwoFactor(
            @AuthenticationPrincipal UserPrincipal admin,
            @Valid @RequestBody TwoFactorCodeRequest request
    ) {
        authService.disableTwoFactor(admin.getId(), request.code());
        return ResponseEntity.ok(ApiResponse.success(null, "Đã huỷ kích hoạt 2FA"));
    }

    // ================= CRUD TỪ VỰNG =================

    /**
     * Reset 2FA khi admin MẤT thiết bị Authenticator: xác thực lại bằng mật khẩu hiện tại (KHÔNG cần mã TOTP),
     * sau đó tắt 2FA + xoá secret ⇒ lần setup sau sinh secret mới hoàn toàn.
     */
    @PostMapping("/2fa/reset")
    public ResponseEntity<ApiResponse<Void>> resetTwoFactor(
            @AuthenticationPrincipal UserPrincipal admin,
            @Valid @RequestBody AdminPasswordConfirmRequest request
    ) {
        authService.resetTwoFactor(admin.getId(), request.password());
        auditLogService.logAction(userRepository.getReferenceById(admin.getId()), "users", admin.getId(),
                "RESET_2FA", "isTwoFactorEnabled=true", "isTwoFactorEnabled=false, secret=null");
        return ResponseEntity.ok(ApiResponse.success(null,
                "Đã tắt 2FA. Vui lòng thiết lập lại từ đầu bằng /admin/2fa/setup."));
    }

    @GetMapping("/vocabulary")
    public ResponseEntity<ApiResponse<List<Vocabulary>>> listVocabulary(
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(adminContentService.listVocabulary(q, page, size)));
    }

    @PostMapping("/vocabulary")
    public ResponseEntity<ApiResponse<Vocabulary>> createVocabulary(
            @AuthenticationPrincipal UserPrincipal admin,
            @Valid @RequestBody AdminVocabularyRequest request
    ) {
        User user = userRepository.getReferenceById(admin.getId());
        Vocabulary created = adminContentService.createVocabulary(user, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created, "Thêm từ vựng thành công"));
    }

    @PutMapping("/vocabulary/{id}")
    public ResponseEntity<ApiResponse<Vocabulary>> updateVocabulary(
            @AuthenticationPrincipal UserPrincipal admin,
            @PathVariable Long id,
            @Valid @RequestBody AdminVocabularyRequest request
    ) {
        User user = userRepository.getReferenceById(admin.getId());
        Vocabulary updated = adminContentService.updateVocabulary(user, id, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Cập nhật từ vựng thành công"));
    }

    @DeleteMapping("/vocabulary/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteVocabulary(
            @AuthenticationPrincipal UserPrincipal admin,
            @PathVariable Long id
    ) {
        User user = userRepository.getReferenceById(admin.getId());
        adminContentService.deleteVocabulary(user, id);
        return ResponseEntity.ok(ApiResponse.success(null, "Xoá từ vựng thành công"));
    }

    // ================= CRUD KANJI =================

    @GetMapping("/kanji")
    public ResponseEntity<ApiResponse<List<Kanji>>> listKanji(
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(adminContentService.listKanji(q, page, size)));
    }

    @PostMapping("/kanji")
    public ResponseEntity<ApiResponse<Kanji>> createKanji(
            @AuthenticationPrincipal UserPrincipal admin,
            @Valid @RequestBody AdminKanjiRequest request
    ) {
        User user = userRepository.getReferenceById(admin.getId());
        Kanji created = adminContentService.createKanji(user, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created, "Thêm Kanji thành công"));
    }

    @PutMapping("/kanji/{id}")
    public ResponseEntity<ApiResponse<Kanji>> updateKanji(
            @AuthenticationPrincipal UserPrincipal admin,
            @PathVariable Long id,
            @Valid @RequestBody AdminKanjiRequest request
    ) {
        User user = userRepository.getReferenceById(admin.getId());
        Kanji updated = adminContentService.updateKanji(user, id, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Cập nhật Kanji thành công"));
    }

    @DeleteMapping("/kanji/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteKanji(
            @AuthenticationPrincipal UserPrincipal admin,
            @PathVariable Long id
    ) {
        User user = userRepository.getReferenceById(admin.getId());
        adminContentService.deleteKanji(user, id);
        return ResponseEntity.ok(ApiResponse.success(null, "Xoá Kanji thành công"));
    }

    // ================= CRUD BÀI TẬP NGỮ PHÁP =================

    @GetMapping("/exercises")
    public ResponseEntity<ApiResponse<List<GrammarExercise>>> listExercises(
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(adminContentService.listExercises(q, page, size)));
    }

    @PostMapping("/exercises")
    public ResponseEntity<ApiResponse<GrammarExercise>> createExercise(
            @AuthenticationPrincipal UserPrincipal admin,
            @Valid @RequestBody AdminExerciseRequest request
    ) {
        User user = userRepository.getReferenceById(admin.getId());
        GrammarExercise created = adminContentService.createExercise(user, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created, "Thêm bài tập thành công"));
    }

    @PutMapping("/exercises/{id}")
    public ResponseEntity<ApiResponse<GrammarExercise>> updateExercise(
            @AuthenticationPrincipal UserPrincipal admin,
            @PathVariable Long id,
            @Valid @RequestBody AdminExerciseRequest request
    ) {
        User user = userRepository.getReferenceById(admin.getId());
        GrammarExercise updated = adminContentService.updateExercise(user, id, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Cập nhật bài tập thành công"));
    }

    @DeleteMapping("/exercises/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteExercise(
            @AuthenticationPrincipal UserPrincipal admin,
            @PathVariable Long id
    ) {
        User user = userRepository.getReferenceById(admin.getId());
        adminContentService.deleteExercise(user, id);
        return ResponseEntity.ok(ApiResponse.success(null, "Xoá bài tập thành công"));
    }
}

