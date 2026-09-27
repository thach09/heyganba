package com.heyganba.controller;

import com.heyganba.common.response.ApiResponse;
import com.heyganba.config.UserPrincipal;
import com.heyganba.dto.leaderboard.LeaderboardResponse;
import com.heyganba.dto.streak.StreakResponse;
import com.heyganba.dto.streak.StudyActivityDayResponse;
import com.heyganba.service.LeaderboardService;
import com.heyganba.service.StudyActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

/** Streak + heatmap + bảng xếp hạng (Phase 5). */
@RestController
@RequiredArgsConstructor
public class ProgressController {

    private static final int DEFAULT_HEATMAP_DAYS = 90;

    private final StudyActivityService studyActivityService;
    private final LeaderboardService leaderboardService;

    @GetMapping("/streak")
    public ResponseEntity<ApiResponse<StreakResponse>> getStreak(
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.success(studyActivityService.getStreak(currentUser.getId())));
    }

    @GetMapping("/streak/heatmap")
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
}
