package com.heyganba.controller;

import com.heyganba.common.response.ApiResponse;
import com.heyganba.config.UserPrincipal;
import com.heyganba.dto.leaderboard.LeaderboardResponse;
import com.heyganba.dto.progress.PracticeProgressRequest;
import com.heyganba.dto.progress.PracticeProgressResponse;
import com.heyganba.dto.progress.UserExpResponse;
import com.heyganba.dto.streak.StreakResponse;
import com.heyganba.dto.streak.StudyActivityDayResponse;
import com.heyganba.model.entity.CharacterMastery;
import com.heyganba.service.CharacterMasteryService;
import com.heyganba.service.ExpService;
import com.heyganba.service.LeaderboardService;
import com.heyganba.service.StudyActivityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

/** Streak + heatmap + bảng xếp hạng + EXP/Rank + Character Mastery */
@RestController
@RequiredArgsConstructor
public class ProgressController {

    private static final int DEFAULT_HEATMAP_DAYS = 90;

    private final StudyActivityService studyActivityService;
    private final LeaderboardService leaderboardService;
    private final ExpService expService;
    private final CharacterMasteryService masteryService;

    @GetMapping("/streak")
    public ResponseEntity<ApiResponse<StreakResponse>> getStreak(
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.success(studyActivityService.getStreak(currentUser.getId())));
    }

    @GetMapping({"/streak/heatmap", "/study-activities/heatmap"})
    public ResponseEntity<ApiResponse<List<StudyActivityDayResponse>>> getHeatmap(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestParam(required = false, defaultValue = "" + DEFAULT_HEATMAP_DAYS) int days
    ) {
        List<StudyActivityDayResponse> heatmap = studyActivityService.getHeatmap(currentUser.getId(), days, Instant.now());
        return ResponseEntity.ok(ApiResponse.success(heatmap));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<ApiResponse<LeaderboardResponse>> getLeaderboard(
            @RequestParam(required = false, defaultValue = "20") int limit,
            @RequestParam(required = false) String classCode
    ) {
        return ResponseEntity.ok(ApiResponse.success(leaderboardService.getLeaderboard(limit, classCode)));
    }

    @GetMapping({"/exp", "/users/me/exp"})
    public ResponseEntity<ApiResponse<UserExpResponse>> getExp(
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.success(expService.calculateUserExp(currentUser.getId())));
    }

    @PostMapping({"/progress/practice", "/practice/record"})
    public ResponseEntity<ApiResponse<PracticeProgressResponse>> recordPractice(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody PracticeProgressRequest request
    ) {
        PracticeProgressResponse response = masteryService.recordPractice(currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/progress/mastery")
    public ResponseEntity<ApiResponse<List<CharacterMastery>>> getMastery(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestParam(required = false) String targetType
    ) {
        return ResponseEntity.ok(ApiResponse.success(masteryService.getUserMastery(currentUser.getId(), targetType)));
    }
}
