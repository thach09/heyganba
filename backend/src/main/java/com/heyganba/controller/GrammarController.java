package com.heyganba.controller;

import com.heyganba.common.exception.TooManyRequestsException;
import com.heyganba.common.response.ApiResponse;
import com.heyganba.config.UserPrincipal;
import com.heyganba.dto.grammar.GrammarCheckRequest;
import com.heyganba.dto.grammar.GrammarCheckResponse;
import com.heyganba.dto.grammar.GrammarExerciseResponse;
import com.heyganba.dto.grammar.GrammarRuleResponse;
import com.heyganba.service.GrammarService;
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
@RequestMapping("/grammar")
@RequiredArgsConstructor
public class GrammarController {

    /** Chống spam endpoint chấm điểm: 120 request/phút/user. */
    private static final int CHECK_RATE_LIMIT = 120;
    private static final Duration CHECK_RATE_WINDOW = Duration.ofMinutes(1);

    private final GrammarService grammarService;
    private final RateLimiterService rateLimiterService;

    @GetMapping("/rules")
    public ResponseEntity<ApiResponse<List<GrammarRuleResponse>>> getRules(@RequestParam(required = false) String lesson) {
        return ResponseEntity.ok(ApiResponse.success(grammarService.getRules(lesson)));
    }

    @GetMapping("/rules/{id}")
    public ResponseEntity<ApiResponse<GrammarRuleResponse>> getRule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(grammarService.getRuleById(id)));
    }

    @GetMapping("/exercises")
    public ResponseEntity<ApiResponse<List<GrammarExerciseResponse>>> getExercises(
            @RequestParam(required = false) Long ruleId,
            @RequestParam(required = false, defaultValue = "false") boolean mistakeOnly
    ) {
        return ResponseEntity.ok(ApiResponse.success(grammarService.getExercises(ruleId, mistakeOnly)));
    }

    @PostMapping("/exercises/{id}/check")
    public ResponseEntity<ApiResponse<GrammarCheckResponse>> checkExercise(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody GrammarCheckRequest request
    ) {
        String rateLimitKey = "grammar-check:" + currentUser.getId();

        if (!rateLimiterService.tryConsume(rateLimitKey, CHECK_RATE_LIMIT, CHECK_RATE_WINDOW)) {
            throw new TooManyRequestsException(
                    "Too many grammar submissions. Please wait a minute and try again.");
        }

        return ResponseEntity.ok(ApiResponse.success(grammarService.checkAnswer(currentUser.getId(), id, request.userAnswer(), request.attemptId())));
    }
}
