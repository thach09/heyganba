-- =========================================================
-- V22: Bổ sung từ vựng "trường học" (学校) và chữ Hán "校" (HIỆU) cho Bài 2
-- =========================================================

INSERT INTO vocabulary (word, reading, meaning, sino_vietnamese, example_sentence, example_reading, example_meaning, lesson_id, review_status, needs_human_check, source_ref)
SELECT '学校', 'がっこう', 'trường học', 'HỌC HIỆU', '明日、学校へ行きます。', 'ashita, gakkou e ikimasu', 'Ngày mai tôi sẽ đi đến trường.', l.id, 'APPROVED', false, 'Dekiru Nihongo Sơ cấp Bài 2'
FROM lessons l
WHERE l.slug = 'jpd113-b2'
ON CONFLICT (word, lesson_id) DO NOTHING;

INSERT INTO kanji (character, stroke_count, onyomi, kunyomi, sino_vietnamese, meaning, mnemonic, lesson_id, review_status, needs_human_check, source_ref)
SELECT '校', 10, 'コウ', NULL, 'HIỆU', 'trường học', 'Cây gỗ đứng trước nơi giao lưu học tập là trường học', l.id, 'APPROVED', false, 'Dekiru Nihongo Sơ cấp Bài 2'
FROM lessons l
WHERE l.slug = 'jpd113-b2'
ON CONFLICT (character) DO NOTHING;
