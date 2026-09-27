-- =========================================================
-- V5: Bảng tiến độ luyện viết Kanji theo user (Phase 3)
--
-- Ghi nhận số lần user luyện viết mỗi chữ Hán. Tách riêng khỏi `kanji` để không sửa schema lõi.
-- =========================================================

CREATE TABLE IF NOT EXISTS kanji_practice_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kanji_id BIGINT NOT NULL REFERENCES kanji(id) ON DELETE CASCADE,
    practice_count INT NOT NULL DEFAULT 0,
    last_practiced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_kanji_progress_user_kanji UNIQUE (user_id, kanji_id)
);

CREATE INDEX IF NOT EXISTS idx_kanji_progress_user ON kanji_practice_progress(user_id, last_practiced_at DESC);
