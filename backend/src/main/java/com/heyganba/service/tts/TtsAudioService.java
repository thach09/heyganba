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
 * Cache audio TTS: mỗi chuỗi kana chỉ gọi Google Translate TTS ĐÚNG MỘT LẦN, các lần sau đọc từ DB/R2.
 *
 * Đây là yêu cầu bắt buộc vì endpoint TTS của Google là không chính thức (không SLA/API key) — gọi lại mỗi lần
 * user phát âm thanh sẽ bị rate-limit/chặn IP.
 */
@Service
@RequiredArgsConstructor
public class TtsAudioService {

    private static final Logger log = LoggerFactory.getLogger(TtsAudioService.class);

    /**
     * Chỉ nhận chuỗi tiếng Nhật (kana/kanji) + số + dấu câu tiếng Nhật, tối đa {@value #MAX_TEXT_LENGTH} ký tự.
     * Chặn cả chuỗi rỗng và chuỗi Latin (tránh biến endpoint thành proxy TTS đa ngôn ngữ tuỳ tiện).
     */
    private static final Pattern ALLOWED_TEXT = Pattern.compile(
            "^[\\p{IsHiragana}\\p{IsKatakana}\\p{IsHan}0-9０-９\\s、。！？・ー〜～「」]+$");
    private static final int MAX_TEXT_LENGTH = 64;

    private final TtsAudioRepository ttsAudioRepository;
    private final AudioStorageService audioStorageService;
    private final TtsClient ttsClient;

    @Value("${app.tts.enabled:true}")
    private boolean enabled;

    /**
     * @param rawKanaText cách đọc bằng KANA (đúng ngữ cảnh bài học, KHÔNG phải kanji thô)
     * @return bản ghi cache (audio nằm ở `audio_bytes` hoặc `public_url` trên R2)
     */
    @Transactional
    public TtsAudio getOrCreate(String rawKanaText) {
        if (!enabled) {
            throw new BadRequestException("Tính năng đọc tiếng Nhật đang tắt.");
        }

        String kanaText = rawKanaText == null ? "" : rawKanaText.trim();
        if (kanaText.isEmpty() || kanaText.length() > MAX_TEXT_LENGTH || !ALLOWED_TEXT.matcher(kanaText).matches()) {
            throw new BadRequestException("Chỉ nhận chuỗi tiếng Nhật (kana/kanji) tối đa "
                    + MAX_TEXT_LENGTH + " ký tự.");
        }

        String cacheKey = AudioStorageService.cacheKeyOf(kanaText);
        return ttsAudioRepository.findByCacheKey(cacheKey)
                .orElseGet(() -> {
                    log.info("Sinh audio TTS lần đầu cho chuỗi {} ký tự (cache key {})", kanaText.length(), cacheKey);
                    byte[] audio = ttsClient.synthesize(kanaText);
                    return audioStorageService.store(cacheKey, kanaText, audio);
                });
    }
}
