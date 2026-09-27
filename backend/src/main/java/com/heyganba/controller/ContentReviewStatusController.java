package com.heyganba.controller;

import com.heyganba.common.response.ApiResponse;
import com.heyganba.dto.content.ContentReviewStatusResponse;
import com.heyganba.service.ContentReviewStatusService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint phục vụ việc kiểm soát chất lượng nội dung: cho biết còn bao nhiêu nội dung CHỜ DUYỆT tiếng Nhật
 * và file migration nào mới chỉ chạy ở staging.
 *
 * Yêu cầu đăng nhập (không cấp public) — chỉ để nội bộ/CI gọi kiểm tra, xem docs/Internal/deployment-plan.md.
 */
@RestController
@RequestMapping("/content")
@RequiredArgsConstructor
public class ContentReviewStatusController {

    private final ContentReviewStatusService contentReviewStatusService;

    @GetMapping("/review-status")
    public ResponseEntity<ApiResponse<ContentReviewStatusResponse>> getReviewStatus() {
        return ResponseEntity.ok(ApiResponse.success(contentReviewStatusService.getStatus()));
    }
}
