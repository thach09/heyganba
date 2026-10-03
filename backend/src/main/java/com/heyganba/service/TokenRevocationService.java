package com.heyganba.service;

import com.heyganba.config.JwtTokenProvider;
import com.heyganba.model.entity.RevokedToken;
import com.heyganba.repository.RevokedTokenRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Date;

@Service
@RequiredArgsConstructor
public class TokenRevocationService {

    private static final Logger log = LoggerFactory.getLogger(TokenRevocationService.class);

    private final RevokedTokenRepository revokedTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public void revokeToken(String token) {
        if (token == null || token.isBlank()) {
            return;
        }

        String jti = jwtTokenProvider.getJtiFromJwt(token);
        Date expiration = jwtTokenProvider.getExpirationFromJwt(token);

        if (jti != null && expiration != null) {
            Instant expiresAt = expiration.toInstant();
            // Nếu token chưa quá hạn mới cần lưu vào danh sách thu hồi
            if (expiresAt.isAfter(Instant.now())) {
                revokedTokenRepository.save(
                        RevokedToken.builder()
                                .jti(jti)
                                .expiresAt(expiresAt)
                                .build()
                );
                log.info("Revoked token with jti: {}, expiresAt: {}", jti, expiresAt);
            }
        }
    }

    @Transactional
    public void revokeTokens(String accessToken, String refreshToken) {
        if (accessToken != null && !accessToken.isBlank()) {
            revokeToken(accessToken);
        }
        if (refreshToken != null && !refreshToken.isBlank()) {
            revokeToken(refreshToken);
        }
    }

    @Transactional(readOnly = true)
    public boolean isRevoked(String jti) {
        if (jti == null || jti.isBlank()) {
            return false;
        }
        return revokedTokenRepository.existsByJti(jti);
    }

    /**
     * Dọn dẹp các token đã quá hạn tự nhiên khỏi bảng revoked_tokens mỗi giờ một lần
     * để bảng không phình to theo thời gian.
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void purgeExpiredRevokedTokens() {
        Instant now = Instant.now();
        int deleted = revokedTokenRepository.deleteExpiredTokens(now);
        if (deleted > 0) {
            log.info("Purged {} expired revoked tokens at {}", deleted, now);
        }
    }
}
