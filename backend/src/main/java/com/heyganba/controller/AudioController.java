package com.heyganba.controller;

import com.heyganba.common.exception.TooManyRequestsException;
import com.heyganba.config.UserPrincipal;
import com.heyganba.model.entity.TtsAudio;
import com.heyganba.service.RateLimiterService;
import com.heyganba.service.tts.TtsAudioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.Duration;

/**
 * Audio TTS cho tiếng Nhật (thay Web Speech API của trình duyệt bằng Google Translate TTS + cache).
 *
 * Bảo vệ:
 *  - Endpoint KHÔNG nằm trong danh sách public của `SecurityConfig` ⇒ phải đăng nhập mới gọi được (tránh bị
 *    dùng làm proxy TTS miễn phí).
 *  - Chỉ nhận chuỗi kana/kanji ngắn (kiểm ở {@link TtsAudioService}).
 *  - Rate limit theo user: 120 request/phút.
 *  - File sinh ra được cache (DB hoặc Cloudflare R2) nên mỗi chuỗi chỉ gọi Google 1 lần.
 */
@RestController
@RequestMapping("/audio")
@RequiredArgsConstructor
public class AudioController {

    private static final int TTS_RATE_LIMIT_PER_MINUTE = 120;
    private static final Duration TTS_RATE_WINDOW = Duration.ofMinutes(1);

    private final TtsAudioService ttsAudioService;
    private final RateLimiterService rateLimiterService;

    /** Cách đọc bằng kana: `/api/v1/audio/tts?text=よっか`. */
    @GetMapping("/tts")
    public ResponseEntity<byte[]> getTts(
            @RequestParam("text") String text,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        String rateKey = "audio-tts:" + (currentUser != null ? "user:" + currentUser.getId() : "anonymous");
        if (!rateLimiterService.tryConsume(rateKey, TTS_RATE_LIMIT_PER_MINUTE, TTS_RATE_WINDOW)) {
            throw new TooManyRequestsException("Bạn thao tác quá nhanh. Vui lòng thử lại sau ít giây.");
        }

        TtsAudio audio = ttsAudioService.getOrCreate(text);

        // Đã có trên R2/CDN ⇒ chuyển hướng để trình duyệt tải trực tiếp từ CDN, không tốn băng thông backend.
        if (audio.getPublicUrl() != null && !audio.getPublicUrl().isBlank()) {
            return ResponseEntity.status(302).location(URI.create(audio.getPublicUrl())).build();
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(audio.getContentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                .body(audio.getAudioBytes());
    }
}
