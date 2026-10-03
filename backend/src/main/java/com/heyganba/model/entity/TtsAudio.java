package com.heyganba.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Cache 1 file audio TTS theo chuỗi KANA (khoá = sha256 của kana text).
 *
 * Vì sao khoá theo kana text chứ không theo id thực thể: cùng một cách đọc (vd よっか) có thể dùng cho nhiều
 * thẻ (ngày 4, từ vựng, câu ví dụ), và TTS chỉ cần 1 file cho mỗi cách đọc.
 *
 * TTS là endpoint KHÔNG chính thức ⇒ mọi lần phát phải đọc từ cache này, chỉ gọi Google ở lần đầu.
 */
@Entity
@Table(name = "tts_audio")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TtsAudio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** sha256(kana_text) — duy nhất, dùng để tra cache. */
    @Column(name = "cache_key", nullable = false, length = 80, unique = true)
    private String cacheKey;

    /** Chuỗi kana đã truyền cho TTS (KHÔNG phải kanji thô). */
    @Column(name = "kana_text", nullable = false, length = 120)
    private String kanaText;

    @Builder.Default
    @Column(name = "content_type", nullable = false, length = 40)
    private String contentType = "audio/mpeg";

    /** File audio (chỉ dùng khi storageKind = 'db'). */
    @Column(name = "audio_bytes")
    private byte[] audioBytes;

    /** URL CDN trên Cloudflare R2 (chỉ có khi storageKind = 'r2'). */
    @Column(name = "public_url", length = 500)
    private String publicUrl;

    @Builder.Default
    @Column(name = "storage_kind", nullable = false, length = 20)
    private String storageKind = "db";

    @Builder.Default
    @Column(name = "source", nullable = false, length = 40)
    private String source = "google-translate-tts";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
