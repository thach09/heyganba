package com.heyganba.controller;

import com.heyganba.common.exception.TooManyRequestsException;
import com.heyganba.common.response.ApiResponse;
import com.heyganba.config.UserPrincipal;
import com.heyganba.dto.exam.ExamGenerateRequest;
import com.heyganba.dto.exam.ExamHistoryResponse;
import com.heyganba.dto.exam.ExamResponse;
import com.heyganba.dto.exam.ExamSubmitRequest;
import com.heyganba.dto.exam.ExamSubmitResponse;
import com.heyganba.service.ExamService;
import com.heyganba.service.RateLimiterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/exam")
@RequiredArgsConstructor
public class ExamController {

    /** Chống spam nộp bài: 30 request/phút/user là quá đủ cho thao tác nộp đề. */
    private static final int SUBMIT_RATE_LIMIT = 30;
    private static final Duration SUBMIT_RATE_WINDOW = Duration.ofMinutes(1);

    private final ExamService examService;
    private final RateLimiterService rateLimiterService;

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<ExamResponse>> generate(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody(required = false) ExamGenerateRequest request
    ) {
        ExamGenerateRequest effectiveRequest = request != null ? request : new ExamGenerateRequest(null, null);
        return ResponseEntity.ok(ApiResponse.success(examService.generate(currentUser.getId(), effectiveRequest)));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<ExamHistoryResponse>>> history(
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.success(examService.getHistory(currentUser.getId())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamResponse>> getExam(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.success(examService.getExam(currentUser.getId(), id)));
    }

    @GetMapping("/{id}/result")
    public ResponseEntity<ApiResponse<ExamSubmitResponse>> getResult(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.success(examService.getResult(currentUser.getId(), id)));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<ExamSubmitResponse>> submit(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody ExamSubmitRequest request
    ) {
        String rateLimitKey = "exam-submit:" + currentUser.getId();

        if (!rateLimiterService.tryConsume(rateLimitKey, SUBMIT_RATE_LIMIT, SUBMIT_RATE_WINDOW)) {
            throw new TooManyRequestsException(
                    "Too many exam submissions. Please wait a minute and try again.");
        }

        return ResponseEntity.ok(ApiResponse.success(examService.submit(currentUser.getId(), id, request)));
    }
}
