-- ==============================================================================
-- V6: HSK 1 Standard Course Ecosystem (Curriculum Expansion, Grammar & Reading)
-- Trạng thái: PENDING_REVIEW (Chờ thẩm định học thuật, cách ly trong staging)
-- ==============================================================================

-- 1. Thêm 2 bài học HSK 1 Standard Course mới:
--    - Bài 7: Trường học, Công việc & Địa điểm (school-work-places)
--    - Bài 8: Thời tiết, Sức khỏe & Sinh hoạt thường ngày (weather-health-daily)

INSERT INTO lessons (slug, title, description, curriculum_level, order_index)
VALUES 
    (
        'school-work-places',
        'Bài 7: Trường học, Công việc & Địa điểm (学校、工作与地点)',
        'Giao tiếp về trường học, bệnh viện, cửa hàng, công việc và vị trí địa lý với giới từ 在, phương hướng 前/后 và đại từ 哪儿.',
        'HSK1',
        7
    ),
    (
        'weather-health-daily',
        'Bài 8: Thời tiết, Sức khỏe & Sinh hoạt thường ngày (天气、健康与日常)',
        'Hỏi thăm thời tiết nóng/lạnh/mưa, sức khỏe, các hoạt động nhìn/nghe/nói/đọc/viết và câu giao tiếp lịch sự 不客气, 没关系.',
        'HSK1',
        8
    )
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    curriculum_level = EXCLUDED.curriculum_level,
    order_index = EXCLUDED.order_index;

SELECT setval(pg_get_serial_sequence('lessons', 'id'), COALESCE((SELECT MAX(id) FROM lessons), 1));

-- 2. Thêm 30 từ vựng cốt lõi phân bổ theo 2 bài học M2.2/V6
INSERT INTO vocabulary (
    word, traditional, pinyin, pinyin_normalized, han_viet,
    part_of_speech, meaning_vi, hsk_level, lesson_number,
    example_zh, example_pinyin, example_vi, lesson_id,
    review_status, needs_human_check, source_ref
)
SELECT
    v.word, v.traditional, v.pinyin, v.pinyin_normalized, v.han_viet,
    v.part_of_speech, v.meaning_vi, v.hsk_level, v.lesson_number,
    v.example_zh, v.example_pinyin, v.example_vi, l.id,
    v.review_status, v.needs_human_check, v.source_ref
