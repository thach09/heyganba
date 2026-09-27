package com.heyganba.service;

import com.heyganba.common.exception.ResourceNotFoundException;
import com.heyganba.config.UserPrincipal;
import com.heyganba.dto.user.UserProfileResponse;
import com.heyganba.model.entity.User;
import com.heyganba.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(UserPrincipal currentUser) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        return toProfile(user);
    }

    /** Cập nhật mã lớp học (text tự do, cho phép xoá bằng chuỗi rỗng/null). */
    @Transactional
    public UserProfileResponse updateClassCode(UserPrincipal currentUser, String classCode) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        String normalized = (classCode == null || classCode.isBlank()) ? null : classCode.trim();
        user.setClassCode(normalized);
        userRepository.save(user);

        return toProfile(user);
    }

    private UserProfileResponse toProfile(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().getName().name())
                .isActive(user.getIsActive())
                .classCode(user.getClassCode())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
