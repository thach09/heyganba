-- =========================================================
-- V5: Seed HSK 1 Thematic Curriculum Expansion - Milestone M2.2
-- Trạng thái: PENDING_REVIEW (Chờ thẩm định học thuật, không promote prod)
-- =========================================================

-- 1. Thêm 3 bài học theo chủ đề đời sống M2.2:
--    - Bài 4: Gia đình & Người thân (family-members)
--    - Bài 5: Thời gian & Lịch trình (time-calendar)
--    - Bài 6: Ăn uống & Mua sắm đời sống (dining-shopping)

INSERT INTO lessons (slug, title, description, curriculum_level, order_index)
VALUES 
    (
        'family-members',
        'Bài 4: Gia đình & Người thân (家庭与亲人)',
        'Học từ vựng xưng hô gia đình (bố, mẹ, anh chị em, con cái), cách hỏi số lượng thành viên với 有/没有, 几 và lượng từ 个.',
        'HSK1',
        4
    ),
    (
        'time-calendar',
        'Bài 5: Thời gian & Lịch trình (时间与日程)',
        'Giao tiếp về mốc thời gian: ngày tháng năm, các ngày trong tuần, giờ phút, các buổi trong ngày (sáng, trưa, chiều) và hôm nay, ngày mai, hôm qua.',
        'HSK1',
        5
    ),
    (
        'dining-shopping',
        'Bài 6: Ăn uống & Mua sắm đời sống (饮食与生活购物)',
        'Học cách gọi món, đồ uống thường ngày (cơm, nước, trà, táo), diễn đạt sở thích (thích, muốn), hỏi giá tiền và đơn vị tệ.',
        'HSK1',
        6
    )
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    curriculum_level = EXCLUDED.curriculum_level,
    order_index = EXCLUDED.order_index;

-- Đồng bộ sequence cho bảng lessons sau khi thêm bài
SELECT setval(pg_get_serial_sequence('lessons', 'id'), COALESCE((SELECT MAX(id) FROM lessons), 1));

