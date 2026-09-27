-- =========================================================
-- V8: Seed bảng grammar_rules (Phase 4)
--
-- Phạm vi: 17 điểm ngữ pháp JPD113 (bài 1–3) + các mục JPD123 (bài 4–7) theo
-- docs/Internal/content-mapping-fpt-curriculum.md.
--
-- `original_number` giữ ĐÚNG số thứ tự của tài liệu gốc: tài liệu nhảy từ 5 sang 7
-- (không có mục 6) nên cột này có khoảng trống — đây là chủ ý, dùng để đối chiếu ngược lại nguồn.
--
-- ⚠️ DRAFT — cấu trúc/mẫu câu do người soạn nội dung viết lại (không copy nguyên văn tài liệu nguồn).
--    Cần người biết tiếng Nhật duyệt lại nội dung + đối chiếu số thứ tự với tài liệu gốc.
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_grammar_rule_title_lesson ON grammar_rules (title, lesson_id);

INSERT INTO grammar_rules (title, structure, explanation, notes, original_number, lesson_id, order_index)
SELECT g.title, g.structure, g.explanation, g.notes, g.original_number, l.id, g.order_index
FROM (VALUES
    -- ===== JPD113 — Bài 1 =====
    ('N1 は N2 です', 'N1 は N2 です', 'Dùng để giới thiệu/nhận định: N1 là N2. は là trợ từ đánh dấu chủ đề của câu, です là thể lịch sự của "là".',
     'は khi làm trợ từ đọc là "wa" (viết vẫn là は). Phủ định: じゃありません / ではありません. Quá khứ: でした.', 1, 'jpd113-b1', 1),
    ('N1 は N2 じゃありません', 'N1 は N2 じゃありません / ではありません', 'Phủ định của です: N1 không phải là N2. じゃありません dùng trong khẩu ngữ, ではありません trang trọng hơn.',
     'Trả lời phủ định cho câu hỏi danh từ: いいえ、N じゃありません.', 2, 'jpd113-b1', 2),
    ('N1 は N2 ですか', 'N1 は N2 ですか', 'Câu hỏi nghi vấn với か ở cuối câu. Trả lời: はい、そうです / いいえ、ちがいます.',
     'Cuối câu hỏi luôn thêm か, không cần đổi trật tự từ.', 3, 'jpd113-b1', 3),
    ('N も', 'N も ～です', 'Trợ từ も thay cho は khi muốn nói "cũng": N cũng là ～.',
     'Nếu câu đã dùng は thì thay bằng も, không dùng cả hai.', 4, 'jpd113-b1', 4),
    ('N1 の N2', 'N1 の N2', 'Trợ từ の nối hai danh từ: N2 thuộc về/liên quan tới N1 (VD わたし の ほん: sách của tôi).',
     'の cũng dùng để chỉ nguồn gốc/xuất xứ (FPT の がくせい) và làm rõ nghĩa cho danh từ phía sau.', 5, 'jpd113-b1', 5),
    -- ===== JPD113 — Bài 2 =====
    ('これ / それ / あれ は N です', 'これ・それ・あれ は N です', 'Chỉ định từ: これ (gần người nói), それ (gần người nghe), あれ (xa cả hai).',
     'Đi kèm danh từ dùng この / その / あの + N (VD この ほん).', 7, 'jpd113-b2', 7),
    ('N は どこですか', 'N は どこですか', 'Hỏi vị trí: N ở đâu? Trả lời dùng ここ / そこ / あそこ, hoặc tên địa điểm + です.',
     'どこ là nghi vấn từ chỉ nơi chốn, không dùng は sau どこ.', 8, 'jpd113-b2', 8),
    ('N が あります / います', '場所 に N が あります / います', 'Diễn tả sự tồn tại: ở <nơi> có <vật/người>. あります dùng cho đồ vật/cây cối, います dùng cho người/động vật.',
     'Trợ từ に đánh dấu nơi tồn tại, が đánh dấu chủ thể tồn tại (không dùng は).', 9, 'jpd113-b2', 9),
    ('Vị trí tương đối: 上 / 下 / 前 / 後ろ / 隣 / 中', 'N1 の 上/下/前/後ろ/隣/中 に N2 が あります', 'Mô tả vị trí của vật so với vật khác: trên/dưới/trước/sau/cạnh/trong N1 có N2.',
     'N1 は N2 の <vị trí> です: N1 ở <vị trí> của N2.', 10, 'jpd113-b2', 10),
    ('N は N の 中 です', 'N1 は N2 の 中 です', 'Xác định vị trí bằng danh từ chỉ nơi chốn: N1 nằm trong N2.',
     'Có thể thay bằng に あります: N1 は N2 に あります.', 11, 'jpd113-b2', 11),
    -- ===== JPD113 — Bài 3 =====
    ('いくらですか', 'N は いくらですか', 'Hỏi giá: N bao nhiêu tiền? Trả lời: N は ～円です.',
     'Đơn vị tiền là 円 (えん), đọc 4 円 = よんえん, 7 円 = ななえん (không dùng しちえん).', 12, 'jpd113-b3', 12),
    ('N を ください', 'N を ください', 'Yêu cầu/mua: cho tôi N. を đánh dấu tân ngữ.',
     'Bẫy thường gặp: を khi làm trợ từ đọc "o" (không đọc "wo").', 13, 'jpd113-b3', 13),
    ('Giờ và phút: ～時 ～分', '今 ～時 ～分 です', 'Nói giờ phút: 今 3時15分 です.',
     'Bẫy biến âm: 4時 = よじ, 7時 = しちじ, 9時 = くじ, phút có ふん/ぷん theo số đứng trước (1ぷん, 3ぷん, 4ふん, 6ぷん, 8ぷん, 10ぷん).', 14, 'jpd113-b3', 14),
    ('Ngày tháng và thứ: ～月 ～日 ・～曜日', '～月 ～日 ・～曜日', 'Nói ngày tháng: 4月2日 (しがつ ふつか), thứ: 月曜日 (げつようび).',
     'Bẫy biến âm: ngày 14 (じゅうよっか), 20 (はつか), 24 (にじゅうよっか) đổi hẳn cách đọc, còn ngày 17/19/27/29 chỉ đổi âm cuối.', 15, 'jpd113-b3', 15),
    ('Chia động từ: V ます / V ません', 'V-ます / V-ません / V-ました / V-ませんでした', 'Thể lịch sự của động từ: hiện tại/tương lai khẳng định ます, phủ định ません, quá khứ ました, quá khứ phủ định ませんでした.',
     'Động từ bất quy tắc cần nhớ: します / 来ます (きます).', 16, 'jpd113-b3', 16),
    ('N へ 行きます', 'N へ 行きます / 来ます / 帰ります', 'Di chuyển tới đâu: dùng へ (hoặc に) đánh dấu hướng/đích đến.',
     'Bẫy thường gặp: へ khi làm trợ từ đọc "e" (không đọc "he").', 17, 'jpd113-b3', 17),
    ('N で 行きます', 'N (phương tiện) で 行きます', 'Phương tiện di chuyển: đi bằng ～. で đánh dấu phương tiện.',
     'Đi bộ dùng あるいて 行きます (không dùng で).', 18, 'jpd113-b3', 18),
    -- ===== JPD123 — Bài 4 =====
    ('Tính từ đuôi い và な', 'A-い (高い) / A-な (きれいな)', 'Hai nhóm tính từ: nhóm đuôi い (高い, 安い, おいしい) và nhóm な (きれい, 静か, 便利). Khi bổ nghĩa cho danh từ: A-い + N, A-な + N.',
     'Nhóm な khi đứng trước danh từ phải có な: きれいな 花. Một số từ trông như い nhưng là nhóm な: きれい, 有名, 便利.', 19, 'jpd123-b4', 19),
    ('Phủ định tính từ い', 'A-い → A-くないです', 'Phủ định tính từ đuôi い: bỏ い thêm くないです. VD: 高い → 高くないです.',
     'Quá khứ: 高かったです, quá khứ phủ định: 高くなかったです. Ngoại lệ: いい → よくないです.', 20, 'jpd123-b4', 20),
    ('Phủ định tính từ な', 'A-な → A-じゃないです', 'Phủ định tính từ nhóm な: bỏ な thêm じゃないです. VD: きれい → きれいじゃないです.',
     'Trang trọng hơn dùng ではありません. Quá khứ: きれいでした / きれいじゃなかったです.', 21, 'jpd123-b4', 21),
    ('N が ほしいです', 'N が ほしいです', 'Diễn tả mong muốn có một đồ vật: tôi muốn N. Đối tượng mong muốn đánh dấu bằng が.',
     'Chỉ dùng cho bản thân (hoặc hỏi người thân). Muốn nhờ người khác dùng V てほしいです.', 22, 'jpd123-b4', 22),
    ('V たいです', 'V(ます形 bỏ ます) + たいです', 'Diễn tả mong muốn làm gì: 日本へ 行きたいです. Động từ chia như tính từ đuôi い.',
     'Phủ định: 行きたくないです. Muốn nhờ ai làm gì thì không dùng V たい.', 23, 'jpd123-b4', 23),
    -- ===== JPD123 — Bài 5 =====
    ('Mục đích chuyến đi: V に 行きます', '場所 へ V(ます形 bỏ ます) に 行きます', 'Nói mục đích của việc đi đâu: 日本へ 映画を 見に 行きます.',
     'Động từ dùng ở dạng bỏ ます (見ます → 見に).', 24, 'jpd123-b5', 24),
    ('N と V ます (làm cùng ai)', 'N (người) と V ます', 'Cùng làm gì với ai: 友達と 旅行します. と đánh dấu người cùng tham gia.',
     'Đi một mình dùng 一人で 行きます.', 25, 'jpd123-b5', 25),
    ('Thời gian: いつ / ～から ～まで', 'いつ V ますか / ～から ～まで', 'Hỏi thời điểm: いつ 日本へ 行きますか. Khoảng thời gian: 9時から 5時まで 働きます.',
     'いつ không đi kèm に (không nói いつに).', 26, 'jpd123-b5', 26),
    -- ===== JPD123 — Bài 6 =====
    ('So sánh hơn: A と B と どちらが', 'A と B と どちらが ～ですか', 'So sánh hai đối tượng: cái nào ～ hơn? Trả lời: A の ほうが B より ～です.',
     'Dùng どちらの ほうが khi so sánh hai lựa chọn, và より/ほう là cặp từ khoá của so sánh hơn.', 27, 'jpd123-b6', 27),
    ('So sánh nhất: 一番', 'N の 中 で 一番 ～です', 'So sánh nhất trong một phạm vi: trong N thì ～ nhất.',
     'Cấu trúc đầy đủ: <phạm vi> で 一番 <tính từ> です.', 28, 'jpd123-b6', 28),
    ('Quá khứ tính từ い', 'A-い → A-かったです / A-くなかったです', 'Chia tính từ đuôi い ở quá khứ: 楽しい → 楽しかったです, phủ định 楽しくなかったです.',
     'So sánh trải nghiệm quá khứ: A は B より ～かったです.', 29, 'jpd123-b6', 29),
    -- ===== JPD123 — Bài 7 =====
    ('Động từ thể て', 'V-て / V-てから', 'Thể て dùng để nối hành động: 起きて、朝ごはんを 食べます. V-てから: sau khi làm V.',
     'Quy tắc chia thể て: 書く→書いて (i 音), 食べる→食べて (e 音), する→して, 来る→来て.', 30, 'jpd123-b7', 30),
    ('Xin phép: V てもいいですか', 'V-て もいいですか', 'Xin phép làm gì: ここに 座っても いいですか (tôi ngồi đây được không?).',
     'Đồng ý: いいですよ / どうぞ. Từ chối: すみません、ちょっと… (thường không nói thẳng だめです).', 31, 'jpd123-b7', 31),
    ('Cấm đoán: V てはいけません', 'V-て はいけません', 'Cấm/nói không được làm gì: ここで 写真を 撮っては いけません.',
     'Khẩu ngữ: だめです. Đây là cấu trúc hay xuất hiện trong đề thi dạng biển báo/quy định.', 32, 'jpd123-b7', 32),
    ('Yêu cầu đừng làm: V ないでください', 'V-ない + でください', 'Nhờ/khuyên ai đừng làm gì: ここで 写真を 撮らないで ください.',
     'Phân biệt nhanh: V てはいけません = quy định cấm, V ないでください = lời nhờ/nhắc nhẹ nhàng.', 33, 'jpd123-b7', 33)
) AS g(title, structure, explanation, notes, original_number, slug, order_index)
JOIN lessons l ON l.slug = g.slug
ON CONFLICT (title, lesson_id) DO NOTHING;
