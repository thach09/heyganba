package com.heyganba.controller;

import com.heyganba.common.exception.TooManyRequestsException;
import com.heyganba.common.response.ApiResponse;
import com.heyganba.config.UserPrincipal;
import com.heyganba.dto.flashcard.FlashcardDueResponse;
import com.heyganba.dto.flashcard.FlashcardReviewRequest;
import com.heyganba.dto.flashcard.FlashcardReviewResponse;
import com.heyganba.dto.flashcard.FlashcardStatsResponse;
import com.heyganba.service.FlashcardService;
import com.heyganba.service.RateLimiterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/flashcard")
@RequiredArgsConstructor
public class FlashcardController {

    /** Chống spam endpoint chấm điểm ôn tập: 120 request/phút/user (security-plan). */
    private static final int REVIEW_RATE_LIMIT = 120;
    private static final Duration REVIEW_RATE_WINDOW = Duration.ofMinutes(1);

    private final FlashcardService flashcardService;
    private final RateLimiterService rateLimiterService;

    @GetMapping("/due-today")
    public ResponseEntity<ApiResponse<List<FlashcardDueResponse>>> getDueToday(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestParam(required = false) Integer newLimit
    ) {
        List<FlashcardDueResponse> items = flashcardService.getDueToday(currentUser.getId(), newLimit);
        return ResponseEntity.ok(ApiResponse.success(items));
    }

    @PostMapping("/review")
    public ResponseEntity<ApiResponse<FlashcardReviewResponse>> review(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody FlashcardReviewRequest request
    ) {
        String rateLimitKey = "flashcard-review:" + currentUser.getId();

        if (!rateLimiterService.tryConsume(rateLimitKey, REVIEW_RATE_LIMIT, REVIEW_RATE_WINDOW)) {
            throw new TooManyRequestsException(
                    "Too many review submissions. Please wait a minute and try again.");
        }

        FlashcardReviewResponse response = flashcardService.review(currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<FlashcardStatsResponse>> stats(
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.success(flashcardService.stats(currentUser.getId())));
    }
}
