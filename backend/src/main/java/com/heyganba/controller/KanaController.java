package com.heyganba.controller;

import com.heyganba.common.exception.TooManyRequestsException;
import com.heyganba.common.response.ApiResponse;
import com.heyganba.config.UserPrincipal;
import com.heyganba.dto.kana.KanaQuizCheckRequest;
import com.heyganba.dto.kana.KanaQuizCheckResponse;
import com.heyganba.dto.kana.KanaResponse;
import com.heyganba.model.enums.KanaGroup;
import com.heyganba.model.enums.KanaType;
import com.heyganba.service.KanaService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/kana")
@RequiredArgsConstructor
public class KanaController {

    /** Giới hạn chấm điểm quiz: 60 request/phút/user (task 1.3). */
    private static final int QUIZ_RATE_LIMIT = 60;
    private static final Duration QUIZ_RATE_WINDOW = Duration.ofMinutes(1);

    private final KanaService kanaService;
    private final RateLimiterService rateLimiterService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<KanaResponse>>> getKana(
            @RequestParam(required = false) KanaType type,
            @RequestParam(required = false) KanaGroup group
    ) {
        List<KanaResponse> kana = kanaService.getKana(type, group);
        return ResponseEntity.ok(ApiResponse.success(kana));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<KanaResponse>> getKanaById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(kanaService.getKanaById(id)));
    }

    @PostMapping("/quiz/check")
    public ResponseEntity<ApiResponse<KanaQuizCheckResponse>> checkQuiz(
            @Valid @RequestBody KanaQuizCheckRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        String rateLimitKey = currentUser != null ? "kana-quiz:" + currentUser.getId() : "kana-quiz:anonymous";

        if (!rateLimiterService.tryConsume(rateLimitKey, QUIZ_RATE_LIMIT, QUIZ_RATE_WINDOW)) {
            throw new TooManyRequestsException(
                    "Too many quiz submissions. Please wait a minute and try again.");
        }

        KanaQuizCheckResponse result = kanaService.checkQuizAnswer(request.kanaId(), request.userAnswer());
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
