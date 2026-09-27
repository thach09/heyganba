-- =========================================================
-- V11: (1) Ẩn số gốc của tài liệu nguồn vào `grammar_rules.source_ref` và đánh số lại liên tục
--         theo đúng thứ tự dạy trong app; (2) thêm `users.class_code` cho leaderboard theo lớp.
--
-- Quyết định của Thach (đã chốt):
--  - UI chỉ hiển thị số liên tục 1..n theo thứ tự dạy; số gốc của tài liệu (có khoảng trống 5→7)
--    được giữ nội bộ ở `source_ref` và KHÔNG trả ra API.
--  - `class_code` là text tự do, nullable (user có thể chưa thuộc lớp nào).
--  - Migration theo hướng backward-compatible: KHÔNG xoá cột `original_number` (dữ liệu cũ vẫn còn nguyên).
-- =========================================================

ALTER TABLE grammar_rules ADD COLUMN IF NOT EXISTS source_ref VARCHAR(50);

-- Giữ lại số gốc (đánh dấu rõ nguồn) trước khi renumber.
UPDATE grammar_rules
SET source_ref = 'doc:#' || original_number
WHERE original_number IS NOT NULL
  AND source_ref IS NULL;

CREATE INDEX IF NOT EXISTS idx_grammar_rules_source_ref ON grammar_rules(source_ref);

-- Đánh số lại `order_index` liên tục 1..n theo thứ tự dạy (thứ tự bài học → thứ tự hiện tại trong bài).
WITH numbered AS (
    SELECT g.id AS rule_id,
           ROW_NUMBER() OVER (ORDER BY l.order_index ASC, g.order_index ASC, g.id ASC) AS new_order
    FROM grammar_rules g
    JOIN lessons l ON l.id = g.lesson_id
)
UPDATE grammar_rules g
SET order_index = n.new_order
FROM numbered n
WHERE g.id = n.rule_id;

-- Leaderboard theo lớp học (Phase 5) — text tự do, nullable.
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_code VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_users_class_code ON users(class_code);