-- 2. Thêm 40 từ vựng cốt lõi phân bổ theo 3 bài học chủ đề M2.2
-- Sử dụng NOT EXISTS để ngăn trùng lặp dữ liệu theo ngữ nghĩa (word + lesson_id)
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
    -- Bài 4: Gia đình & Người thân (family-members - 13 từ vựng)
    ('家', '家', 'jiā', 'jia jia1', 'gia', 'Danh từ', 'Nhà, gia đình', 1, 4, '我家有四口人。', 'Wǒ jiā yǒu sì kǒu rén.', 'Nhà tôi có bốn người.', 'family-members', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('爸爸', '爸爸', 'bàba', 'baba ba4ba', 'ba ba', 'Danh từ', 'Bố, cha', 1, 4, '我爸爸是医生。', 'Wǒ bàba shì yīshēng.', 'Bố tôi là bác sĩ.', 'family-members', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('妈妈', '媽媽', 'māma', 'mama ma1ma', 'ma ma', 'Danh từ', 'Mẹ', 1, 4, '我妈妈喜欢喝茶。', 'Wǒ māma xǐhuan hē chá.', 'Mẹ tôi thích uống trà.', 'family-members', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('哥哥', '哥哥', 'gēge', 'gege ge1ge', 'ca ca', 'Danh từ', 'Anh trai', 1, 4, '他是我哥哥。', 'Tā shì wǒ gēge.', 'Anh ấy là anh trai tôi.', 'family-members', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('姐姐', '姐姐', 'jiějie', 'jiejie jie3jie', 'tỷ tỷ', 'Danh từ', 'Chị gái', 1, 4, '我有一个姐姐。', 'Wǒ yǒu yí gè jiějie.', 'Tôi có một người chị gái.', 'family-members', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('弟弟', '弟弟', 'dìdi', 'didi di4di', 'đệ đệ', 'Danh từ', 'Em trai', 1, 4, '我弟弟在上学。', 'Wǒ dìdi zài shàngxué.', 'Em trai tôi đang đi học.', 'family-members', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('妹妹', '妹妹', 'mèimei', 'meimei mei4mei', 'muội muội', 'Danh từ', 'Em gái', 1, 4, '这是我妹妹的书。', 'Zhè shì wǒ mèimei de shū.', 'Đây là sách của em gái tôi.', 'family-members', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('儿子', '兒子', 'érzi', 'erzi er2zi', 'nhi tử', 'Danh từ', 'Con trai', 1, 4, '他儿子今年五岁。', 'Tā érzi jīnnián wǔ suì.', 'Con trai anh ấy năm nay 5 tuổi.', 'family-members', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('女儿', '女兒', 'nǚ''ér', 'nv''er nv3''er2 nu''er', 'nữ nhi', 'Danh từ', 'Con gái', 1, 4, '她有两个女儿。', 'Tā yǒu liǎng gè nǚ''ér.', 'Cô ấy có hai người con gái.', 'family-members', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('有', '有', 'yǒu', 'you you3', 'hữu', 'Động từ', 'Có', 1, 4, '你家有几口人？', 'Nǐ jiā yǒu jǐ kǒu rén?', 'Nhà bạn có mấy người?', 'family-members', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('没', '沒', 'méi', 'mei mei2', 'một', 'Phó từ', 'Không, chưa (phủ định của 有)', 1, 4, '我没有哥哥。', 'Wǒ méiyǒu gēge.', 'Tôi không có anh trai.', 'family-members', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('个', '個', 'gè', 'ge ge4', 'cá', 'Lượng từ', 'Cái, con, người (lượng từ chung)', 1, 4, '三个人一起走。', 'Sān gè rén yìqǐ zǒu.', 'Ba người cùng nhau đi.', 'family-members', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('几', '幾', 'jǐ', 'ji ji3', 'kỷ', 'Đại từ nghi vấn', 'Mấy, bao nhiêu (< 10)', 1, 4, '你今天买几个苹果？', 'Nǐ jīntiān mǎi jǐ gè píngguǒ?', 'Hôm nay bạn mua mấy quả táo?', 'family-members', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),

    -- Bài 5: Thời gian & Lịch trình (time-calendar - 14 từ vựng)
    ('现在', '現在', 'xiànzài', 'xianzai xian4zai4', 'hiện tại', 'Danh từ', 'Bây giờ, hiện tại', 1, 5, '现在几点了？', 'Xiànzài jǐ diǎn le?', 'Bây giờ là mấy giờ rồi?', 'time-calendar', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('点', '點', 'diǎn', 'dian dian3', 'điểm', 'Lượng từ', 'Giờ', 1, 5, '现在是上午八点。', 'Xiànzài shì shàngwǔ bā diǎn.', 'Bây giờ là 8 giờ sáng.', 'time-calendar', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('分', '分', 'fēn', 'fen fen1', 'phân', 'Lượng từ', 'Phút', 1, 5, '十点二十分上课。', 'Shí diǎn èrshí fēn shàngkè.', '10 giờ 20 phút vào học.', 'time-calendar', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('今天', '今天', 'jīntiān', 'jintian jin1tian1', 'kim thiên', 'Danh từ', 'Hôm nay', 1, 5, '今天星期几？', 'Jīntiān xīngqī jǐ?', 'Hôm nay là thứ mấy?', 'time-calendar', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('明天', '明天', 'míngtiān', 'mingtian ming2tian1', 'minh thiên', 'Danh từ', 'Ngày mai', 1, 5, '明天上午见！', 'Míngtiān shàngwǔ jiàn!', 'Hẹn gặp lại sáng mai!', 'time-calendar', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('昨天', '昨天', 'zuótiān', 'zuotian zuo2tian1', 'tạc thiên', 'Danh từ', 'Hôm qua', 1, 5, '昨天是星期天。', 'Zuótiān shì xīngqītiān.', 'Hôm qua là chủ nhật.', 'time-calendar', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('年', '年', 'nián', 'nian nian2', 'niên', 'Danh từ', 'Năm', 1, 5, '他在中国学了两年。', 'Tā zài Zhōngguó xué le liǎng nián.', 'Anh ấy học ở Trung Quốc hai năm.', 'time-calendar', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('月', '月', 'yuè', 'yue yue4', 'nguyệt', 'Danh từ', 'Tháng', 1, 5, '九月一号开学。', 'Jiǔ yuè yī hào kāixué.', 'Ngày 1 tháng 9 khai giảng.', 'time-calendar', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('号', '號', 'hào', 'hao hao4', 'hiệu', 'Danh từ', 'Ngày (trong tháng)', 1, 5, '今天是五号。', 'Jīntiān shì wǔ hào.', 'Hôm nay là ngày mùng 5.', 'time-calendar', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('星期', '星期', 'xīngqī', 'xingqi xing1qi1', 'tinh kỳ', 'Danh từ', 'Tuần, thứ', 1, 5, '这个星期我很忙。', 'Zhè gè xīngqī wǒ hěn máng.', 'Tuần này tôi rất bận.', 'time-calendar', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('上午', '上午', 'shàngwǔ', 'shangwu shang4wu3', 'thượng ngọ', 'Danh từ', 'Buổi sáng', 1, 5, '明天上午我们去学校。', 'Míngtiān shàngwǔ wǒmen qù xuéxiào.', 'Sáng mai chúng tôi đến trường.', 'time-calendar', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('中午', '中午', 'zhōngwǔ', 'zhongwu zhong1wu3', 'trung ngọ', 'Danh từ', 'Buổi trưa', 1, 5, '中午你回宿舍吗？', 'Zhōngwǔ nǐ huí sùshè ma?', 'Buổi trưa bạn có về ký túc xá không?', 'time-calendar', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('下午', '下午', 'xiàwǔ', 'xiawu xia4wu3', 'hạ ngọ', 'Danh từ', 'Buổi chiều', 1, 5, '下午三点开会。', 'Xiàwǔ sān diǎn kāihuì.', '3 giờ chiều họp.', 'time-calendar', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('时候', '時候', 'shíhou', 'shihou shi2hou', 'thời hậu', 'Danh từ', 'Lúc, khi', 1, 5, '你什么时候去北京？', 'Nǐ shénme shíhou qù Běijīng?', 'Khi nào bạn đi Bắc Kinh?', 'time-calendar', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),

    -- Bài 6: Ăn uống & Mua sắm (dining-shopping - 13 từ vựng)
    ('吃', '吃', 'chī', 'chi chi1', 'ngật', 'Động từ', 'Ăn', 1, 6, '你喜欢吃中国菜吗？', 'Nǐ xǐhuan chī Zhōngguó cài ma?', 'Bạn thích ăn món Trung Quốc không?', 'dining-shopping', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('喝', '喝', 'hē', 'he he1', 'hát', 'Động từ', 'Uống', 1, 6, '请喝茶，请坐。', 'Qǐng hē chá, qǐng zuò.', 'Mời uống trà, mời ngồi.', 'dining-shopping', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('茶', '茶', 'chá', 'cha cha2', 'trà', 'Danh từ', 'Trà, chè', 1, 6, '中国人很喜欢喝茶。', 'Zhōngguó rén hěn xǐhuan hē chá.', 'Người Trung Quốc rất thích uống trà.', 'dining-shopping', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('水', '水', 'shuǐ', 'shui shui3', 'thủy', 'Danh từ', 'Nước', 1, 6, '我想喝一杯水。', 'Wǒ xiǎng hē yì bēi shuǐ.', 'Tôi muốn uống một cốc nước.', 'dining-shopping', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('米饭', '米飯', 'mǐfàn', 'mifan mi3fan4', 'mễ phạn', 'Danh từ', 'Cơm', 1, 6, '中午吃米饭还是面条？', 'Zhōngwǔ chī mǐfàn háishi miàntiáo?', 'Buổi trưa ăn cơm hay ăn mì?', 'dining-shopping', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('苹果', '蘋果', 'píngguǒ', 'pingguo ping2guo3', 'bình quả', 'Danh từ', 'Quả táo', 1, 6, '苹果多少钱一斤？', 'Píngguǒ duōshao qián yì jīn?', 'Táo bao nhiêu tiền một cân?', 'dining-shopping', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('菜', '菜', 'cài', 'cai cai4', 'thái', 'Danh từ', 'Món ăn, rau', 1, 6, '这个菜很好吃。', 'Zhè gè cài hěn hǎochī.', 'Món này rất ngon.', 'dining-shopping', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('买', '買', 'mǎi', 'mai mai3', 'mãi', 'Động từ', 'Mua', 1, 6, '你想买什么东西？', 'Nǐ xiǎng mǎi shénme dōngxi?', 'Bạn muốn mua đồ gì?', 'dining-shopping', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('钱', '錢', 'qián', 'qian qian2', 'tiền', 'Danh từ', 'Tiền', 1, 6, '这本书二十块钱。', 'Zhè běn shū èrshí kuài qián.', 'Quyển sách này 20 đồng.', 'dining-shopping', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('块', '塊', 'kuài', 'kuai kuai4', 'khối', 'Lượng từ', 'Đồng (đơn vị tiền tệ)', 1, 6, '一杯茶五块钱。', 'Yì bēi chá wǔ kuài qián.', 'Một cốc trà 5 đồng.', 'dining-shopping', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('喜欢', '喜歡', 'xǐhuan', 'xihuan xi3huan', 'hỉ hoan', 'Động từ', 'Thích, ưa chuộng', 1, 6, '我很喜欢学汉语。', 'Wǒ hěn xǐhuan xué hànyǔ.', 'Tôi rất thích học tiếng Hán.', 'dining-shopping', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('想', '想', 'xiǎng', 'xiang xiang3', 'tưởng', 'Động từ năng nguyện', 'Muốn, nghĩ, nhớ', 1, 6, '我想去北京看朋友。', 'Wǒ xiǎng qù Běijīng kàn péngyou.', 'Tôi muốn đi Bắc Kinh thăm bạn.', 'dining-shopping', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định'),
    ('多少', '多少', 'duōshao', 'duoshao duo1shao', 'đa thiểu', 'Đại từ nghi vấn', 'Bao nhiêu', 1, 6, '请问这个多少钱？', 'Qǐngwèn zhè gè duōshao qián?', 'Xin hỏi cái này bao nhiêu tiền?', 'dining-shopping', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo M2.2 chờ thẩm định')
) AS v(word, traditional, pinyin, pinyin_normalized, han_viet, part_of_speech, meaning_vi, hsk_level, lesson_number, example_zh, example_pinyin, example_vi, lesson_slug, review_status, needs_human_check, source_ref)
JOIN lessons l ON l.slug = v.lesson_slug
WHERE NOT EXISTS (
    SELECT 1 FROM vocabulary ex
    WHERE ex.word = v.word AND ex.lesson_id = l.id
);

-- Đồng bộ sequence cho bảng vocabulary sau khi thêm từ
SELECT setval(pg_get_serial_sequence('vocabulary', 'id'), COALESCE((SELECT MAX(id) FROM vocabulary), 1));
