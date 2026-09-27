package com.heyganba.controller;

import com.heyganba.common.exception.TooManyRequestsException;
import com.heyganba.common.response.ApiResponse;
import com.heyganba.config.UserPrincipal;
import com.heyganba.dto.kanji.KanjiProgressResponse;
import com.heyganba.dto.kanji.KanjiResponse;
import com.heyganba.dto.kanji.RadicalResponse;
import com.heyganba.service.KanjiService;
import com.heyganba.service.RateLimiterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class KanjiController {

    /** Chống spam lưu tiến độ luyện viết: 120 request/phút/user. */
    private static final int PROGRESS_RATE_LIMIT = 120;
    private static final Duration PROGRESS_RATE_WINDOW = Duration.ofMinutes(1);

    private final KanjiService kanjiService;
    private final RateLimiterService rateLimiterService;

    @GetMapping("/kanji")
    public ResponseEntity<ApiResponse<List<KanjiResponse>>> getKanji(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestParam(required = false) String lesson,
            @RequestParam(required = false) Long radical,
            @RequestParam(required = false) String search
    ) {
        List<KanjiResponse> kanji = kanjiService.getKanji(currentUser.getId(), lesson, radical, search);
        return ResponseEntity.ok(ApiResponse.success(kanji));
    }

    @GetMapping("/kanji/{id}")
    public ResponseEntity<ApiResponse<KanjiResponse>> getKanjiById(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.success(kanjiService.getKanjiById(currentUser.getId(), id)));
    }

    @GetMapping("/radicals")
    public ResponseEntity<ApiResponse<List<RadicalResponse>>> getRadicals(
            @RequestParam(required = false) Long id
    ) {
        return ResponseEntity.ok(ApiResponse.success(kanjiService.getRadicals(id)));
    }

    @PostMapping("/kanji/{id}/progress")
    public ResponseEntity<ApiResponse<KanjiProgressResponse>> recordPractice(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id
    ) {
        String rateLimitKey = "kanji-progress:" + currentUser.getId();

        if (!rateLimiterService.tryConsume(rateLimitKey, PROGRESS_RATE_LIMIT, PROGRESS_RATE_WINDOW)) {
            throw new TooManyRequestsException(
                    "Too many practice submissions. Please wait a minute and try again.");
        }

        return ResponseEntity.ok(ApiResponse.success(kanjiService.recordPractice(currentUser.getId(), id)));
    }
}
