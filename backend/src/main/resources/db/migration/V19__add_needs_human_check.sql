-- =========================================================
-- V19: Quy trình duyệt nội dung "AI soạn" — cột needs_human_check + nguồn đối chiếu
--
-- BỐI CẢNH (chốt 27/09/2026): nội dung học thuật do AI soạn phải tự ĐỐI CHIẾU NGUỒN trước khi được coi là
-- đã kiểm. Quy trình mới:
--   1. Tự đối chiếu được nguồn (Dekiru/giao trình gốc `doc:#N`, Minna no Nihongo phần tương đương, hoặc
--      danh sách ngữ pháp JLPT N5/N4 công khai) + từ vựng/kanji tra chéo cách đọc qua từ điển uy tín
--      (Jisho/Weblio)  =>  ghi nguồn vào `source_ref` và set `needs_human_check = FALSE`.
--   2. KHÔNG đối chiếu được nguồn, hoặc câu có thể có >1 đáp án đúng theo ngữ cảnh  =>  giữ
--      `review_status = 'PENDING_REVIEW'` và set `needs_human_check = TRUE` (kèm lý do ngắn ở `review_note`).
--   3. Admin panel có tab riêng liệt kê các item `needs_human_check = TRUE` xếp lên đầu (GET /admin/review-queue).
--
-- Vì sao thêm cột vào cả kana/vocabulary/kanji: nội dung các bảng này cũng do AI soạn (quy tắc đọc, âm biến đổi,
-- nghĩa Hán Việt) nên cần cùng một cơ chế đánh dấu cho các đợt nội dung sau.
--
-- ⚠️ KHÔNG sửa file V12/V14 (đã áp ở staging — Flyway lưu checksum, sửa sẽ làm staging không validate được).
--    Việc gắn cờ cho nội dung V12/V14 nằm ở migration riêng trong `db/migration-staging`.
--
-- AN TOÀN KHI CHẠY Ở PRODUCTION: chỉ thêm cột có default + index, không đụng dữ liệu hiện có. Mọi bản ghi
-- đang có mặc định `needs_human_check = FALSE` (đúng với nội dung core đã duyệt qua V15).
-- =========================================================

ALTER TABLE grammar_exercises ADD COLUMN IF NOT EXISTS needs_human_check BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE grammar_exercises ADD COLUMN IF NOT EXISTS source_ref VARCHAR(160);
ALTER TABLE grammar_exercises ADD COLUMN IF NOT EXISTS review_note VARCHAR(400);

ALTER TABLE kana ADD COLUMN IF NOT EXISTS needs_human_check BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE kana ADD COLUMN IF NOT EXISTS source_ref VARCHAR(160);

ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS needs_human_check BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS source_ref VARCHAR(160);

ALTER TABLE kanji ADD COLUMN IF NOT EXISTS needs_human_check BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE kanji ADD COLUMN IF NOT EXISTS source_ref VARCHAR(160);

-- Index cho tab "cần kiểm tra" của admin: lọc needs_human_check = TRUE (số dòng nhỏ) nhưng vẫn nên có index
-- để câu truy vấn sắp theo (needs_human_check DESC, id) không phải quét toàn bảng.
CREATE INDEX IF NOT EXISTS idx_grammar_exercises_human_check
    ON grammar_exercises (needs_human_check, review_status, id);
CREATE INDEX IF NOT EXISTS idx_kana_human_check ON kana (needs_human_check);
CREATE INDEX IF NOT EXISTS idx_vocabulary_human_check ON vocabulary (needs_human_check);
CREATE INDEX IF NOT EXISTS idx_kanji_human_check ON kanji (needs_human_check);

COMMENT ON COLUMN grammar_exercises.needs_human_check IS
  'TRUE = câu do AI soạn nhưng CHƯA đối chiếu được nguồn (hoặc có thể có >1 đáp án) — phải để người biết tiếng Nhật duyệt trước.';
COMMENT ON COLUMN grammar_exercises.source_ref IS
  'Nguồn đã dùng để đối chiếu (vd: doc:#19 | jlpt-n5: i-adjectives) — để truy vết về sau.';
COMMENT ON COLUMN grammar_exercises.review_note IS
  'Lý do ngắn vì sao câu này cần người kiểm (chỉ điền khi needs_human_check = TRUE).';
