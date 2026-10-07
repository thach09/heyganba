package com.heyganba.controller;

import com.heyganba.common.response.ApiResponse;
import com.heyganba.config.UserPrincipal;
import com.heyganba.dto.user.UpdateClassCodeRequest;
import com.heyganba.dto.user.UserProfileResponse;
import com.heyganba.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final com.heyganba.service.LearningPreferenceService preferences;

    @GetMapping("/me/preferences")
    public ApiResponse<com.heyganba.service.LearningPreferenceService.Preferences> getPreferences(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ApiResponse.success(preferences.get(currentUser.getId()));
    }

    @PutMapping("/me/preferences")
    public ApiResponse<com.heyganba.service.LearningPreferenceService.Preferences> updatePreferences(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody com.heyganba.dto.user.LearningPreferenceRequest request) {
        return ApiResponse.success(preferences.update(currentUser.getId(), request));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        UserProfileResponse profile = userService.getProfile(currentUser);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @PutMapping("/me/class-code")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateClassCode(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody UpdateClassCodeRequest request
    ) {
        UserProfileResponse profile = userService.updateClassCode(currentUser, request.classCode());
        return ResponseEntity.ok(ApiResponse.success(profile, "Class code updated"));
    }
}
