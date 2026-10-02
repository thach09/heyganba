package com.heyganba.service;

import com.heyganba.common.exception.BadRequestException;
import com.heyganba.config.JwtTokenProvider;
import com.heyganba.config.UserPrincipal;
import com.heyganba.dto.auth.AuthResponse;
import com.heyganba.dto.auth.LoginRequest;
import com.heyganba.dto.auth.RefreshTokenRequest;
import com.heyganba.dto.auth.RegisterRequest;
import com.heyganba.dto.auth.TwoFactorSetupResponse;
import com.heyganba.model.entity.Role;
import com.heyganba.model.entity.Streak;
import com.heyganba.model.entity.User;
import com.heyganba.model.enums.RoleName;
import com.heyganba.repository.RoleRepository;
import com.heyganba.repository.StreakRepository;
import com.heyganba.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final StreakRepository streakRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final CustomUserDetailsService userDetailsService;
    private final TokenRevocationService tokenRevocationService;
    private final TwoFactorAuthService twoFactorAuthService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email is already registered: " + request.getEmail());
        }

        Role userRole = roleRepository.findByName(RoleName.ROLE_USER)
                .orElseThrow(() -> new BadRequestException("Default USER role not found in database"));

        User user = User.builder()
                .email(request.getEmail().toLowerCase().trim())
                .fullName(request.getFullName().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(userRole)
                .isActive(true)
                .classCode(normalizeClassCode(request.getClassCode()))
                .build();

        User savedUser = userRepository.save(user);

        // Initialize user streak
        Streak initialStreak = Streak.builder()
                .user(savedUser)
                .currentStreak(0)
                .longestStreak(0)
                .build();
        streakRepository.save(initialStreak);

        UserPrincipal userPrincipal = UserPrincipal.create(savedUser);
        String accessToken = tokenProvider.generateAccessToken(userPrincipal);
        String refreshToken = tokenProvider.generateRefreshToken(userPrincipal);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(savedUser.getId())
                .email(savedUser.getEmail())
                .fullName(savedUser.getFullName())
                .role(savedUser.getRole().getName().name())
                .classCode(savedUser.getClassCode())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        email,
                        request.getPassword()
                )
        );

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (Boolean.TRUE.equals(user.getIsTwoFactorEnabled())) {
            if (request.getTwoFactorCode() == null || request.getTwoFactorCode().isBlank()) {
                return AuthResponse.builder()
                        .twoFactorRequired(true)
                        .twoFactorEnabled(true)
                        .email(user.getEmail())
                        .build();
            }

            boolean valid = twoFactorAuthService.verifyCode(user.getTwoFactorSecret(), request.getTwoFactorCode().trim());
            if (!valid) {
                throw new org.springframework.security.authentication.BadCredentialsException("Mã xác thực 2FA không chính xác");
            }
        }

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String accessToken = tokenProvider.generateAccessToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(userPrincipal);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(userPrincipal.getId())
                .email(userPrincipal.getUsername())
                .fullName(userPrincipal.getFullName())
                .role(userPrincipal.getAuthorities().iterator().next().getAuthority())
                .classCode(userPrincipal.getClassCode())
                .twoFactorRequired(false)
                .twoFactorEnabled(user.getIsTwoFactorEnabled())
                .build();
    }

    @Transactional
    public TwoFactorSetupResponse setupTwoFactor(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        String secret = user.getTwoFactorSecret();
        if (secret == null || secret.isBlank() || !Boolean.TRUE.equals(user.getIsTwoFactorEnabled())) {
            secret = twoFactorAuthService.generateSecret();
            user.setTwoFactorSecret(secret);
            userRepository.save(user);
        }

        String otpAuthUrl = twoFactorAuthService.getOtpAuthUrl(user.getEmail(), secret);
        return TwoFactorSetupResponse.builder()
                .secret(secret)
                .otpAuthUrl(otpAuthUrl)
                .enabled(Boolean.TRUE.equals(user.getIsTwoFactorEnabled()))
                .build();
    }

    @Transactional
    public void enableTwoFactor(Long userId, String code) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (user.getTwoFactorSecret() == null) {
            throw new BadRequestException("Vui lòng khởi tạo mã 2FA trước khi kích hoạt");
        }

        boolean valid = twoFactorAuthService.verifyCode(user.getTwoFactorSecret(), code != null ? code.trim() : "");
        if (!valid) {
            throw new BadRequestException("Mã xác thực 2FA không chính xác");
        }

        user.setIsTwoFactorEnabled(true);
        userRepository.save(user);
    }

    @Transactional
    public void disableTwoFactor(Long userId, String code) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (!Boolean.TRUE.equals(user.getIsTwoFactorEnabled())) {
            return;
        }

        boolean valid = twoFactorAuthService.verifyCode(user.getTwoFactorSecret(), code != null ? code.trim() : "");
        if (!valid) {
            throw new BadRequestException("Mã xác thực 2FA không chính xác");
        }

        user.setIsTwoFactorEnabled(false);
        user.setTwoFactorSecret(null);
        userRepository.save(user);
    }

    /**
     * Reset 2FA bằng MẬT KHẨU hiện tại của chính admin (dùng khi mất thiết bị Authenticator).
     *
     * Vì sao xác thực bằng mật khẩu chứ không bằng mã TOTP: khi đã mất điện thoại thì không thể sinh mã TOTP —
     * đòi TOTP sẽ khoá admin ra khỏi chính tài khoản của mình. Bù lại, vẫn phải xác thực LẠI (không tin mỗi JWT
     * còn hạn) để một token bị lộ không đủ để tắt 2FA.
     *
     * Sau khi reset: `isTwoFactorEnabled = false` + `twoFactorSecret = null` ⇒ lần setup tiếp theo sinh secret
     * MỚI hoàn toàn (không giữ secret cũ), nên phải quét lại QR từ đầu.
     */
    @Transactional
    public void resetTwoFactor(Long userId, String password) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (password == null || password.isBlank() || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu không chính xác");
        }

        user.setIsTwoFactorEnabled(false);
        user.setTwoFactorSecret(null);
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public TwoFactorSetupResponse getTwoFactorStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));
        boolean enabled = Boolean.TRUE.equals(user.getIsTwoFactorEnabled());
        // Chỉ tiết lộ trạng thái bật/tắt, KHÔNG BAO GIỜ trả về secret qua status endpoint
        return TwoFactorSetupResponse.builder()
                .enabled(enabled)
                .secret(null)
                .otpAuthUrl(null)
                .build();
    }

    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String token = request.getRefreshToken();
        if (!tokenProvider.validateToken(token) || !tokenProvider.isRefreshToken(token)) {
            throw new BadRequestException("Invalid or expired refresh token");
        }

        String jti = tokenProvider.getJtiFromJwt(token);
        if (jti != null && tokenRevocationService.isRevoked(jti)) {
            throw new org.springframework.security.authentication.BadCredentialsException("Refresh token has been revoked");
        }

        String username = tokenProvider.getUsernameFromJwt(token);
        UserPrincipal userPrincipal = (UserPrincipal) userDetailsService.loadUserByUsername(username);

        if (!userPrincipal.isEnabled()) {
            throw new BadRequestException("Account is disabled");
        }

        String newAccessToken = tokenProvider.generateAccessToken(userPrincipal);
        String newRefreshToken = tokenProvider.generateRefreshToken(userPrincipal);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .userId(userPrincipal.getId())
                .email(userPrincipal.getUsername())
                .fullName(userPrincipal.getFullName())
                .role(userPrincipal.getAuthorities().iterator().next().getAuthority())
                .classCode(userPrincipal.getClassCode())
                .build();
    }

    public void logout(String accessToken, String refreshToken) {
        tokenRevocationService.revokeTokens(accessToken, refreshToken);
    }

    /** Mã lớp là text tự do: chỉ trim, để trống thì lưu null (không gán lớp mặc định). */
    private static String normalizeClassCode(String classCode) {
        if (classCode == null || classCode.isBlank()) {
            return null;
        }
        return classCode.trim();
    }
}
