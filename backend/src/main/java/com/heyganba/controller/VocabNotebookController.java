package com.heyganba.controller;

import com.heyganba.common.response.ApiResponse;
import com.heyganba.config.UserPrincipal;
import com.heyganba.dto.notebook.*;
import com.heyganba.service.VocabNotebookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/notebooks", "/vocab/notebooks"})
@RequiredArgsConstructor
public class VocabNotebookController {

    private final VocabNotebookService notebookService;
    private final com.heyganba.service.RateLimiterService rateLimiterService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<VocabNotebookResponse>>> listNotebooks(
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.success(notebookService.listNotebooks(currentUser.getId())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<VocabNotebookResponse>> getNotebook(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.success(notebookService.getNotebook(id, currentUser.getId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<VocabNotebookResponse>> createNotebook(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody CreateNotebookRequest request
    ) {
        VocabNotebookResponse created = notebookService.createNotebook(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created, "Tạo sổ từ vựng thành công"));
    }

    @PostMapping("/clone-sample/{sampleId}")
    public ResponseEntity<ApiResponse<VocabNotebookResponse>> cloneSample(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long sampleId
    ) {
        VocabNotebookResponse cloned = notebookService.cloneSampleNotebook(currentUser.getId(), sampleId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(cloned, "Đã lưu nhóm từ mẫu vào kho cá nhân"));
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<ApiResponse<VocabNotebookResponse>> addWord(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody AddNotebookItemRequest request
    ) {
        VocabNotebookResponse updated = notebookService.addWordToNotebook(currentUser.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Đã thêm từ vựng vào sổ tay"));
    }

    @DeleteMapping("/{id}/items/{vocabularyId}")
    public ResponseEntity<ApiResponse<Void>> removeWord(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @PathVariable Long vocabularyId
    ) {
        notebookService.removeWordFromNotebook(currentUser.getId(), id, vocabularyId);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xoá từ khỏi sổ tay"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotebook(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id
    ) {
        notebookService.deleteNotebook(currentUser.getId(), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xoá sổ từ vựng"));
    }

    @PostMapping("/{id}/practice-result")
    public ResponseEntity<ApiResponse<VocabNotebookService.PracticeResultResponse>> recordPracticeResult(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody NotebookPracticeResultRequest request
    ) {
        if (!rateLimiterService.tryConsume("notebook-practice:" + currentUser.getId(), 30, java.time.Duration.ofMinutes(1))) {
            throw new com.heyganba.common.exception.TooManyRequestsException("Vui lòng đợi một phút trước khi lưu phiên tiếp theo");
        }
        VocabNotebookService.PracticeResultResponse result = notebookService.recordPracticeResult(
                currentUser.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success(result, "Đã ghi nhận kết quả luyện tập"));
    }
}