FROM (VALUES
    -- Bài 7: Trường học, Công việc & Địa điểm (16 từ vựng)
    ('学校', '學校', 'xuéxiào', 'xuexiao xue2xiao4', 'học hiệu', 'Danh từ', 'Trường học', 1, 7, '我们学校很大。', 'Wǒmen xuéxiào hěn dà.', 'Trường học của chúng tôi rất lớn.', 'school-work-places', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('学生', '學生', 'xuésheng', 'xuesheng xue2sheng', 'học sinh', 'Danh từ', 'Học sinh, sinh viên', 1, 7, '他是大学学生。', 'Tā shì dàxué xuésheng.', 'Anh ấy là sinh viên đại học.', 'school-work-places', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('老师', '老師', 'lǎoshī', 'laoshi lao3shi1', 'lão sư', 'Danh từ', 'Thầy giáo, cô giáo', 1, 7, '王老师教我们汉语。', 'Wáng lǎoshī jiāo wǒmen hànyǔ.', 'Thầy Vương dạy chúng tôi tiếng Hán.', 'school-work-places', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('同学', '同學', 'tóngxué', 'tongxue tong2xue2', 'đồng học', 'Danh từ', 'Bạn học, bạn cùng lớp', 1, 7, '他们都是我的同学。', 'Tāmen dōu shì wǒ de tóngxué.', 'Họ đều là bạn học của tôi.', 'school-work-places', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('工作', '工作', 'gōngzuò', 'gongzuo gong1zuo4', 'công tác', 'Động từ / Danh từ', 'Làm việc; công việc', 1, 7, '你在哪儿工作？', 'Nǐ zài nǎr gōngzuò?', 'Bạn làm việc ở đâu?', 'school-work-places', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('医院', '醫院', 'yīyuàn', 'yiyuan yi1yuan4', 'y viện', 'Danh từ', 'Bệnh viện', 1, 7, '我妈妈在医院工作。', 'Wǒ māma zài yīyuàn gōngzuò.', 'Mẹ tôi làm việc ở bệnh viện.', 'school-work-places', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('医生', '醫生', 'yīshēng', 'yisheng yi1sheng1', 'y sinh', 'Danh từ', 'Bác sĩ', 1, 7, '他爸爸是医生。', 'Tā bàba shì yīshēng.', 'Bố anh ấy là bác sĩ.', 'school-work-places', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('饭馆', '飯館', 'fànguǎn', 'fanguan fan4guan3', 'phạn quán', 'Danh từ', 'Nhà hàng, quán ăn', 1, 7, '中午我们去饭馆吃饭。', 'Zhōngwǔ wǒmen qù fànguǎn chīfàn.', 'Buổi trưa chúng tôi đi nhà hàng ăn cơm.', 'school-work-places', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('商店', '商店', 'shāngdiàn', 'shangdian shang1dian4', 'thương điếm', 'Danh từ', 'Cửa hàng, tiệm', 1, 7, '我想去商店买东西。', 'Wǒ xiǎng qù shāngdiàn mǎi dōngxi.', 'Tôi muốn đi cửa hàng mua đồ.', 'school-work-places', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('北京', '北京', 'Běijīng', 'beijing bei3jing1', 'Bắc Kinh', 'Danh từ riêng', 'Bắc Kinh (Thủ đô Trung Quốc)', 1, 7, '他明天去北京。', 'Tā míngtiān qù Běijīng.', 'Ngày mai anh ấy đi Bắc Kinh.', 'school-work-places', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('去', '去', 'qù', 'qu qu4', 'khứ', 'Động từ', 'Đi', 1, 7, '你去哪儿？', 'Nǐ qù nǎr?', 'Bạn đi đâu đấy?', 'school-work-places', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('来', '來', 'lái', 'lai lai2', 'lai', 'Động từ', 'Đến, tới', 1, 7, '欢迎来我家玩。', 'Huānyíng lái wǒ jiā wán.', 'Hoan nghênh đến nhà tôi chơi.', 'school-work-places', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('哪儿', '哪兒', 'nǎr', 'nar na3r', 'nả nhi', 'Đại từ nghi vấn', 'Ở đâu, chỗ nào', 1, 7, '洗手间在哪儿？', 'Xǐshǒujiān zài nǎr?', 'Nhà vệ sinh ở đâu?', 'school-work-places', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('前', '前', 'qián', 'qian qian2', 'tiền', 'Danh từ vị trí', 'Trước, phía trước', 1, 7, '学校前面有一个商店。', 'Xuéxiào qiánmiàn yǒu yí gè shāngdiàn.', 'Phía trước trường học có một cửa hàng.', 'school-work-places', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('后', '後', 'hòu', 'hou hou4', 'hậu', 'Danh từ vị trí', 'Sau, phía sau', 1, 7, '三天后我们考试。', 'Sān tiān hòu wǒmen kǎoshì.', 'Ba ngày sau chúng tôi thi.', 'school-work-places', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('里', '裏', 'lǐ', 'li li3', 'lý', 'Danh từ vị trí', 'Trong, bên trong', 1, 7, '书在包里。', 'Shū zài bāo lǐ.', 'Sách ở trong túi.', 'school-work-places', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),

    -- Bài 8: Thời tiết, Sức khỏe & Sinh hoạt thường ngày (14 từ vựng)
    ('天气', '天氣', 'tiānqì', 'tianqi tian1qi4', 'thiên khí', 'Danh từ', 'Thời tiết', 1, 8, '今天天气很好。', 'Jīntiān tiānqì hěn hǎo.', 'Hôm nay thời tiết rất đẹp.', 'weather-health-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('热', '熱', 'rè', 're re4', 'nhiệt', 'Tính từ', 'Nóng', 1, 8, '今天太热了。', 'Jīntiān tài rè le.', 'Hôm nay nóng quá.', 'weather-health-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('冷', '冷', 'lěng', 'leng leng3', 'lãnh', 'Tính từ', 'Lạnh', 1, 8, '北京的冬天很冷。', 'Běijīng de dōngtiān hěn lěng.', 'Mùa đông Bắc Kinh rất lạnh.', 'weather-health-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('下雨', '下雨', 'xià yǔ', 'xia yu xia4 yu3', 'hạ vũ', 'Động từ', 'Mưa, đổ mưa', 1, 8, '明天会下雨吗？', 'Míngtiān huì xià yǔ ma?', 'Ngày mai có mưa không?', 'weather-health-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('身体', '身體', 'shēntǐ', 'shenti shen1ti3', 'thân thể', 'Danh từ', 'Sức khỏe, cơ thể', 1, 8, '你身体好吗？', 'Nǐ shēntǐ hǎo ma?', 'Sức khỏe bạn tốt không?', 'weather-health-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('看', '看', 'kàn', 'kan kan4', 'khán', 'Động từ', 'Xem, nhìn, đọc', 1, 8, '我看书呢。', 'Wǒ kàn shū ne.', 'Tôi đang đọc sách này.', 'weather-health-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('听', '聽', 'tīng', 'ting ting1', 'thính', 'Động từ', 'Nghe', 1, 8, '你在听什么？', 'Nǐ zài tīng shénme?', 'Bạn đang nghe cái gì thế?', 'weather-health-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('说话', '說話', 'shuōhuà', 'shuohua shuo1hua4', 'thuyết thoại', 'Động từ', 'Nói chuyện', 1, 8, '请不要说话。', 'Qǐng bú yào shuōhuà.', 'Xin đừng nói chuyện.', 'weather-health-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('读', '讀', 'dú', 'du du2', 'độc', 'Động từ', 'Đọc', 1, 8, '跟我读这个词。', 'Gēn wǒ dú zhè gè cí.', 'Đọc từ này theo tôi.', 'weather-health-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('写', '寫', 'xiě', 'xie xie3', 'tả', 'Động từ', 'Viết', 1, 8, '你会写汉字吗？', 'Nǐ huì xiě hànzì ma?', 'Bạn biết viết chữ Hán không?', 'weather-health-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('做', '做', 'zuò', 'zuo zuo4', 'tác', 'Động từ', 'Làm', 1, 8, '你在做什么？', 'Nǐ zài zuò shénme?', 'Bạn đang làm gì vậy?', 'weather-health-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('坐', '坐', 'zuò', 'zuo zuo4', 'tọa', 'Động từ', 'Ngồi; đi (xe)', 1, 8, '请坐，请喝水。', 'Qǐng zuò, qǐng hē shuǐ.', 'Mời ngồi, mời uống nước.', 'weather-health-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('不客气', '不客氣', 'bú kèqi', 'bu keqi bu2 ke4qi', 'bất khách khí', 'Cụm từ', 'Không có gì, đừng khách sáo', 1, 8, 'A: 谢谢你！ B: 不客气。', 'A: Xièxie nǐ! B: Bú kèqi.', 'A: Cảm ơn bạn! B: Không có gì.', 'weather-health-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định'),
    ('没关系', '沒關係', 'méi guānxi', 'mei guanxi mei2 guan1xi', 'một quan hệ', 'Cụm từ', 'Không sao, không hề gì', 1, 8, 'A: 对不起！ B: 没关系。', 'A: Duìbuqǐ! B: Méi guānxi.', 'A: Xin lỗi! B: Không sao.', 'weather-health-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V6 chờ thẩm định')
) AS v(word, traditional, pinyin, pinyin_normalized, han_viet, part_of_speech, meaning_vi, hsk_level, lesson_number, example_zh, example_pinyin, example_vi, lesson_slug, review_status, needs_human_check, source_ref)
JOIN lessons l ON l.slug = v.lesson_slug
WHERE NOT EXISTS (
    SELECT 1 FROM vocabulary ex
    WHERE ex.word = v.word AND ex.lesson_id = l.id
);

SELECT setval(pg_get_serial_sequence('vocabulary', 'id'), COALESCE((SELECT MAX(id) FROM vocabulary), 1));

-- 3. Mở rộng 6 Điểm Ngữ pháp HSK 1 Cốt lõi (Quy tắc 7 - 12)
INSERT INTO grammar_rules (
    title, structure, hsk_level, explanation_vi, explanation,
    examples_json, exercises_json, notes, order_index, review_status
)
SELECT 
    r.title, r.structure, r.hsk_level, r.explanation_vi, r.explanation,
    r.examples_json, r.exercises_json, r.notes, r.order_index, r.review_status
FROM (VALUES
    (
        'Đại từ nghi vấn 什么, 谁, 哪, 几, 多少',
        'Chủ ngữ + Động từ + Đại từ nghi vấn？ (Trật tự từ không đổi)',
        1,
        'Trong tiếng Trung, câu hỏi dùng đại từ nghi vấn giữ nguyên trật tự từ như câu trần thuật: muốn hỏi thành phần nào thì thay đại từ nghi vấn vào đúng vị trí của thành phần đó. 什么 (cái gì), 谁 (ai), 哪 (nào), 哪儿 (ở đâu), 几 (mấy, <10), 多少 (bao nhiêu).',
        'Trong tiếng Trung, câu hỏi dùng đại từ nghi vấn giữ nguyên trật tự từ như câu trần thuật: muốn hỏi thành phần nào thì thay đại từ nghi vấn vào đúng vị trí của thành phần đó. 什么 (cái gì), 谁 (ai), 哪 (nào), 哪儿 (ở đâu), 几 (mấy, <10), 多少 (bao nhiêu).',
        '[{"zh":"你叫什么名字？","pinyin":"Nǐ jiào shénme míngzi?","vi":"Bạn tên là gì?"},{"zh":"他是谁？","pinyin":"Tā shì shéi?","vi":"Anh ấy là ai?"},{"zh":"你家有几口人？","pinyin":"Nǐ jiā yǒu jǐ kǒu rén?","vi":"Nhà bạn có mấy người?"}]',
        '[{"question":"Điền đại từ nghi vấn: 你想喝 ___？","options":["什么","谁","哪","几"],"answer":"什么","explanation":"Hỏi về đồ vật, thức uống muốn dùng: 什么 (cái gì)."},{"question":"Sắp xếp câu hỏi: 老师 / 是 / 谁 / 你的","options":["你的老师是谁？","谁是你的老师？","你的老师是哪？","是谁你的老师？"],"answer":"你的老师是谁？","explanation":"Trật tự câu hỏi: Định ngữ (你的老师) + là (是) + ai (谁)?"}]',
        'Lỗi thường gặp của người Việt: Đảo đại từ nghi vấn lên đầu câu theo thói quen tiếng Anh (VD: hỏi \"What do you want?\" dịch nhầm thành 什么你想喝？ -> Đúng phải là 你想喝什么？).',
        7,
        'PENDING_REVIEW'
    ),
    (
        'Động từ năng nguyện 会, 能, 想',
        'Chủ ngữ + 会 / 能 / 想 + Động từ',
        1,
        '会 (huì): Biểu thị kỹ năng có được qua học tập, rèn luyện (VD: 会说汉语 - biết nói tiếng Trung). 能 (néng): Biểu thị năng lực thực tế hoặc điều kiện khách quan cho phép. 想 (xiǎng): Biểu thị mong muốn, dự định chủ quan (muốn). Phủ định đặt 不 trước động từ năng nguyện (不会, 不能, 不想).',
        '会 (huì): Biểu thị kỹ năng có được qua học tập, rèn luyện (VD: 会说汉语 - biết nói tiếng Trung). 能 (néng): Biểu thị năng lực thực tế hoặc điều kiện khách quan cho phép. 想 (xiǎng): Biểu thị mong muốn, dự định chủ quan (muốn). Phủ định đặt 不 trước động từ năng nguyện (不会, 不能, 不想).',
        '[{"zh":"我会写汉字。","pinyin":"Wǒ huì xiě hànzì.","vi":"Tôi biết viết chữ Hán."},{"zh":"我明天能去学校。","pinyin":"Wǒ míngtiān néng qù xuéxiào.","vi":"Ngày mai tôi có thể đến trường."},{"zh":"我想买一个苹果。","pinyin":"Wǒ xiǎng mǎi yí gè píngguǒ.","vi":"Tôi muốn mua một quả táo."}]',
        '[{"question":"Điền từ thích hợp: 我不会 ___ 中国菜。","options":["做","想","能","会"],"answer":"做","explanation":"Sau động từ năng nguyện 会 là một động từ chỉ hành động (做 - làm/nấu)."},{"question":"Chọn câu phủ định đúng:","options":["我不想去。","我不去想。","我没想去。","想不我去。"],"answer":"我不想去。","explanation":"Phủ định ý muốn dùng 不想 + Động từ."}]',
        'Lỗi thường gặp: Dùng lẫn lộn 会 và 能. Kỹ năng phải học mới biết (bơi, lái xe, ngoại ngữ) bắt buộc dùng 会; điều kiện sức khỏe hoặc ngoại cảnh cho phép làm gì mới dùng 能.',
        8,
        'PENDING_REVIEW'
    ),
    (
        'Liên từ 和 nối danh từ',
        'Danh từ A + 和 + Danh từ B',
        1,
        'Liên từ 和 (hé) có nghĩa là \"và\", nhưng CHỈ ĐƯỢC DÙNG ĐỂ NỐI CÁC DANH TỪ, ĐẠI TỪ hoặc cụm danh từ tương đương. Tuyệt đối KHÔNG dùng 和 để nối hai phân câu hay hai mệnh đề như từ \"và\" trong tiếng Việt.',
        'Liên từ 和 (hé) có nghĩa là \"và\", nhưng CHỈ ĐƯỢC DÙNG ĐỂ NỐI CÁC DANH TỪ, ĐẠI TỪ hoặc cụm danh từ tương đương. Tuyệt đối KHÔNG dùng 和 để nối hai phân câu hay hai mệnh đề như từ \"và\" trong tiếng Việt.',
        '[{"zh":"我和他是同学。","pinyin":"Wǒ hé tā shì tóngxué.","vi":"Tôi và anh ấy là bạn học."},{"zh":"我喜欢吃米饭和苹果。","pinyin":"Wǒ xǐhuan chī mǐfàn hé píngguǒ.","vi":"Tôi thích ăn cơm và táo."}]',
        '[{"question":"Điền liên từ: 爸爸 ___ 妈妈都在家。","options":["和","也","都","是"],"answer":"和","explanation":"Dùng 和 nối hai danh từ chỉ người 爸爸 và 妈妈."},{"question":"Chọn câu dùng đúng từ 和:","options":["我买水和苹果。","我去学校和你回家。","他吃米饭和他喝水。","明天是星期一和我去北京。"],"answer":"我买水和苹果。","explanation":"和 chỉ nối 2 danh từ 水 và 苹果. Ba câu còn lại nối mệnh đề là sai ngữ pháp."}]',
        'Lỗi cực kỳ phổ biến của người Việt: Dùng 和 để nối hai câu (VD: Tôi đi chợ và anh ấy đi học -> Dịch nhầm: 我去超市和他去上学 -> SAI! Tiếng Trung chỉ dùng dấu phẩy hoặc liên từ nối mệnh đề riêng).',
        9,
        'PENDING_REVIEW'
    ),
    (
        'Trợ từ ngữ khí 吧 và 了',
        'Câu + 吧？ / Câu + 了',
        1,
        '1) Trợ từ 吧 (ba) đặt cuối câu: biểu thị sự thỉnh cầu, rủ rê, đề nghị nhẹ nhàng (\"...nhé, ...đi\") hoặc phỏng đoán chưa chắc chắn. 2) Trợ từ 了 (le) đặt cuối câu: biểu thị sự xuất hiện của tình huống mới hoặc biến đổi trạng thái (VD: 下雨了 - Mưa rồi).',
        '1) Trợ từ 吧 (ba) đặt cuối câu: biểu thị sự thỉnh cầu, rủ rê, đề nghị nhẹ nhàng (\"...nhé, ...đi\") hoặc phỏng đoán chưa chắc chắn. 2) Trợ từ 了 (le) đặt cuối câu: biểu thị sự xuất hiện của tình huống mới hoặc biến đổi trạng thái (VD: 下雨了 - Mưa rồi).',
        '[{"zh":"我们走吧！","pinyin":"Wǒmen zǒu ba!","vi":"Chúng mình đi thôi nhé!"},{"zh":"太热了！","pinyin":"Tài rè le!","vi":"Nóng quá rồi!"},{"zh":"你也是越南人吧？","pinyin":"Nǐ yě shì yuènán rén ba?","vi":"Bạn cũng là người Việt Nam phải không nhỉ?"}]',
        '[{"question":"Rủ bạn cùng đi ăn cơm: 我们去吃饭 ___！","options":["吧","吗","呢","了"],"answer":"吧","explanation":"Dùng 吧 để đưa ra lời đề nghị, rủ rê thân mật."},{"question":"Cảm thán mức độ cao: 太好 ___！","options":["了","吧","吗","呢"],"answer":"了","explanation":"Cấu trúc cố định: 太 + Tính từ + 了 (quá... rồi)."}]',
        'Lỗi thường gặp: Nhầm giữa 吗 (hỏi nghi vấn tuyệt đối Có/Không) và 吧 (phỏng đoán đã nắm chắc 70% hoặc đề nghị).',
        10,
        'PENDING_REVIEW'
    ),
    (
        'Câu vị ngữ tính từ và phó từ 很',
        'Chủ ngữ + 很 + Tính từ (Không dùng 是)',
        1,
        'Khi tính từ làm vị ngữ miêu tả đặc điểm/tính chất của chủ ngữ, TIẾNG TRUNG TUYỆT ĐỐI KHÔNG DÙNG ĐỘNG TỪ 是. Thay vào đó, thường phải có phó từ chỉ mức độ như 很 (hěn), 非常 (fēicháng) đứng trước tính từ để tạo thành câu hoàn chỉnh mang ngữ khí trần thuật nhẹ nhàng (trong ngữ cảnh này, 很 thường không mang nghĩa quá mạnh là \"rất\").',
        'Khi tính từ làm vị ngữ miêu tả đặc điểm/tính chất của chủ ngữ, TIẾNG TRUNG TUYỆT ĐỐI KHÔNG DÙNG ĐỘNG TỪ 是. Thay vào đó, thường phải có phó từ chỉ mức độ như 很 (hěn), 非常 (fēicháng) đứng trước tính từ để tạo thành câu hoàn chỉnh mang ngữ khí trần thuật nhẹ nhàng (trong ngữ cảnh này, 很 thường không mang nghĩa quá mạnh là \"rất\").',
        '[{"zh":"今天天气很好。","pinyin":"Jīntiān tiānqì hěn hǎo.","vi":"Hôm nay thời tiết đẹp."},{"zh":"汉语不太难。","pinyin":"Hànyǔ bú tài nán.","vi":"Tiếng Hán không khó lắm."},{"zh":"我很高兴。","pinyin":"Wǒ hěn gāoxìng.","vi":"Tôi rất vui mừng."}]',
        '[{"question":"Chọn câu đúng ngữ pháp tiếng Trung:","options":["他很高。","他是很高。","他是高。","高他是。"],"answer":"他很高。","explanation":"Vị ngữ tính từ không dùng 是, dùng phó từ 很 đứng trước tính từ."},{"question":"Dịch câu \"Hôm nay trời không lạnh\":","options":["今天不冷。","今天没冷。","今天不是冷。","今天没是冷。"],"answer":"今天不冷。","explanation":"Phủ định tính từ dùng 不, không dùng 没 và không dùng 是."}]',
        'Lỗi kinh điển của người học Việt Nam: Thói quen dịch từ \"là\" sang 是 dẫn đến nói nhầm \"Tôi là rất bận\" -> 我是很忙 (SAI!). Câu đúng bắt buộc là 我很忙.',
        11,
        'PENDING_REVIEW'
    ),
    (
        'Cấu trúc nhấn mạnh 是...的',
        'Chủ ngữ + 是 + [Thời gian / Địa điểm / Phương thức] + Động từ + 的',
        1,
        'Khi một hành động ĐÃ XẢY RA TRONG QUÁ KHỨ và người nói muốn nhấn mạnh vào THỜI GIAN, ĐỊA ĐIỂM, MỤC ĐÍCH hoặc PHƯƠNG THỨC thực hiện của hành động đó, ta sử dụng cấu trúc 是...的. Trong câu khẳng định, 是 có thể lược bỏ, nhưng 的 ở cuối câu bắt buộc phải giữ lại. Phủ định bắt buộc là 不是...的.',
        'Khi một hành động ĐÃ XẢY RA TRONG QUÁ KHỨ và người nói muốn nhấn mạnh vào THỜI GIAN, ĐỊA ĐIỂM, MỤC ĐÍCH hoặc PHƯƠNG THỨC thực hiện của hành động đó, ta sử dụng cấu trúc 是...的. Trong câu khẳng định, 是 có thể lược bỏ, nhưng 的 ở cuối câu bắt buộc phải giữ lại. Phủ định bắt buộc là 不是...的.',
        '[{"zh":"我是坐飞机来的。","pinyin":"Wǒ shì zuò fēijī lái de.","vi":"Tôi đi máy bay đến (nhấn mạnh phương thức)."},{"zh":"他是在北京学的汉语。","pinyin":"Tā shì zài Běijīng xué de hànyǔ.","vi":"Anh ấy học tiếng Hán ở Bắc Kinh (nhấn mạnh địa điểm)."},{"zh":"我们是昨天认识的。","pinyin":"Wǒmen shì zuótiān rènshi de.","vi":"Chúng tôi quen nhau vào hôm qua (nhấn mạnh thời gian)."}]',
        '[{"question":"Nhấn mạnh địa điểm đến: 我 ___ 北京来的。","options":["是在","是在...的","是从...的","是到...的"],"answer":"是在...的","explanation":"Cấu trúc 是 + 在 [Địa điểm] + 来 + 的."},{"question":"Chọn câu phủ định đúng của cấu trúc 是...的:","options":["他不是昨天来的。","他没是昨天来的。","他不昨天来是的。","他没昨天来的。"],"answer":"他不是昨天来的。","explanation":"Phủ định cấu trúc 是...的 luôn là 不是...的."}]',
        'Lỗi thường gặp: Nhầm cấu trúc 是...的 với trợ từ kết cấu sở hữu 的. Cấu trúc này chỉ áp dụng cho sự việc ĐÃ XẢY RA nhằm mục đích giải thích rõ bối cảnh cụ thể.',
        12,
        'PENDING_REVIEW'
    )
) AS r(title, structure, hsk_level, explanation_vi, explanation, examples_json, exercises_json, notes, order_index, review_status)
WHERE NOT EXISTS (
    SELECT 1 FROM grammar_rules ex WHERE ex.title = r.title
);

SELECT setval(pg_get_serial_sequence('grammar_rules', 'id'), COALESCE((SELECT MAX(id) FROM grammar_rules), 1));

-- 4. Thêm bài tập chi tiết tương ứng vào bảng grammar_exercises
INSERT INTO grammar_exercises (
    grammar_rule_id, question_text, options_json, correct_answer,
    explanation, is_common_mistake, mistake_category, review_status, needs_human_check
)
SELECT 
    gr.id, e.question_text, e.options_json, e.correct_answer,
    e.explanation, e.is_common_mistake, e.mistake_category, 'PENDING_REVIEW', true
FROM (VALUES
    ('Đại từ nghi vấn 什么, 谁, 哪, 几, 多少', 'Điền đại từ nghi vấn thích hợp: 你想喝 ___？', '["什么","谁","哪","几"]', '什么', 'Hỏi về đồ vật, thức uống muốn dùng: 什么 (cái gì).', false, null),
    ('Đại từ nghi vấn 什么, 谁, 哪, 几, 多少', 'Sắp xếp trật tự từ đúng cho câu hỏi: 老师 / 是 / 谁 / 你的', '["你的老师是谁？","谁是你的老师？","你的老师是哪？","是谁你的老师？"]', '你的老师是谁？', 'Trật tự câu hỏi: Định ngữ (你的老师) + là (是) + ai (谁)?', true, 'WordOrder'),
    ('Động từ năng nguyện 会, 能, 想', 'Điền động từ thích hợp: 我不会 ___ 中国菜。', '["做","想","能","会"]', '做', 'Sau động từ năng nguyện 会 là một động từ chỉ hành động (做 - làm/nấu).', false, null),
    ('Động từ năng nguyện 会, 能, 想', 'Chọn câu phủ định ý muốn đúng:', '["我不想去。","我不去想。","我没想去。","想不我去。"]', '我不想去。', 'Phủ định ý muốn dùng 不想 + Động từ.', true, 'Negation'),
    ('Liên từ 和 nối danh từ', 'Điền liên từ thích hợp: 爸爸 ___ 妈妈都在家。', '["和","也","都","是"]', '和', 'Dùng 和 nối hai danh từ chỉ người 爸爸 và 妈妈.', false, null),
    ('Liên từ 和 nối danh từ', 'Chọn câu dùng đúng liên từ 和 trong tiếng Trung:', '["我买水和苹果。","我去学校和你回家。","他吃米饭和他喝水。","明天是星期一和我去北京。"]', '我买水和苹果。', '和 chỉ nối 2 danh từ 水 và 苹果. Ba câu còn lại nối mệnh đề là sai ngữ pháp.', true, 'ConjunctionUsage'),
    ('Trợ từ ngữ khí 吧 và 了', 'Rủ bạn cùng đi ăn cơm: 我们去吃饭 ___！', '["吧","吗","呢","了"]', '吧', 'Dùng 吧 để đưa ra lời đề nghị, rủ rê thân mật.', false, null),
    ('Trợ từ ngữ khí 吧 và 了', 'Cảm thán mức độ cao: 太热 ___！', '["了","吧","吗","呢"]', '了', 'Cấu trúc cố định: 太 + Tính từ + 了 (quá... rồi).', false, null),
    ('Câu vị ngữ tính từ và phó từ 很', 'Chọn câu đúng ngữ pháp tiếng Trung (không thừa từ 是):', '["他很高。","他是很高。","他是高。","高他是。"]', '他很高。', 'Vị ngữ tính từ không dùng 是, dùng phó từ 很 đứng trước tính từ.', true, 'RedundantVerbShi'),
    ('Câu vị ngữ tính từ và phó từ 很', 'Dịch câu \"Hôm nay trời không lạnh\":', '["今天不冷。","今天没冷。","今天不是冷。","今天没是冷。"]', '今天不冷。', 'Phủ định tính từ dùng 不, không dùng 没 và không dùng 是.', true, 'AdjectiveNegation'),
    ('Cấu trúc nhấn mạnh 是...的', 'Nhấn mạnh phương tiện đi lại: 我是 ___ 来的。', '["坐飞机","坐飞机的大","坐飞机的了","坐飞机呢"]', '坐飞机', 'Cấu trúc 是 + [Phương thức: 坐飞机] + 来 + 的.', false, null),
    ('Cấu trúc nhấn mạnh 是...的', 'Chọn câu phủ định đúng của cấu trúc 是...的:', '["他不是昨天来的。","他没是昨天来的。","他不昨天来是的。","他没昨天来的。"]', '他不是昨天来的。', 'Phủ định cấu trúc 是...的 luôn là 不是...的.', true, 'ShiDeNegation')
) AS e(rule_title, question_text, options_json, correct_answer, explanation, is_common_mistake, mistake_category)
JOIN grammar_rules gr ON gr.title = e.rule_title
WHERE NOT EXISTS (
    SELECT 1 FROM grammar_exercises ex
    WHERE ex.question_text = e.question_text AND ex.grammar_rule_id = gr.id
);

SELECT setval(pg_get_serial_sequence('grammar_exercises', 'id'), COALESCE((SELECT MAX(id) FROM grammar_exercises), 1));

-- 5. Thêm 3 bài đọc hiểu ngữ cảnh HSK 1 (reading_passages)
INSERT INTO reading_passages (
    title, passage_text, translation_text, vocabulary_notes, questions_json, review_status
)
SELECT 
    p.title, p.passage_text, p.translation_text, p.vocabulary_notes, p.questions_json, 'PENDING_REVIEW'
FROM (VALUES
    (
        'Ở trường học (在学校)',
        '大卫是美国人，他是我们学校的学生。大卫很喜欢学汉语。他的老师是王老师，王老师是很好的人。大卫有两个好朋友，他们都是中国人。今天下午大卫和他的朋友在学校看书。',
        'David là người Mỹ, anh ấy là học sinh trường chúng tôi. David rất thích học tiếng Hán. Thầy giáo của anh ấy là thầy Vương, thầy Vương là một người rất tốt. David có hai người bạn thân, họ đều là người Trung Quốc. Chiều hôm nay David và bạn của anh ấy cùng đọc sách ở trường.',
        '大卫 (Dàwèi - David); 学生 (xuésheng - học sinh); 老师 (lǎoshī - giáo viên); 朋友 (péngyou - bạn bè); 看书 (kàn shū - đọc sách).',
        '[{"question":"大卫是哪国人？","options":["美国人","中国人","越南人","英国人"],"correctAnswer":"美国人","explanation":"Đoạn văn mở đầu nêu rõ: 大卫是美国人 (David là người Mỹ)."},{"question":"今天下午大卫在哪儿？","options":["在学校","在医院","在家","在饭馆"],"correctAnswer":"在学校","explanation":"Đoạn văn ghi: 今天下午大卫和他的朋友在学校看书 (Chiều nay David và bạn ở trường học)."}]'
    ),
    (
        'Tại quán ăn & Mua sắm (在饭馆和商店)',
        '中午十二点，李明去饭馆吃饭。他想吃中国菜。他点了一碗米饭和一个菜，还喝了一杯热茶。一共二十五块钱。吃完饭后，李明去商店买苹果。苹果六块钱一斤，他买了三斤。',
        '12 giờ trưa, Lý Minh đến quán ăn dùng bữa. Anh ấy muốn ăn món Trung Quốc. Anh ấy gọi một bát cơm và một món ăn, còn uống thêm một cốc trà nóng. Tổng cộng hết 25 đồng. Sau khi ăn xong, Lý Minh đến cửa hàng mua táo. Táo 6 đồng một cân, anh ấy mua 3 cân.',
        '饭馆 (fànguǎn - quán ăn); 米饭 (mǐfàn - cơm); 热茶 (rè chá - trà nóng); 商店 (shāngdiàn - cửa hàng); 苹果 (píngguǒ - quả táo).',
        '[{"question":"李明喝了什么？","options":["热茶","水","咖啡","牛奶"],"correctAnswer":"热茶","explanation":"Đoạn văn nêu rõ: 还喝了一杯热茶 (còn uống một cốc trà nóng)."},{"question":"苹果多少钱一斤？","options":["六块钱","五块钱","二十块钱","三块钱"],"correctAnswer":"六块钱","explanation":"Đoạn văn ghi rõ: 苹果六块钱一斤 (Táo 6 đồng một cân)."}]'
    ),
    (
        'Hẹn gặp cuối tuần (周末见面)',
        '今天是星期六，北京的天气很好，不冷也不热。我和小王约好明天上午九点去北京大学玩。小王说他会骑自行车来。明天下午我们要一起去听中国音乐，我很期待明天！',
        'Hôm nay là thứ Bảy, thời tiết Bắc Kinh rất đẹp, không lạnh cũng không nóng. Tôi và Tiểu Vương hẹn nhau 9 giờ sáng mai đến Đại học Bắc Kinh chơi. Tiểu Vương bảo anh ấy sẽ đạp xe đạp đến. Chiều mai chúng tôi sẽ cùng đi nghe âm nhạc Trung Quốc, tôi rất mong đợi ngày mai!',
        '星期六 (xīngqīliù - thứ Bảy); 天气 (tiānqì - thời tiết); 见面 (jiànmiàn - gặp mặt); 骑车 (qí chē - đi xe); 音乐 (yīnyuè - âm nhạc).',
        '[{"question":"北京今天的天气怎么样？","options":["很好，不冷不热","很冷","太热了","下雨了"],"correctAnswer":"很好，不冷不热","explanation":"Đoạn văn ghi: 北京的天气很好，不冷也不热 (Thời tiết Bắc Kinh rất đẹp, không lạnh không nóng)."},{"question":"他们打算明天几点见面？","options":["上午九点","下午两点","中午十二点","上午八点"],"correctAnswer":"上午九点","explanation":"Đoạn văn nêu: 明天上午九点去北京大学玩 (9 giờ sáng mai đi chơi Đại học Bắc Kinh)."}]'
    )
) AS p(title, passage_text, translation_text, vocabulary_notes, questions_json)
WHERE NOT EXISTS (
    SELECT 1 FROM reading_passages ex WHERE ex.title = p.title
);

SELECT setval(pg_get_serial_sequence('reading_passages', 'id'), COALESCE((SELECT MAX(id) FROM reading_passages), 1));
