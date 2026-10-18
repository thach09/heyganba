package com.heyganba.controller;
import com.heyganba.common.response.ApiResponse;
import com.heyganba.config.UserPrincipal;
import com.heyganba.service.LearningInsightsService;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController @RequiredArgsConstructor @Validated
@RequestMapping("/progress")
public class LearningInsightsController {
    private final LearningInsightsService service;
    @GetMapping("/insights")
    public ApiResponse<LearningInsightsService.Insights> insights(@AuthenticationPrincipal UserPrincipal user) { return ApiResponse.success(service.insights(user.getId())); }
    @PostMapping("/quests/{code}/claim")
    public ApiResponse<LearningInsightsService.Insights> claim(@AuthenticationPrincipal UserPrincipal user,@PathVariable @Pattern(regexp="SRS|WRITING|GRAMMAR_EXAM") String code) { return ApiResponse.success(service.claim(user.getId(),code)); }
    @GetMapping("/companion/wallet")
    public ApiResponse<LearningInsightsService.Wallet> wallet(@AuthenticationPrincipal UserPrincipal user) { return ApiResponse.success(service.getWallet(user.getId())); }
    @PostMapping("/companion/feed")
    public ApiResponse<LearningInsightsService.Wallet> feed(@AuthenticationPrincipal UserPrincipal user) { return ApiResponse.success(service.feed(user.getId())); }
}
