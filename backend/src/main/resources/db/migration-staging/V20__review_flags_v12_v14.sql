-- =========================================================
-- V20 (STAGING/LOCAL ONLY): gắn nguồn đối chiếu + cờ needs_human_check cho nội dung V12/V14
--
-- ⚠️ File nằm trong `db/migration-staging` ⇒ KHÔNG chạy ở production (xem application-prod.yml).
-- ⚠️ KHÔNG sửa V12/V14 (đã áp ở staging, Flyway giữ checksum) — nội dung V12/V14 chỉ được gắn cờ ở đây.
--
-- CÁCH LÀM (quy trình duyệt chốt 27/09/2026, chi tiết ở docs/Internal/content-mapping-fpt-curriculum.md):
--   1. Mọi câu V12/V14 (id > 64) được gắn `source_ref` = "doc:#N | <nhãn trong danh sách JLPT N5 công khai>".
--      `doc:#N` là số thứ tự GỐC của tài liệu bài giảng (đã lưu ở `grammar_rules.source_ref` từ V11).
--      Nhãn JLPT đối chiếu với danh sách công khai https://jlptsensei.com/jlpt-n5-grammar-list/ (đã đọc 3 trang).
--   2. `needs_human_check = TRUE` cho 2 nhóm RỦI RO CAO (giữ nguyên review_status = PENDING_REVIEW):
--      a) Câu hỏi phụ thuộc ngữ cảnh hội thoại (nhóm chỉ định từ こ/そ/あ/demonstrative): đáp án đổi theo
--         vị trí người nói/người nghe ⇒ có thể có 2 phương án đúng.
--      b) Câu mà ĐÁP ÁN nằm trong một CẶP TRỢ TỪ GẦN NGHĨA và cả 2 đều có trong lựa chọn (は/が, に/へ, に/で,
--         を/が, も/は) — đây là nhóm "2 đáp án tùy ngữ cảnh" như cảnh báo trong quy trình.
--   3. Các câu còn lại: `needs_human_check = FALSE` (đã đối chiếu được nguồn ngữ pháp).
--
-- Bằng chứng số liệu (chạy trên staging ngày 27/09/2026, xem báo cáo):
--   - tổng câu bài tập = 306 = 64 (V9) + 242 (V12/V14);
--   - 0 câu thiếu đáp án trong `options_json`, 0 câu trùng (grammar_rule_id, question_text);
--   - 0 câu có đồng thời では + じゃ trong lựa chọn (nên nhóm phủ định không bị 2 đáp án).
-- =========================================================

-- ---------------------------------------------------------
-- B1. Gắn nguồn đối chiếu cho TOÀN BỘ câu V12/V14 (id > 64)
--     Khớp qua `grammar_rules.source_ref` (ASCII, không phụ thuộc id môi trường).
-- ---------------------------------------------------------
UPDATE grammar_exercises e
SET source_ref = m.ref
FROM grammar_rules r
JOIN (VALUES
    ('doc:#1',  'doc:#1 | jlpt-n5: wa - topic marker は / da / desu だ・です'),
    ('doc:#2',  'doc:#2 | jlpt-n5: janai / dewa nai じゃない・ではない'),
    ('doc:#3',  'doc:#3 | jlpt-n5: ka か question particle'),
    ('doc:#4',  'doc:#4 | jlpt-n5: mo も (too · also · as well)'),
    ('doc:#5',  'doc:#5 | jlpt-n5: no の possessive particle'),
    ('doc:#7',  'doc:#7 | jlpt-n5: kore/sore/are これ・それ・あれ (demonstrative pronoun)'),
    ('doc:#8',  'doc:#8 | jlpt-n5: doko どこ + ka か (question word)'),
    ('doc:#9',  'doc:#9 | jlpt-n5: ga arimasu があります / ga imasu がいます'),
    ('doc:#10', 'doc:#10 | jlpt-n5: ni に (in · at · on — vị trí) + no の'),
    ('doc:#11', 'doc:#11 | jlpt-n5: no naka de [A] ga ichiban の中で[A]が一番'),
    ('doc:#12', 'doc:#12 | jlpt-n5: ikura いくら (how much) + ka か'),
    ('doc:#13', 'doc:#13 | jlpt-n5: o kudasai をください'),
    ('doc:#14', 'doc:#14 | jlpt-n5: counters ～時・～分 (time) + ni に'),
    ('doc:#15', 'doc:#15 | jlpt-n5: counters ～月・～日・～曜日 (date)'),
    ('doc:#16', 'doc:#16 | jlpt-n5: masu / masen ます・ません (polite verbs)'),
    ('doc:#17', 'doc:#17 | jlpt-n5: ni/e に・へ (direction) + ikimasu'),
    ('doc:#18', 'doc:#18 | jlpt-n5: de で (in · at · on · by · with · via) + ikimasu'),
    ('doc:#19', 'doc:#19 | jlpt-n5: i-adjectives / na-adjectives い形容詞・な形容詞'),
    ('doc:#20', 'doc:#20 | jlpt-n5: i-adjectives negative ～くない'),
    ('doc:#21', 'doc:#21 | jlpt-n5: na-adjectives negative ～じゃない'),
    ('doc:#22', 'doc:#22 | jlpt-n5: ga hoshii がほしい'),
    ('doc:#23', 'doc:#23 | jlpt-n5: tai たい (want to do)'),
    ('doc:#24', 'doc:#24 | jlpt-n5: ni iku に行く (go to do ~)'),
    ('doc:#25', 'doc:#25 | jlpt-n5: to と (and · with — connecting particle)'),
    ('doc:#26', 'doc:#26 | jlpt-n5: kara から / made まで + itsu いつ'),
    ('doc:#27', 'doc:#27 | jlpt-n5: wa ~yori... desu は〜より / dochira どちら'),
    ('doc:#28', 'doc:#28 | jlpt-n5: ichiban 一番 / no naka de [A] ga ichiban'),
    ('doc:#29', 'doc:#29 | jlpt-n5: i-adjectives past ～かった'),
    ('doc:#30', 'doc:#30 | jlpt-n5: te-form て形 (てください / ている)'),
    ('doc:#31', 'doc:#31 | jlpt-n5: temo ii desu てもいいです'),
    ('doc:#32', 'doc:#32 | jlpt-n5: te wa ikenai てはいけない'),
    ('doc:#33', 'doc:#33 | jlpt-n5: naide kudasai ないでください')
) AS m(doc_ref, ref) ON m.doc_ref = r.source_ref
WHERE e.grammar_rule_id = r.id
  AND e.id > 64
  AND e.source_ref IS NULL;

