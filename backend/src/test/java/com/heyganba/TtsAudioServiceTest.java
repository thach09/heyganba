package com.heyganba;

import com.heyganba.common.exception.BadRequestException;
import com.heyganba.model.entity.TtsAudio;
import com.heyganba.repository.TtsAudioRepository;
import com.heyganba.service.tts.AudioStorageService;
import com.heyganba.service.tts.TtsAudioService;
import com.heyganba.service.tts.TtsClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test cache audio TTS (quy trình mới 27/09/2026).
 *
 * Điểm quan trọng nhất: TTS của Google là endpoint KHÔNG chính thức ⇒ mỗi chuỗi kana chỉ được gọi MỘT lần,
 * các lần sau phải đọc từ cache (DB/R2), và đầu vào phải là chuỗi tiếng Nhật ngắn.
 */
@ExtendWith(MockitoExtension.class)
class TtsAudioServiceTest {

    @Mock
    private TtsAudioRepository ttsAudioRepository;

    @Mock
    private AudioStorageService audioStorageService;

    @Mock
    private TtsClient ttsClient;

    private TtsAudioService ttsAudioService;

    @BeforeEach
    void setUp() throws Exception {
        ttsAudioService = new TtsAudioService(ttsAudioRepository, audioStorageService, ttsClient);
        Field enabled = TtsAudioService.class.getDeclaredField("enabled");
        enabled.setAccessible(true);
        enabled.setBoolean(ttsAudioService, true);
    }

    @Test
    @DisplayName("Lần đầu: gọi TTS 1 lần rồi lưu cache; lần sau: đọc cache, KHÔNG gọi Google lần nữa")
    void generatesOnceThenServesFromCache() {
        byte[] mp3 = {1, 2, 3};
        TtsAudio cached = TtsAudio.builder()
                .id(9L)
                .cacheKey(AudioStorageService.cacheKeyOf("よっか"))
                .kanaText("よっか")
                .audioBytes(mp3)
                .storageKind("db")
                .build();

        when(ttsAudioRepository.findByCacheKey(anyString())).thenReturn(Optional.empty(), Optional.of(cached));
        when(ttsClient.synthesize("よっか")).thenReturn(mp3);
        when(audioStorageService.store(anyString(), anyString(), any(byte[].class))).thenReturn(cached);

        TtsAudio first = ttsAudioService.getOrCreate("よっか");
        TtsAudio second = ttsAudioService.getOrCreate(" よっか ");

        assertThat(first.getKanaText()).isEqualTo("よっか");
        assertThat(second.getAudioBytes()).isEqualTo(mp3);
        verify(ttsClient, times(1)).synthesize("よっか");
        verify(audioStorageService, times(1)).store(anyString(), anyString(), any(byte[].class));
    }

    @Test
    @DisplayName("Chặn chuỗi không phải tiếng Nhật (tránh biến endpoint thành proxy TTS đa ngôn ngữ)")
    void rejectsNonJapaneseText() {
        assertThatThrownBy(() -> ttsAudioService.getOrCreate("Hello world"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Chặn chuỗi quá dài (> 64 ký tự) và chuỗi rỗng")
    void rejectsTooLongOrEmptyText() {
        String tooLong = "き".repeat(65);

        assertThatThrownBy(() -> ttsAudioService.getOrCreate(tooLong))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> ttsAudioService.getOrCreate("   "))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Cache key ổn định theo chuỗi kana (cùng cách đọc ⇒ cùng 1 file audio)")
    void cacheKeyIsStableForSameKanaText() {
        assertThat(AudioStorageService.cacheKeyOf("よっか")).isEqualTo(AudioStorageService.cacheKeyOf("よっか"));
        assertThat(AudioStorageService.cacheKeyOf("よっか")).isNotEqualTo(AudioStorageService.cacheKeyOf("よんにち"));
    }
}
