-- =========================================================
-- V21: Cache audio TTS (Google Translate TTS) — KHÔNG gọi lại API mỗi lần user phát âm thanh
--
-- LÝ DO: TTS được chuyển sang endpoint không chính thức `translate.google.com/translate_tts`
-- (không SLA, không API key) ⇒ BẮT BUỘC cache lại file sau lần gọi đầu tiên, nếu không sẽ bị rate-limit/chặn IP.
--
-- Quy tắc ngữ âm (bắt buộc): đầu vào TTS phải là CHUỖI KANA (hiragana/katakana) đã đúng ngữ cảnh bài học,
-- KHÔNG truyền thẳng chữ kanji (TTS sẽ đọc theo cách đọc phổ biến nhất, sai với từ ghép). Vì vậy cache khoá
-- theo `cache_key = sha256(kana_text)`; cùng một chuỗi kana chỉ sinh 1 file audio.
--
-- LƯU TRỮ: nếu cấu hình Cloudflare R2 (`R2_ACCOUNT_ID` + `R2_API_TOKEN` + `R2_BUCKET` + `R2_PUBLIC_BASE_URL`)
-- thì file được đẩy lên R2 và `public_url` giữ URL CDN (frontend phát trực tiếp từ CDN). Chưa cấu hình R2 thì
-- file nằm trong cột `audio_bytes` của bảng này và được phục vụ qua `GET /api/v1/audio/tts?text=...`.
--
-- AN TOÀN Ở PRODUCTION: chỉ tạo bảng mới, không đụng dữ liệu hiện có.
-- =========================================================

CREATE TABLE IF NOT EXISTS tts_audio (
    id            BIGSERIAL PRIMARY KEY,
    cache_key     VARCHAR(80)  NOT NULL,
    kana_text     VARCHAR(120) NOT NULL,
    content_type  VARCHAR(40)  NOT NULL DEFAULT 'audio/mpeg',
    audio_bytes   BYTEA,
    public_url    VARCHAR(500),
    storage_kind  VARCHAR(20)  NOT NULL DEFAULT 'db',
    source        VARCHAR(40)  NOT NULL DEFAULT 'google-translate-tts',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_tts_audio_cache_key UNIQUE (cache_key)
);

COMMENT ON TABLE tts_audio IS
  'Cache file audio TTS theo chuỗi KANA (khoá = sha256) — tránh gọi lại Google Translate TTS mỗi lần phát.';
COMMENT ON COLUMN tts_audio.kana_text IS
  'Chuỗi kana đã truyền cho TTS (không phải kanji thô) — đúng ngữ cảnh bài học.';
COMMENT ON COLUMN tts_audio.storage_kind IS
  'db = file nằm trong cột audio_bytes, r2 = file trên Cloudflare R2 (public_url là URL CDN).';
