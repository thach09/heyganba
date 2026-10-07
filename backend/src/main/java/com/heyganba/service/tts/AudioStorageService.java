package com.heyganba.service.tts;

import com.heyganba.model.entity.TtsAudio;
import com.heyganba.repository.TtsAudioRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;

/**
 * Lưu file audio TTS vào Cloudflare R2 (nếu đã cấu hình) — chưa cấu hình thì lưu trong DB.
 *
 * Cách cấu hình R2 (đủ 4 biến thì mới bật, thiếu 1 biến là tự động dùng DB):
 *   R2_ACCOUNT_ID, R2_API_TOKEN, R2_BUCKET, R2_PUBLIC_BASE_URL
 *
 * Vì sao dùng REST API của Cloudflare thay vì SDK S3: tránh thêm dependency ngoài phạm vi (AGENTS.md), và
 * upload 1 object nhỏ chỉ cần 1 request PUT.
 */
@Service
@RequiredArgsConstructor
public class AudioStorageService {

    private static final Logger log = LoggerFactory.getLogger(AudioStorageService.class);
    private static final String R2_API = "https://api.cloudflare.com/client/v4/accounts/%s/r2/buckets/%s/objects/%s";

    private final TtsAudioRepository ttsAudioRepository;

    @Value("${app.tts.r2.account-id:}")
    private String accountId;

    @Value("${app.tts.r2.api-token:}")
    private String apiToken;

    @Value("${app.tts.r2.bucket:}")
    private String bucket;

    @Value("${app.tts.r2.public-base-url:}")
    private String publicBaseUrl;

    @Transactional
    public TtsAudio store(String cacheKey, String kanaText, byte[] audioBytes) {
        String publicUrl = uploadToR2(cacheKey, audioBytes);

        TtsAudio audio = TtsAudio.builder()
                .cacheKey(cacheKey)
                .kanaText(kanaText)
                .contentType("audio/mpeg")
                .publicUrl(publicUrl)
                .storageKind(publicUrl == null ? "db" : "r2")
                .audioBytes(publicUrl == null ? audioBytes : null)
                .source("google-translate-tts")
                .build();

        return ttsAudioRepository.save(audio);
    }

    /** @return URL CDN công khai, hoặc null nếu R2 chưa được cấu hình / upload lỗi (fallback lưu DB). */
    private String uploadToR2(String cacheKey, byte[] audioBytes) {
        if (isBlank(accountId) || isBlank(apiToken) || isBlank(bucket) || isBlank(publicBaseUrl)) {
            return null;
        }

        String objectKey = "audio/tts/" + cacheKey + ".mp3";
        String url = String.format(R2_API, accountId, bucket, objectKey);

        try {
            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .header("Authorization", "Bearer " + apiToken)
                    .header("Content-Type", "audio/mpeg")
                    .timeout(Duration.ofSeconds(20))
                    .PUT(HttpRequest.BodyPublishers.ofByteArray(audioBytes))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() / 100 != 2) {
                log.warn("audio_storage_upload_failed status={}", response.statusCode());
                return null;
            }
            return trimTrailingSlash(publicBaseUrl) + "/" + objectKey;
        } catch (Exception ex) {
            log.warn("audio_storage_fallback category={}", ex.getClass().getSimpleName());
            return null;
        }
    }

    private static String trimTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    /** Khoá cache = sha256(chuỗi kana) — cùng cách đọc chỉ sinh 1 file. */
    public static String cacheKeyOf(String kanaText) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(kanaText.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Thiếu SHA-256 trong JVM", ex);
        }
    }
}