-- Mặc định: câu đã đối chiếu được nguồn ⇒ không cần người kiểm.
UPDATE grammar_exercises
SET needs_human_check = FALSE
WHERE id > 64;

-- ---------------------------------------------------------
-- B2. Nhóm (a): chỉ định từ こ/そ/あ — câu hỏi phụ thuộc vị trí người nói/người nghe
--     (có hội thoại hoặc có chú thích ngữ cảnh) ⇒ cần giáo viên xác nhận chỉ 1 đáp án đúng.
-- ---------------------------------------------------------
UPDATE grammar_exercises e
SET needs_human_check = TRUE,
    review_note = 'Câu chỉ định từ (こ/そ/あ) phụ thuộc vị trí người nói - người nghe: cần xác nhận chỉ có 1 đáp án đúng theo ngữ cảnh.'
FROM grammar_rules r
WHERE e.grammar_rule_id = r.id
  AND r.source_ref = 'doc:#7'
  AND e.id > 64
  AND (e.question_text LIKE '%A:%' OR e.question_text LIKE '%(%');

-- ---------------------------------------------------------
-- B3. Nhóm (b): đáp án là 1 trong CẶP TRỢ TỪ GẦN NGHĨA và cả 2 đều có trong lựa chọn
--     ⇒ nguy cơ 2 đáp án cùng đúng (lỗi hay gặp nhất theo quy trình duyệt).
--     Dùng U&'\xxxx' (escape Unicode) để file SQL thuần ASCII, không lỗi encoding khi chạy.
-- ---------------------------------------------------------
UPDATE grammar_exercises
SET needs_human_check = TRUE,
    review_note = 'Cặp trợ từ は/が cùng có trong lựa chọn: が (thuyết minh trung lập) cũng có thể chấp nhận ⇒ cần giáo viên chốt 1 đáp án.'
WHERE id > 64
  AND correct_answer IN (U&'\306F', U&'\304C')
  AND options_json LIKE '%"' || U&'\306F' || '"%'
  AND options_json LIKE '%"' || U&'\304C' || '"%';

UPDATE grammar_exercises
SET needs_human_check = TRUE,
    review_note = 'Cặp trợ từ に/へ cùng có trong lựa chọn: に và へ thay thế được cho nhau khi chỉ hướng ⇒ cần giáo viên chốt 1 đáp án.'
WHERE id > 64
  AND correct_answer IN (U&'\306B', U&'\3078')
  AND options_json LIKE '%"' || U&'\306B' || '"%'
  AND options_json LIKE '%"' || U&'\3078' || '"%';

UPDATE grammar_exercises
SET needs_human_check = TRUE,
    review_note = 'Cặp trợ từ に/で cùng có trong lựa chọn: に (đích/địa điểm tồn tại) và で (nơi diễn ra hành động) dễ lẫn ⇒ cần giáo viên chốt 1 đáp án.'
WHERE id > 64
  AND correct_answer IN (U&'\306B', U&'\3067')
  AND options_json LIKE '%"' || U&'\306B' || '"%'
  AND options_json LIKE '%"' || U&'\3067' || '"%';

UPDATE grammar_exercises
SET needs_human_check = TRUE,
    review_note = 'Cặp trợ từ を/が cùng có trong lựa chọn: を (đối tượng) và が (chủ thể) dễ lẫn khi đổi trật tự thông tin ⇒ cần giáo viên chốt 1 đáp án.'
WHERE id > 64
  AND correct_answer IN (U&'\3092', U&'\304C')
  AND options_json LIKE '%"' || U&'\3092' || '"%'
  AND options_json LIKE '%"' || U&'\304C' || '"%';

UPDATE grammar_exercises
SET needs_human_check = TRUE,
    review_note = 'Cặp trợ từ も/は cùng có trong lựa chọn: も (cũng) và は (chủ đề) đều đúng nếu không có ngữ cảnh "cũng" rõ ràng ⇒ cần giáo viên chốt 1 đáp án.'
WHERE id > 64
  AND correct_answer IN (U&'\3082', U&'\306F')
  AND options_json LIKE '%"' || U&'\3082' || '"%'
  AND options_json LIKE '%"' || U&'\306F' || '"%';

-- ---------------------------------------------------------
-- Kiểm tra nhanh sau khi chạy (kỳ vọng):
--   select needs_human_check, count(*) from grammar_exercises where id > 64 group by 1;
--   select count(*) from grammar_exercises where id > 64 and source_ref is null;   -- kỳ vọng 0
-- ---------------------------------------------------------
