-- ==============================================================================
-- Migration V7: Hoàn thiện 150 từ vựng Chuẩn HSK 1, Bộ thủ & Mở rộng Chữ Hán
--
-- CƠ CHẾ BẢO ĐẢM HỌC THUẬT & KIẾN TRÚC:
-- 1. Bổ sung 2 bài học HSK 1 cuối cùng:
--    - transport-directions (Bài 9: Giao thông, Phương hướng & Di chuyển - 16 từ)
--    - actions-courtesy-daily (Bài 10: Hành động, Giao tiếp & Đời sống - 16 từ)
--    => Tổng cộng 32 từ vựng mới, nâng tổng số từ vựng staging lên đúng 112 từ PENDING_REVIEW.
--    => Cùng với 38 từ APPROVED gốc ở V2, toàn bộ hệ thống đạt mốc 150 TỪ VỰNG HSK 1 CHUẨN.
-- 2. Khởi tạo 20 Bộ thủ căn bản tiếng Trung (radicals) và mở rộng bảng Chữ Hán (hanzi)
--    kèm chiết tự cấu thành (decomposition) và từ ghép HSK ứng dụng (example_words_json).
-- 3. Toàn bộ nội dung mới mang review_status = 'PENDING_REVIEW' và needs_human_check = true.
-- 4. 100% Idempotent (ON CONFLICT / WHERE NOT EXISTS) và đồng bộ sequence PostgreSQL (setval).
-- ==============================================================================

-- 1. Thêm 2 Bài học Chủ đề HSK 1 cuối cùng (Bài 9 và Bài 10)
INSERT INTO lessons (slug, title, description, curriculum_level, order_index)
VALUES 
    (
        'transport-directions',
        'Giao thông, Phương hướng & Di chuyển (交通与方位)',
        'Hỏi đường, phương hướng trước sau, phương tiện giao thông (máy bay, xe taxi, tàu hỏa) và vị trí đồ vật.',
        'HSK1',
        9
    ),
    (
        'actions-courtesy-daily',
        'Hành động, Giao tiếp & Đời sống (日常行为与交际)',
        'Giao tiếp lịch sự (xin lỗi, gọi điện thoại), hoạt động sinh hoạt thường ngày và miêu tả cảm xúc, ngoại hình.',
        'HSK1',
        10
    )
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    curriculum_level = EXCLUDED.curriculum_level,
    order_index = EXCLUDED.order_index;

SELECT setval(pg_get_serial_sequence('lessons', 'id'), COALESCE((SELECT MAX(id) FROM lessons), 1));

