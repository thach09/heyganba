-- =========================================================
-- V13: Trạng thái review nội dung (bắt buộc cho luồng "chờ duyệt nội dung tiếng Nhật")
--
-- LÝ DO: toàn bộ nội dung hiện có (V3 kana, V4 từ vựng, V7 kanji, V8/V9/V12 ngữ pháp) là BẢN NHÁP do người
-- soạn tự viết, CHƯA được giáo viên tiếng Nhật duyệt. Cột `review_status` giúp:
--   1. Hệ thống tự báo trạng thái (endpoint GET /content/review-status + badge "chờ duyệt" trên UI).
--   2. Phân biệt rõ nội dung nào đã duyệt trước khi public rộng.
--
-- Giá trị: 'PENDING_REVIEW' (mặc định, chờ duyệt) | 'APPROVED' (đã duyệt).
-- Mặc định PENDING_REVIEW cho mọi bản ghi hiện có ⇒ không có nội dung nào bị coi nhầm là "đã sẵn sàng".
--
-- Migration này nằm ở `db/migration` (đã duyệt) nên chạy ở CẢ production: chỉ thêm cột nullable-default, an toàn.
-- =========================================================

ALTER TABLE kana ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'PENDING_REVIEW';
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'PENDING_REVIEW';
ALTER TABLE kanji ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'PENDING_REVIEW';
ALTER TABLE grammar_rules ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'PENDING_REVIEW';
ALTER TABLE grammar_exercises ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'PENDING_REVIEW';

CREATE INDEX IF NOT EXISTS idx_kana_review_status ON kana (review_status);
CREATE INDEX IF NOT EXISTS idx_vocabulary_review_status ON vocabulary (review_status);
CREATE INDEX IF NOT EXISTS idx_kanji_review_status ON kanji (review_status);
CREATE INDEX IF NOT EXISTS idx_grammar_rules_review_status ON grammar_rules (review_status);
CREATE INDEX IF NOT EXISTS idx_grammar_exercises_review_status ON grammar_exercises (review_status);
