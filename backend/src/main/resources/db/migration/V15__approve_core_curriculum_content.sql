-- =========================================================
-- V15: Phe duyet noi dung hoc tap cot loi Dekiru Nihongo (bai 1-7)
--
-- Mo khoa noi dung giao trinh co ban cho tat ca hoc vien (ContentAccess):
--   - Kana (V3): 247 ky tu day du
--   - Tu vung (V4): 44 tu khoi diem bai 1-7
--   - Kanji (V7): 63 chu Han bai 1-7
--   - Ngu phap (V8): 32 diem ngu phap JPD113/JPD123
--   - Bai tap ngu phap (V9): 64 cau khoi diem cua 32 diem ngu phap
--
-- Cac bai tap mo rong o staging (V12, V14) van giu PENDING_REVIEW
-- cho den khi duoc giao vien phe duyet bo sung.
-- =========================================================

UPDATE kana SET review_status = 'APPROVED';
UPDATE vocabulary SET review_status = 'APPROVED';
UPDATE kanji SET review_status = 'APPROVED';
UPDATE grammar_rules SET review_status = 'APPROVED';
UPDATE grammar_exercises SET review_status = 'APPROVED' WHERE id <= 64;