-- 2. Thêm 32 từ vựng HSK 1 cốt lõi phân bổ theo 2 bài học V7 (16 từ / bài)
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
    -- Bài 9: Giao thông, Phương hướng & Di chuyển (16 từ vựng)
    ('飞机', '飛機', 'fēijī', 'feiji fei1ji1', 'phi cơ', 'Danh từ', 'Máy bay', 1, 9, '我坐飞机去北京。', 'Wǒ zuò fēijī qù Běijīng.', 'Tôi đi máy bay đến Bắc Kinh.', 'transport-directions', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('出租车', '出租車', 'chūzūchē', 'chuzuche chu1zu1che1', 'xuất tô xa', 'Danh từ', 'Xe taxi', 1, 9, '我们坐出租车去学校吧。', 'Wǒmen zuò chūzūchē qù xuéxiào ba.', 'Chúng ta đi taxi đến trường nhé.', 'transport-directions', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('火车站', '火車站', 'huǒchēzhàn', 'huochezhan huo3che1zhan4', 'hỏa xa trạm', 'Danh từ', 'Ga tàu hỏa, ga xe lửa', 1, 9, '他在火车站等我。', 'Tā zài huǒchēzhàn děng wǒ.', 'Anh ấy đợi tôi ở ga tàu hỏa.', 'transport-directions', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('开', '開', 'kāi', 'kai kai1', 'khai', 'Động từ', 'Mở; lái xe', 1, 9, '他会开车。', 'Tā huì kāichē.', 'Anh ấy biết lái xe.', 'transport-directions', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('住', '住', 'zhù', 'zhu zhu4', 'trụ', 'Động từ', 'Sống, ở, cư trú', 1, 9, '你住在哪里？', 'Nǐ zhù zài nǎli?', 'Bạn sống ở đâu?', 'transport-directions', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('回', '回', 'huí', 'hui hui2', 'hồi', 'Động từ', 'Về, trở về', 1, 9, '我想回家睡觉。', 'Wǒ xiǎng huíjiā shuìjiào.', 'Tôi muốn về nhà đi ngủ.', 'transport-directions', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('上', '上', 'shàng', 'shang shang4', 'thượng', 'Danh từ vị trí / Động từ', 'Ở trên; lên', 1, 9, '桌子上有几本书。', 'Zhuōzi shàng yǒu jǐ běn shū.', 'Trên bàn có mấy quyển sách.', 'transport-directions', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('下', '下', 'xià', 'xia xia4', 'hạ', 'Danh từ vị trí / Động từ', 'Ở dưới; xuống', 1, 9, '小猫在椅子下。', 'Xiǎomāo zài yǐzi xià.', 'Mèo con ở dưới gầm ghế.', 'transport-directions', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('前面', '前面', 'qiánmian', 'qianmian qian2mian', 'tiền diện', 'Danh từ vị trí', 'Phía trước, đằng trước', 1, 9, '前面那个人是谁？', 'Qiánmian nà ge rén shì shéi?', 'Người đằng trước kia là ai?', 'transport-directions', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('后面', '後面', 'hòumian', 'houmian hou4mian', 'hậu diện', 'Danh từ vị trí', 'Phía sau, đằng sau', 1, 9, '商店在学校后面。', 'Shāngdiàn zài xuéxiào hòumian.', 'Cửa hàng ở phía sau trường học.', 'transport-directions', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('怎么', '怎麼', 'zěnme', 'zenme zen3me', 'chẩm ma', 'Đại từ nghi vấn', 'Làm sao, như thế nào', 1, 9, '这个字怎么读？', 'Zhè ge zì zěnme dú?', 'Chữ này đọc như thế nào?', 'transport-directions', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('怎么样', '怎麼樣', 'zěnmeyàng', 'zenmeyang zen3me yang4', 'chẩm ma dạng', 'Đại từ nghi vấn', 'Thế nào, ra sao', 1, 9, '你今天身体怎么样？', 'Nǐ jīntiān shēntǐ zěnmeyàng?', 'Hôm nay sức khỏe bạn thế nào?', 'transport-directions', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('东西', '東西', 'dōngxi', 'dongxi dong1xi', 'đông tây', 'Danh từ', 'Đồ vật, đồ đạc', 1, 9, '你买了什么东西？', 'Nǐ mǎile shénme dōngxi?', 'Bạn đã mua đồ gì thế?', 'transport-directions', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('杯子', '杯子', 'bēizi', 'beizi bei1zi', 'bôi tử', 'Danh từ', 'Cái cốc, cái ly', 1, 9, '这个杯子真漂亮。', 'Zhè ge bēizi zhēn piàoliang.', 'Cái cốc này thật là đẹp.', 'transport-directions', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('电脑', '電腦', 'diànnǎo', 'diannao dian4nao3', 'điện não', 'Danh từ', 'Máy vi tính, máy tính', 1, 9, '他在用电脑学习。', 'Tā zài yòng diànnǎo xuéxí.', 'Anh ấy đang dùng máy tính học bài.', 'transport-directions', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('电视', '電視', 'diànshì', 'dianshi dian4shi4', 'điện thị', 'Danh từ', 'Tivi, truyền hình', 1, 9, '我想看电视。', 'Wǒ xiǎng kàn diànshì.', 'Tôi muốn xem tivi.', 'transport-directions', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),

    -- Bài 10: Hành động, Giao tiếp & Đời sống (16 từ vựng)
    ('打电话', '打電話', 'dǎ diànhuà', 'da dianhua da3 dian4hua4', 'đả điện thoại', 'Động từ', 'Gọi điện thoại', 1, 10, '李老师在打电话呢。', 'Lǐ lǎoshī zài dǎ diànhuà ne.', 'Thầy Lý đang gọi điện thoại.', 'actions-courtesy-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('睡觉', '睡覺', 'shuìjiào', 'shuijiao shui4jiao4', 'thụy giác', 'Động từ', 'Ngủ, đi ngủ', 1, 10, '太晚了，去睡觉吧。', 'Tài wǎn le, qù shuìjiào ba.', 'Muộn quá rồi, đi ngủ thôi.', 'actions-courtesy-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('看见', '看見', 'kànjiàn', 'kanjian kan4jian4', 'khán kiến', 'Động từ', 'Trông thấy, nhìn thấy', 1, 10, '你看见小王了吗？', 'Nǐ kànjiàn Xiǎo Wáng le ma?', 'Bạn có nhìn thấy Tiểu Vương không?', 'actions-courtesy-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('听见', '聽見', 'tīngjiàn', 'tingjian ting1jian4', 'thính kiến', 'Động từ', 'Nghe thấy', 1, 10, '我听见有人说话。', 'Wǒ tīngjiàn yǒu rén shuōhuà.', 'Tôi nghe thấy có người đang nói chuyện.', 'actions-courtesy-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('认识', '認識', 'rènshi', 'renshi ren4shi', 'nhận thức', 'Động từ', 'Quen biết, biết mặt', 1, 10, '认识你很高兴。', 'Rènshi nǐ hěn gāoxìng.', 'Rất vui được quen biết bạn.', 'actions-courtesy-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('高兴', '高興', 'gāoxìng', 'gaoxing gao1xing4', 'cao hứng', 'Tính từ', 'Vui vẻ, phấn khởi', 1, 10, '今天我很高兴。', 'Jīntiān wǒ hěn gāoxìng.', 'Hôm nay tôi rất vui vẻ.', 'actions-courtesy-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('漂亮', '漂亮', 'piàoliang', 'piaoliang piao4liang', 'phiêu lượng', 'Tính từ', 'Xinh đẹp, đẹp', 1, 10, '他的女儿很漂亮。', 'Tā de nǚ''ér hěn piàoliang.', 'Con gái của anh ấy rất xinh đẹp.', 'actions-courtesy-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('小', '小', 'xiǎo', 'xiao xiao3', 'tiểu', 'Tính từ', 'Nhỏ, bé', 1, 10, '这家饭馆太小了。', 'Zhè jiā fànguǎn tài xiǎo le.', 'Quán ăn này nhỏ quá.', 'actions-courtesy-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('少', '少', 'shǎo', 'shao shao3', 'thiểu', 'Tính từ', 'Ít', 1, 10, '这里的人很少。', 'Zhèlǐ de rén hěn shǎo.', 'Người ở đây rất ít.', 'actions-courtesy-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('些', '些', 'xiē', 'xie xie1', 'ta', 'Lượng từ', 'Một số, vài', 1, 10, '这些苹果很好吃。', 'Zhèxiē píngguǒ hěn hǎochī.', 'Những quả táo này rất ngon.', 'actions-courtesy-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('喂', '喂', 'wèi', 'wei wei4', 'úy', 'Thán từ', 'A-lô (nghe máy); này', 1, 10, '喂，请问张老师在吗？', 'Wèi, qǐngwèn Zhāng lǎoshī zài ma?', 'Alo, xin hỏi thầy Trương có ở đó không?', 'actions-courtesy-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('对不起', '對不起', 'duìbuqǐ', 'duibuqi dui4bu5qi3', 'đối bất khởi', 'Cụm từ lịch sự', 'Xin lỗi', 1, 10, '对不起，我来晚了。', 'Duìbuqǐ, wǒ lái wǎn le.', 'Xin lỗi, tôi đến muộn rồi.', 'actions-courtesy-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('学习', '學習', 'xuéxí', 'xuexi xue2xi2', 'học tập', 'Động từ', 'Học tập, học hành', 1, 10, '他在中国学习汉语。', 'Tā zài Zhōngguó xuéxí hànyǔ.', 'Anh ấy học tiếng Hán ở Trung Quốc.', 'actions-courtesy-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('电影', '電影', 'diànyǐng', 'dianying dian4ying3', 'điện ảnh', 'Danh từ', 'Phim, phim điện ảnh', 1, 10, '明天下午我们去看电影。', 'Míngtiān xiàwǔ wǒmen qù kàn diànyǐng.', 'Chiều mai chúng tôi đi xem phim.', 'actions-courtesy-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('衣服', '衣服', 'yīfu', 'yifu yi1fu', 'y phục', 'Danh từ', 'Quần áo', 1, 10, '这件衣服多少钱？', 'Zhè jiàn yīfu duōshao qián?', 'Bộ quần áo này bao nhiêu tiền?', 'actions-courtesy-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định'),
    ('猫', '貓', 'māo', 'mao mao1', 'miêu', 'Danh từ', 'Con mèo', 1, 10, '我家有一只小猫。', 'Wǒ jiā yǒu yì zhī xiǎomāo.', 'Nhà tôi có một con mèo nhỏ.', 'actions-courtesy-daily', 'PENDING_REVIEW', true, 'HSK 1 Chuẩn - Bản thảo V7 chờ thẩm định')
) AS v(word, traditional, pinyin, pinyin_normalized, han_viet, part_of_speech, meaning_vi, hsk_level, lesson_number, example_zh, example_pinyin, example_vi, lesson_slug, review_status, needs_human_check, source_ref)
JOIN lessons l ON l.slug = v.lesson_slug
WHERE NOT EXISTS (
    SELECT 1 FROM vocabulary ex
    WHERE ex.word = v.word AND ex.lesson_id = l.id
);

SELECT setval(pg_get_serial_sequence('vocabulary', 'id'), COALESCE((SELECT MAX(id) FROM vocabulary), 1));

-- 3. Khởi tạo 20 Bộ thủ căn bản HSK (radicals)
INSERT INTO radicals (id, radical, stroke_count, name, meaning) VALUES
    (1, '亻', 2, 'Nhân đứng (单人旁 dānrénpáng)', 'Chỉ con người, phẩm chất hoặc hoạt động nhân sinh'),
    (2, '口', 3, 'Khẩu (口字旁 kǒuzìpáng)', 'Chỉ miệng, lời nói, âm thanh hoặc việc ăn uống'),
    (3, '女', 3, 'Nữ (女字旁 nǚzìpáng)', 'Chỉ phụ nữ, quan hệ gia đình, tính chất mềm mại'),
    (4, '氵', 3, 'Ba chấm thủy (三点水 sāndiǎnshuǐ)', 'Chỉ nước, chất lỏng, sông ngòi hoặc dòng chảy'),
    (5, '讠', 2, 'Ngôn (言字旁 yánzìpáng)', 'Chỉ ngôn ngữ, lời nói, giao tiếp hoặc ghi chép'),
    (6, '忄', 3, 'Tâm đứng (竖心旁 shùxīnpáng)', 'Chỉ tâm tư, tình cảm, cảm xúc hoặc ý thức nội tâm'),
    (7, '扌', 3, 'Tài gảy / Thủ (提手旁 tíshǒupáng)', 'Chỉ bàn tay và các thao tác vận động bằng tay'),
    (8, '木', 4, 'Mộc (木字旁 mùzìpáng)', 'Chỉ cây cối, thực vật thân gỗ, rừng hoặc đồ gỗ'),
    (9, '日', 4, 'Nhật (日字旁 rìzìpáng)', 'Chỉ mặt trời, ánh sáng, ban ngày, thời gian ngày tháng'),
    (10, '月', 4, 'Nguyệt / Nhục (月字旁 yuèzìpáng)', 'Chỉ mặt trăng, ban đêm hoặc các bộ phận cơ thể bắp thịt'),
    (11, '宀', 3, 'Miên / Mái nhà (宝盖头 bǎogàitóu)', 'Chỉ nhà cửa, mái hiên che chở, không gian trú ngụ'),
    (12, '辶', 3, 'Quai xước (走之底 zǒuzhīdǐ)', 'Chỉ bước đi, di chuyển, đường đi hoặc khoảng cách'),
    (13, '钅', 5, 'Kim (金字旁 jīnzìpáng)', 'Chỉ kim loại, tiền tài hoặc khí cụ sắt thép'),
    (14, '纟', 3, 'Mịch (绞丝旁 jiǎosīpáng)', 'Chỉ tơ lụa, sợi chỉ, dệt may hoặc sự liên hệ ràng buộc'),
    (15, '火', 4, 'Hỏa (火字旁 huǒzìpáng)', 'Chỉ lửa, nhiệt lượng, nấu nướng hoặc sự ấm áp'),
    (16, '土', 3, 'Thổ (提土旁 títǔpáng)', 'Chỉ đất đai, nền đất, bùn đất hoặc vị trí địa lý'),
    (17, '心', 4, 'Tâm đáy (心字底 xīnzìdǐ)', 'Chỉ trái tim, suy nghĩ sâu xa, tấm lòng hoặc ý niệm'),
    (18, '门', 3, 'Môn (门字框 ménzìkuàng)', 'Chỉ cửa ra vào, cổng ngõ hoặc không gian then chốt'),
    (19, '彳', 3, 'Song nhân / Chim chích (双人旁 shuāngrénpáng)', 'Chỉ bước chân, hành trình, đường xá chậm rãi'),
    (20, '阝', 2, 'Phụ / Ấp (双耳旁 shuāng''ěrpáng)', 'Bên trái là Phụ (đồi núi); bên phải là Ấp (thành quách, địa giới)')
ON CONFLICT (id) DO UPDATE SET
    radical = EXCLUDED.radical,
    stroke_count = EXCLUDED.stroke_count,
    name = EXCLUDED.name,
    meaning = EXCLUDED.meaning;

SELECT setval(pg_get_serial_sequence('radicals', 'id'), COALESCE((SELECT MAX(id) FROM radicals), 1));

-- 4. Mở rộng bảng Chữ Hán (hanzi) kèm chiết tự và ví dụ từ vựng HSK 1
INSERT INTO hanzi (
    character, traditional, pinyin, han_viet, radical,
    stroke_count, hsk_level, meaning_vi, decomposition,
    example_words_json, review_status, needs_human_check, source_ref
)
VALUES
    ('你', '你', 'nǐ', 'nhĩ', '亻', 7, 1, 'Bạn, anh, chị (ngôi thứ hai)', '亻 + 尔', '[{"word":"你好","pinyin":"nǐ hǎo","vi":"xin chào"},{"word":"你们","pinyin":"nǐmen","vi":"các bạn"}]', 'PENDING_REVIEW', true, 'HSK 1 - Bản thảo V7'),
    ('他', '他', 'tā', 'tha', '亻', 5, 1, 'Anh ấy, ông ấy, cậu ấy', '亻 + 也', '[{"word":"他们","pinyin":"tāmen","vi":"họ, bọn họ"}]', 'PENDING_REVIEW', true, 'HSK 1 - Bản thảo V7'),
    ('她', '她', 'tā', 'tha', '女', 6, 1, 'Cô ấy, bà ấy, chị ấy', '女 + 也', '[{"word":"她们","pinyin":"tāmen","vi":"các cô ấy"}]', 'PENDING_REVIEW', true, 'HSK 1 - Bản thảo V7'),
    ('吃', '吃', 'chī', 'cật', '口', 6, 1, 'Ăn uống, dùng bữa', '口 + 乞', '[{"word":"吃饭","pinyin":"chīfàn","vi":"ăn cơm"},{"word":"好吃","pinyin":"hǎochī","vi":"ngon"}]', 'PENDING_REVIEW', true, 'HSK 1 - Bản thảo V7'),
    ('喝', '喝', 'hē', 'hát', '口', 12, 1, 'Uống', '口 + 曷', '[{"word":"喝茶","pinyin":"hē chá","vi":"uống trà"},{"word":"喝水","pinyin":"hē shuǐ","vi":"uống nước"}]', 'PENDING_REVIEW', true, 'HSK 1 - Bản thảo V7'),
    ('话', '話', 'huà', 'thoại', '讠', 8, 1, 'Lời nói, câu chuyện', '讠 + 舌', '[{"word":"说话","pinyin":"shuōhuà","vi":"nói chuyện"},{"word":"打电话","pinyin":"dǎ diànhuà","vi":"gọi điện thoại"}]', 'PENDING_REVIEW', true, 'HSK 1 - Bản thảo V7'),
    ('说', '說', 'shuō', 'thuyết', '讠', 9, 1, 'Nói, bảo', '讠 + 兑', '[{"word":"说话","pinyin":"shuōhuà","vi":"nói chuyện"}]', 'PENDING_REVIEW', true, 'HSK 1 - Bản thảo V7'),
    ('打', '打', 'dǎ', 'đả', '扌', 5, 1, 'Đánh, gọi điện thoại', '扌 + 丁', '[{"word":"打电话","pinyin":"dǎ diànhuà","vi":"gọi điện thoại"}]', 'PENDING_REVIEW', true, 'HSK 1 - Bản thảo V7'),
    ('想', '想', 'xiǎng', 'tưởng', '心', 13, 1, 'Muốn, nghĩ, nhớ', '相 + 心', '[{"word":"想念","pinyin":"xiǎngniàn","vi":"nhớ nhung"}]', 'PENDING_REVIEW', true, 'HSK 1 - Bản thảo V7'),
    ('家', '家', 'jiā', 'gia', '宀', 10, 1, 'Nhà, gia đình', '宀 + 豕', '[{"word":"大家","pinyin":"dàjiā","vi":"mọi người"},{"word":"回家","pinyin":"huíjiā","vi":"về nhà"}]', 'PENDING_REVIEW', true, 'HSK 1 - Bản thảo V7'),
    ('字', '字', 'zì', 'tự', '宀', 6, 1, 'Chữ, chữ Hán', '宀 + 子', '[{"word":"汉字","pinyin":"hànzì","vi":"chữ Hán"},{"word":"写字","pinyin":"xiězì","vi":"viết chữ"}]', 'PENDING_REVIEW', true, 'HSK 1 - Bản thảo V7'),
    ('看', '看', 'kàn', 'khán', '目', 9, 1, 'Nhìn, xem, đọc', '⺁ + 目', '[{"word":"看书","pinyin":"kàn shū","vi":"đọc sách"},{"word":"看见","pinyin":"kànjiàn","vi":"nhìn thấy"}]', 'PENDING_REVIEW', true, 'HSK 1 - Bản thảo V7'),
    ('车', '車', 'chē', 'xa', '车', 4, 1, 'Xe cộ, phương tiện', 'Độc thể', '[{"word":"火车站","pinyin":"huǒchēzhàn","vi":"ga xe lửa"},{"word":"出租车","pinyin":"chūzūchē","vi":"xe taxi"}]', 'PENDING_REVIEW', true, 'HSK 1 - Bản thảo V7')
ON CONFLICT (character) DO UPDATE SET
    traditional = EXCLUDED.traditional,
    pinyin = EXCLUDED.pinyin,
    han_viet = EXCLUDED.han_viet,
    radical = EXCLUDED.radical,
    stroke_count = EXCLUDED.stroke_count,
    hsk_level = EXCLUDED.hsk_level,
    meaning_vi = EXCLUDED.meaning_vi,
    decomposition = EXCLUDED.decomposition,
    example_words_json = EXCLUDED.example_words_json;

SELECT setval(pg_get_serial_sequence('hanzi', 'id'), COALESCE((SELECT MAX(id) FROM hanzi), 1));

-- 5. Ánh xạ quan hệ Chữ Hán - Bộ thủ (kanji_radicals)
INSERT INTO kanji_radicals (kanji_id, radical_id)
SELECT h.id, r.id
FROM (VALUES
    ('你', 1),   -- 你 -> 亻 (Nhân đứng)
    ('他', 1),   -- 他 -> 亻
    ('人', 1),   -- 人 -> 亻/人
    ('她', 3),   -- 她 -> 女 (Nữ)
    ('好', 3),   -- 好 -> 女
    ('口', 2),   -- 口 -> 口 (Khẩu)
    ('吃', 2),   -- 吃 -> 口
    ('喝', 2),   -- 喝 -> 口
    ('话', 5),   -- 话 -> 讠 (Ngôn)
    ('说', 5),   -- 说 -> 讠
    ('语', 5),   -- 语 -> 讠
    ('水', 4),   -- 水 -> 氵 (Thủy)
    ('打', 7),   -- 打 -> 扌 (Thủ)
    ('木', 8),   -- 木 -> 木 (Mộc)
    ('日', 9),   -- 日 -> 日 (Nhật)
    ('月', 10),  -- 月 -> 月 (Nguyệt)
    ('家', 11),  -- 家 -> 宀 (Miên)
    ('字', 11),  -- 字 -> 宀
    ('火', 15),  -- 火 -> 火 (Hỏa)
    ('想', 17)   -- 想 -> 心 (Tâm)
) AS m(character, radical_id)
JOIN hanzi h ON h.character = m.character
JOIN radicals r ON r.id = m.radical_id
ON CONFLICT (kanji_id, radical_id) DO NOTHING;
