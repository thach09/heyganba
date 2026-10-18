package com.heyganba.service.tts;

import com.heyganba.common.exception.BadRequestException;
import com.heyganba.model.entity.TtsAudio;
import com.heyganba.repository.TtsAudioRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.regex.Pattern;

/**
 * Cache audio TTS: mỗi chuỗi chữ Hán chỉ gọi Google Translate TTS ĐÚNG MỘT LẦN, các lần sau đọc từ DB/R2.
 *
 * Đây là yêu cầu bắt buộc vì endpoint TTS của Google là không chính thức (không SLA/API key) — gọi lại mỗi lần
 * user phát âm thanh sẽ bị rate-limit/chặn IP.
 */
@Service
@RequiredArgsConstructor
public class TtsAudioService {

    private static final Logger log = LoggerFactory.getLogger(TtsAudioService.class);

    /**
     * Chỉ nhận chuỗi tiếng Trung + số + dấu câu tiếng Trung, tối đa {@value #MAX_TEXT_LENGTH} ký tự.
     * Chặn cả chuỗi rỗng và chuỗi Latin (tránh biến endpoint thành proxy TTS đa ngôn ngữ tuỳ tiện).
     */
    private static final Pattern ALLOWED_TEXT = Pattern.compile(
            "^[\\p{IsHan}0-9０-９\\s，。！？、；：“”‘’（）]+$");
    private static final int MAX_TEXT_LENGTH = 64;

    private final TtsAudioRepository ttsAudioRepository;
    private final AudioStorageService audioStorageService;
    private final TtsClient ttsClient;

    @Value("${app.tts.enabled:true}")
    private boolean enabled;

    /**
     * @param rawText câu tiếng Trung cần phát âm Quan thoại
     * @return bản ghi cache (audio nằm ở `audio_bytes` hoặc `public_url` trên R2)
     */
    @Transactional
    public TtsAudio getOrCreate(String rawText) {
        if (!enabled) {
            throw new BadRequestException("Tính năng đọc tiếng Trung đang tắt.");
        }

        String text = rawText == null ? "" : rawText.trim();
        if (text.isEmpty() || text.length() > MAX_TEXT_LENGTH || !ALLOWED_TEXT.matcher(text).matches()) {
            throw new BadRequestException("Chỉ nhận chuỗi tiếng Trung tối đa "
                    + MAX_TEXT_LENGTH + " ký tự.");
        }

        String cacheKey = AudioStorageService.cacheKeyOf("zh-CN:" + text);
        return ttsAudioRepository.findByCacheKey(cacheKey)
                .orElseGet(() -> {
                    log.info("Sinh audio TTS lần đầu cho chuỗi {} ký tự (cache key {})", text.length(), cacheKey);
                    byte[] audio = ttsClient.synthesize(text);
                    return audioStorageService.store(cacheKey, text, audio);
                });
    }
}
