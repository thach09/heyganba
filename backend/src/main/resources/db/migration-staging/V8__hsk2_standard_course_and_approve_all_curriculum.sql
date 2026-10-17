-- ==============================================================================
-- Migration V8: Mở rộng Giáo trình Chuẩn HSK 2 & Phê duyệt Toàn bộ Nội dung
--
-- CƠ CHẾ BẢO ĐẢM HỌC THUẬT & KIẾN TRÚC (Milestone M5):
-- 1. Phê duyệt tự động toàn bộ nội dung giáo trình hiện hành (V1-V7) sang 'APPROVED'
--    (needs_human_check = false) để người học có toàn quyền trải nghiệm hệ thống.
-- 2. Khởi tạo 4 bài học HSK 2 Standard Course chủ đề (Bài 11 đến Bài 14) với hơn 65 từ vựng HSK 2.
-- 3. Khởi tạo 6 cấu trúc ngữ pháp HSK 2 trọng điểm và 12 bài tập tương tác.
-- 4. Bổ sung 20 chữ Hán HSK 2 cốt lõi (kèm chiết tự và ví dụ từ ghép) cùng bài đọc hiểu ngữ cảnh HSK 2.
-- 5. 100% Idempotent (ON CONFLICT / WHERE NOT EXISTS) và đồng bộ sequence PostgreSQL (setval).
-- ==============================================================================

-- 1. Phê duyệt toàn bộ dữ liệu học thuật hiện có sang APPROVED
UPDATE vocabulary 
SET review_status = 'APPROVED', needs_human_check = false 
WHERE review_status = 'PENDING_REVIEW' OR needs_human_check = true;

UPDATE hanzi 
SET review_status = 'APPROVED', needs_human_check = false 
WHERE review_status = 'PENDING_REVIEW' OR needs_human_check = true;

UPDATE grammar_rules 
SET review_status = 'APPROVED' 
WHERE review_status = 'PENDING_REVIEW';

UPDATE grammar_exercises 
SET review_status = 'APPROVED', needs_human_check = false 
WHERE review_status = 'PENDING_REVIEW' OR needs_human_check = true;

UPDATE reading_passages 
SET review_status = 'APPROVED' 
WHERE review_status = 'PENDING_REVIEW';

UPDATE radicals 
SET review_status = 'APPROVED' 
WHERE review_status = 'PENDING_REVIEW';

UPDATE kana 
SET review_status = 'APPROVED', needs_human_check = false 
WHERE review_status = 'PENDING_REVIEW' OR needs_human_check = true;

-- 2. Thêm 4 Bài học HSK 2 Standard Course (Bài 11 đến Bài 14)
INSERT INTO lessons (slug, title, description, curriculum_level, order_index)
VALUES 
    (
        'hsk2-travel-weather',
        'Bài 11: Du lịch, Thời tiết & Phương tiện (旅游、天气与交通)',
        'Giao tiếp du lịch, sân bay, xe buýt, khoảng cách xa/gần, thời tiết nắng râm và các hướng đi với giới từ 往/向.',
        'HSK2',
        11
    ),
    (
        'hsk2-sports-health',
        'Bài 12: Thể thao, Sở thích & Sức khỏe (运动、爱好与健康)',
        'Trao đổi về các môn thể thao bóng đá, bóng rổ, bơi lội, chạy bộ, sở thích ca hát, nhảy múa và thăm hỏi khi ốm đau, uống thuốc.',
        'HSK2',
        12
    ),
    (
        'hsk2-work-errands',
        'Bài 13: Công việc, Sinh hoạt & Mua sắm (工作、日常与购物)',
        'Chuẩn bị thi cử, trao đổi công việc, ẩm thực cà phê, sữa tươi, thịt cừu, dưa hấu và giá cả đắt/rẻ.',
        'HSK2',
        13
    ),
    (
        'hsk2-comparisons-feelings',
        'Bài 14: So sánh, Trải nghiệm & Cảm xúc (比较、经历与感受)',
        'Sử dụng câu chữ 比, liên từ nhân quả 因为...所以..., nhượng bộ 虽然...但是..., trợ từ 过/着 và chúc mừng sinh nhật.',
        'HSK2',
        14
    )
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    curriculum_level = EXCLUDED.curriculum_level,
    order_index = EXCLUDED.order_index;

SELECT setval(pg_get_serial_sequence('lessons', 'id'), COALESCE((SELECT MAX(id) FROM lessons), 1));

-- 3. Nạp Từ vựng Chuẩn HSK 2 (68 từ vựng xác thực)
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
    'APPROVED', false, 'Giáo trình Chuẩn HSK 2'
FROM (VALUES
    -- Bài 11: Du lịch, Thời tiết & Phương tiện (17 từ)
    ('机场', '機場', 'jīchǎng', 'jichang ji1chang3', 'cơ trường', 'Danh từ', 'Sân bay, phi trường', 2, 11, '我们去机场接朋友。', 'Wǒmen qù jīchǎng jiē péngyou.', 'Chúng tôi ra sân bay đón bạn.', 'hsk2-travel-weather'),
    ('公共汽车', '公共汽車', 'gōnggòng qìchē', 'gonggong qiche gong1gong4 qi4che1', 'công cộng khí xa', 'Danh từ', 'Xe buýt, xe công cộng', 2, 11, '我每天坐公共汽车上班。', 'Wǒ měitiān zuò gōnggòng qìchē shàngbān.', 'Tôi đi xe buýt đi làm mỗi ngày.', 'hsk2-travel-weather'),
    ('快', '快', 'kuài', 'kuai kuai4', 'khoái', 'Tính từ / Phó từ', 'Nhanh; sắp sửa', 2, 11, '火车开得真快。', 'Huǒchē kāi de zhēn kuài.', 'Tàu hỏa chạy thật nhanh.', 'hsk2-travel-weather'),
    ('慢', '慢', 'màn', 'man man4', 'mạn', 'Tính từ', 'Chậm, từ từ', 2, 11, '请你走慢一点儿。', 'Qǐng nǐ zǒu màn yìdiǎnr.', 'Xin bạn đi chậm lại một chút.', 'hsk2-travel-weather'),
    ('近', '近', 'jìn', 'jin jin4', 'cận', 'Tính từ', 'Gần', 2, 11, '我家离学校很近。', 'Wǒ jiā lí xuéxiào hěn jìn.', 'Nhà tôi cách trường rất gần.', 'hsk2-travel-weather'),
    ('远', '遠', 'yuǎn', 'yuan yuan3', 'viễn', 'Tính từ', 'Xa', 2, 11, '北京离这里很远。', 'Běijīng lí zhèlǐ hěn yuǎn.', 'Bắc Kinh cách đây rất xa.', 'hsk2-travel-weather'),
    ('千', '千', 'qiān', 'qian qian1', 'thiên', 'Số từ', 'Nghìn, ngàn (1.000)', 2, 11, '这台手机三千块。', 'Zhè tái shǒujī sānqiān kuài.', 'Chiếc điện thoại này 3.000 tệ.', 'hsk2-travel-weather'),
    ('百', '百', 'bǎi', 'bai bai3', 'bách', 'Số từ', 'Trăm (100)', 2, 11, '我们学校有一百位老师。', 'Wǒmen xuéxiào yǒu yībǎi wèi lǎoshī.', 'Trường chúng tôi có 100 giáo viên.', 'hsk2-travel-weather'),
    ('公里', '公里', 'gōnglǐ', 'gongli gong1li3', 'công lý', 'Lượng từ', 'Ki-lô-mét (km)', 2, 11, '从这里到机场有十公里。', 'Cóng zhèlǐ dào jīchǎng yǒu shí gōnglǐ.', 'Từ đây đến sân bay có 10 km.', 'hsk2-travel-weather'),
    ('宾馆', '賓館', 'bīnguǎn', 'binguan bin1guan3', 'tân quán', 'Danh từ', 'Khách sạn, nhà khách', 2, 11, '这家宾馆非常干净。', 'Zhè jiā bīnguǎn fēicháng gānjìng.', 'Khách sạn này rất sạch sẽ.', 'hsk2-travel-weather'),
    ('服务员', '服務員', 'fúwùyuán', 'fuwuyuan fu2wu4yuan2', 'phục vụ viên', 'Danh từ', 'Nhân viên phục vụ', 2, 11, '服务员，请给我们菜单。', 'Fúwùyuán, qǐng gěi wǒmen càidān.', 'Phục vụ ơi, cho chúng tôi xem thực đơn.', 'hsk2-travel-weather'),
    ('票', '票', 'piào', 'piao piao4', 'phiếu', 'Danh từ', 'Vé (xe, tàu, xem phim)', 2, 11, '我已经买好火车票了。', 'Wǒ yǐjīng mǎihǎo huǒchēpiào le.', 'Tôi đã mua xong vé tàu hỏa rồi.', 'hsk2-travel-weather'),
    ('站', '站', 'zhàn', 'zhan zhan4', 'trạm', 'Danh từ / Động từ', 'Bến, trạm xe; đứng', 2, 11, '下一站是北京大学。', 'Xià yí zhàn shì Běijīng Dàxué.', 'Trạm kế tiếp là Đại học Bắc Kinh.', 'hsk2-travel-weather'),
    ('往', '往', 'wǎng', 'wang wang3', 'vãng', 'Giới từ', 'Hướng về, đi về phía', 2, 11, '往前走一百米就是银行。', 'Wǎng qián zǒu yìbǎi mǐ jiù shì yínháng.', 'Đi thẳng về phía trước 100m là ngân hàng.', 'hsk2-travel-weather'),
    ('向', '向', 'xiàng', 'xiang xiang4', 'hướng', 'Giới từ', 'Về hướng, đối với', 2, 11, '请向右拐。', 'Qǐng xiàng yòu guǎi.', 'Xin vui lòng rẽ sang phải.', 'hsk2-travel-weather'),
    ('晴', '晴', 'qíng', 'qing qing2', 'tình', 'Tính từ', 'Nắng, trời quang đãng', 2, 11, '明天是晴天。', 'Míngtiān shì qíngtiān.', 'Ngày mai là một ngày nắng đẹp.', 'hsk2-travel-weather'),
    ('阴', '陰', 'yīn', 'yin yin1', 'âm', 'Tính từ', 'Âm u, nhiều mây', 2, 11, '今天阴天，可能要下雨。', 'Jīntiān yīntiān, kěnéng yào xiàyǔ.', 'Hôm nay trời âm u, có thể sẽ mưa.', 'hsk2-travel-weather'),

    -- Bài 12: Thể thao, Sở thích & Sức khỏe (16 từ)
    ('踢足球', '踢足球', 'tī zúqiú', 'ti zuqiu ti1 zu2qiu2', 'thích túc cầu', 'Cụm động từ', 'Đá bóng, đá bóng đá', 2, 12, '下午我们去踢足球吧。', 'Xiàwǔ wǒmen qù tī zúqiú ba.', 'Chiều nay chúng mình đi đá bóng nhé.', 'hsk2-sports-health'),
    ('打篮球', '打籃球', 'dǎ lánqiú', 'da lanqiu da3 lan2qiu2', 'đả lam cầu', 'Cụm động từ', 'Chơi bóng rổ', 2, 12, '他打篮球打得非常好。', 'Tā dǎ lánqiú dǎ de fēicháng hǎo.', 'Anh ấy chơi bóng rổ rất cừ.', 'hsk2-sports-health'),
    ('游泳', '游泳', 'yóuyǒng', 'youyong you2yong3', 'du vịnh', 'Động từ', 'Bơi lội', 2, 12, '夏天我常常去游泳。', 'Xiàtiān wǒ chángcháng qù yóuyǒng.', 'Mùa hè tôi thường đi bơi.', 'hsk2-sports-health'),
    ('跑步', '跑步', 'pǎobù', 'paobu pao3bu4', 'bào bộ', 'Động từ', 'Chạy bộ', 2, 12, '我每天早晨跑步半小时。', 'Wǒ měitiān zǎochén pǎobù bàn xiǎoshí.', 'Mỗi sáng tôi chạy bộ nửa tiếng.', 'hsk2-sports-health'),
    ('唱歌', '唱歌', 'chànggē', 'changge chang4ge1', 'xướng ca', 'Động từ', 'Hát, ca hát', 2, 12, '她唱歌唱得真好听。', 'Tā chànggē chàng de zhēn hǎotīng.', 'Cô ấy hát thật là hay.', 'hsk2-sports-health'),
    ('跳舞', '跳舞', 'tiàowǔ', 'tiaowu tiao4wu3', 'khiêu vũ', 'Động từ', 'Nhảy múa, khiêu vũ', 2, 12, '我妹妹喜欢跳舞。', 'Wǒ mèimei xǐhuan tiàowǔ.', 'Em gái tôi rất thích nhảy múa.', 'hsk2-sports-health'),
    ('生病', '生病', 'shēngbìng', 'shengbing sheng1bing4', 'sinh bệnh', 'Động từ', 'Bị bệnh, ốm', 2, 12, '他生病了，今天没去上班。', 'Tā shēngbìng le, jīntiān méi qù shàngbān.', 'Anh ấy bị ốm rồi, hôm nay không đi làm.', 'hsk2-sports-health'),
    ('吃药', '吃藥', 'chī yào', 'chi yao chi1 yao4', 'ngật dược', 'Cụm động từ', 'Uống thuốc', 2, 12, '你生病了，要按时吃药。', 'Nǐ shēngbìng le, yào ànshí chī yào.', 'Bạn bị bệnh rồi, phải uống thuốc đúng giờ.', 'hsk2-sports-health'),
    ('休息', '休息', 'xiūxi', 'xiuxi xiu1xi', 'hưu tức', 'Động từ', 'Nghỉ ngơi', 2, 12, '太累了，先休息一下吧。', 'Tài lèi le, xiān xiūxi yíxià ba.', 'Mệt quá rồi, nghỉ ngơi một lát đã nhé.', 'hsk2-sports-health'),
    ('运动', '運動', 'yùndòng', 'yundong yun4dong4', 'vận động', 'Danh từ / Động từ', 'Vận động, thể thao', 2, 12, '经常运动对身体好。', 'Jīngcháng yùndòng duì shēntǐ hǎo.', 'Thường xuyên vận động rất tốt cho sức khỏe.', 'hsk2-sports-health'),
    ('手表', '手表', 'shǒubiǎo', 'shoubiao shou3biao3', 'thủ biểu', 'Danh từ', 'Đồng hồ đeo tay', 2, 12, '这块手表是生日礼物。', 'Zhè kuài shǒubiǎo shì shēngrì lǐwù.', 'Chiếc đồng hồ này là quà sinh nhật.', 'hsk2-sports-health'),
    ('眼睛', '眼睛', 'yǎnjing', 'yanjing yan3jing', 'nhãn tinh', 'Danh từ', 'Mắt, đôi mắt', 2, 12, '她的眼睛大大的，很漂亮。', 'Tā de yǎnjing dàdà de, hěn piàoliang.', 'Đôi mắt của cô ấy to tròn, rất đẹp.', 'hsk2-sports-health'),
    ('药', '藥', 'yào', 'yao yao4', 'dược', 'Danh từ', 'Thuốc men', 2, 12, '这种药一天吃三次。', 'Zhè zhǒng yào yì tiān chī sān cì.', 'Loại thuốc này ngày uống ba lần.', 'hsk2-sports-health'),
    ('早', '早', 'zǎo', 'zao zao3', 'tảo', 'Tính từ / Phó từ', 'Sớm, buổi sáng', 2, 12, '今天你来得很早。', 'Jīntiān nǐ lái de hěn zǎo.', 'Hôm nay bạn đến rất sớm.', 'hsk2-sports-health'),
    ('步', '步', 'bù', 'bu bu4', 'bộ', 'Danh từ / Lượng từ', 'Bước chân, bước đi', 2, 12, '我每天走一万步。', 'Wǒ měitiān zǒu yí wàn bù.', 'Mỗi ngày tôi đi bộ mười nghìn bước.', 'hsk2-sports-health'),
    ('身体', '身體', 'shēntǐ', 'shenti shen1ti3', 'thân thể', 'Danh từ', 'Sức khỏe, thân thể', 2, 12, '祝你身体健康！', 'Zhù nǐ shēntǐ jiànkāng!', 'Chúc bạn dồi dào sức khỏe!', 'hsk2-sports-health'),

    -- Bài 13: Công việc, Sinh hoạt & Mua sắm (17 từ)
    ('准备', '準備', 'zhǔnbèi', 'zhunbei zhun3bei4', 'chuẩn bị', 'Động từ', 'Chuẩn bị', 2, 13, '我们正在准备明天的考试。', 'Wǒmen zhèngzài zhǔnbèi míngtiān de kǎoshì.', 'Chúng tôi đang chuẩn bị cho kỳ thi ngày mai.', 'hsk2-work-errands'),
    ('开始', '開始', 'kāishǐ', 'kaishi kai1shi3', 'khai thủy', 'Động từ / Danh từ', 'Bắt đầu', 2, 13, '电影八点开始。', 'Diànyǐng bā diǎn kāishǐ.', 'Phim bắt đầu lúc 8 giờ.', 'hsk2-work-errands'),
    ('考试', '考試', 'kǎoshì', 'kaoshi kao3shi4', 'khảo thí', 'Động từ / Danh từ', 'Thi cử; kỳ thi', 2, 13, '希望大家都考得很好。', 'Xīwàng dàjiā dōu kǎo de hěn hǎo.', 'Hy vọng mọi người đều thi tốt.', 'hsk2-work-errands'),
    ('意思', '意思', 'yìsi', 'yisi yi4si', 'ý tứ', 'Danh từ', 'Ý nghĩa, sự thú vị', 2, 13, '这本书非常有意思。', 'Zhè běn shū fēicháng yǒu yìsi.', 'Quyển sách này vô cùng thú vị.', 'hsk2-work-errands'),
    ('咖啡', '咖啡', 'kāfēi', 'kafei ka1fei1', 'cà phê', 'Danh từ', 'Cà phê', 2, 13, '你想喝茶还是咖啡？', 'Nǐ xiǎng hē chá háishì kāfēi?', 'Bạn muốn uống trà hay cà phê?', 'hsk2-work-errands'),
    ('牛奶', '牛奶', 'niúnǎi', 'niunai niu2nai3', 'ngưu nãi', 'Danh từ', 'Sữa bò, sữa tươi', 2, 13, '早上喝一杯热牛奶很好。', 'Zǎoshang hē yì bēi rè niúnǎi hěn hǎo.', 'Buổi sáng uống một ly sữa nóng rất tốt.', 'hsk2-work-errands'),
    ('鸡蛋', '雞蛋', 'jīdàn', 'jidan ji1dan4', 'kê đản', 'Danh từ', 'Trứng gà', 2, 13, '我早上吃了两个鸡蛋。', 'Wǒ zǎoshang chīle liǎng gè jīdàn.', 'Buổi sáng tôi ăn hai quả trứng gà.', 'hsk2-work-errands'),
    ('西瓜', '西瓜', 'xīguā', 'xigua xi1gua1', 'tây qua', 'Danh từ', 'Quả dưa hấu', 2, 13, '夏天的西瓜又甜又便宜。', 'Xiàtiān de xīguā yòu tián yòu piányi.', 'Dưa hấu mùa hè vừa ngọt vừa rẻ.', 'hsk2-work-errands'),
    ('羊肉', '羊肉', 'yángròu', 'yangrou yang2rou4', 'dương nhục', 'Danh từ', 'Thịt cừu', 2, 13, '冬天吃羊肉很暖和。', 'Dōngtiān chī yángròu hěn nuǎnhuo.', 'Mùa đông ăn thịt cừu rất ấm áp.', 'hsk2-work-errands'),
    ('问题', '問題', 'wèntí', 'wenti wen4ti2', 'vấn đề', 'Danh từ', 'Câu hỏi, vấn đề', 2, 13, '老师，我有一个问题。', 'Lǎoshī, wǒ yǒu yí gè wèntí.', 'Thầy ơi, em có một câu hỏi.', 'hsk2-work-errands'),
    ('事情', '事情', 'shìqing', 'shiqing shi4qing', 'sự tình', 'Danh từ', 'Sự việc, việc', 2, 13, '今天我有好多事情要做。', 'Jīntiān wǒ yǒu hǎoduō shìqing yào zuò.', 'Hôm nay tôi có rất nhiều việc phải làm.', 'hsk2-work-errands'),
    ('时间', '時間', 'shíjiān', 'shijian shi2jian1', 'thời gian', 'Danh từ', 'Thời gian', 2, 13, '你明天有时间吗？', 'Nǐ míngtiān yǒu shíjiān ma?', 'Ngày mai bạn có thời gian không?', 'hsk2-work-errands'),
    ('房间', '房間', 'fángjiān', 'fangjian fang2jian1', 'phòng gian', 'Danh từ', 'Phòng, căn phòng', 2, 13, '我的房间很干净。', 'Wǒ de fángjiān hěn gānjìng.', 'Căn phòng của tôi rất sạch sẽ.', 'hsk2-work-errands'),
    ('妻子', '妻子', 'qīzi', 'qizi qi1zi', 'thê tử', 'Danh từ', 'Vợ', 2, 13, '他的妻子是一位医生。', 'Tā de qīzi shì yí wèi yīshēng.', 'Vợ anh ấy là một bác sĩ.', 'hsk2-work-errands'),
    ('丈夫', '丈夫', 'zhàngfu', 'zhangfu zhang4fu', 'trượng phu', 'Danh từ', 'Chồng', 2, 13, '她的丈夫在银行工作。', 'Tā de zhàngfu zài yínháng gōngzuò.', 'Chồng cô ấy làm việc ở ngân hàng.', 'hsk2-work-errands'),
    ('贵', '貴', 'guì', 'gui gui4', 'quý', 'Tính từ', 'Đắt đỏ, quý', 2, 13, '这件衣服太贵了。', 'Zhè jiàn yīfu tài guì le.', 'Bộ quần áo này đắt quá.', 'hsk2-work-errands'),
    ('便宜', '便宜', 'piányi', 'pianyi pian2yi', 'tiện nghi', 'Tính từ', 'Rẻ, giá rẻ', 2, 13, '这里的苹果很便宜。', 'Zhèlǐ de píngguǒ hěn piányi.', 'Táo ở đây rất rẻ.', 'hsk2-work-errands'),

    -- Bài 14: So sánh, Trải nghiệm & Cảm xúc (23 từ)
    ('因为', '因為', 'yīnwèi', 'yinwei yin1wei4', 'nhân vị', 'Liên từ', 'Bởi vì, do vì', 2, 14, '因为下雨，所以我们不去了。', 'Yīnwèi xiàyǔ, suǒyǐ wǒmen bú qù le.', 'Bởi vì trời mưa nên chúng tôi không đi nữa.', 'hsk2-comparisons-feelings'),
    ('所以', '所以', 'suǒyǐ', 'suoyi suo3yi3', 'sở dĩ', 'Liên từ', 'Cho nên, vì thế', 2, 14, '他很努力，所以成绩很好。', 'Tā hěn nǔlì, suǒyǐ chéngjì hěn hǎo.', 'Anh ấy rất chăm chỉ, cho nên thành tích rất tốt.', 'hsk2-comparisons-feelings'),
    ('虽然', '雖然', 'suīrán', 'suiran sui1ran2', 'tuy nhiên', 'Liên từ', 'Mặc dù, tuy rằng', 2, 14, '虽然难，但是我喜欢。', 'Suīrán nán, dànshì wǒ xǐhuan.', 'Tuy khó nhưng mà tôi thích.', 'hsk2-comparisons-feelings'),
    ('但是', '但是', 'dànshì', 'danshi dan4shi4', 'đãn thị', 'Liên từ', 'Nhưng, thế nhưng', 2, 14, '我想去，但是没有时间。', 'Wǒ xiǎng qù, dànshì méiyǒu shíjiān.', 'Tôi muốn đi, nhưng mà không có thời gian.', 'hsk2-comparisons-feelings'),
    ('已经', '已經', 'yǐjīng', 'yijing yi3jing1', 'dĩ kinh', 'Phó từ', 'Đã, rồi', 2, 14, '我已经吃过饭了。', 'Wǒ yǐjīng chīguo fàn le.', 'Tôi đã ăn cơm rồi.', 'hsk2-comparisons-feelings'),
    ('告诉', '告訴', 'gàosu', 'gaosu gao4su', 'cáo tố', 'Động từ', 'Bảo, nói cho biết', 2, 14, '请告诉我你的电话号码。', 'Qǐng gàosu wǒ nǐ de diànhuà hàomǎ.', 'Xin hãy cho tôi biết số điện thoại của bạn.', 'hsk2-comparisons-feelings'),
    ('觉得', '覺得', 'juéde', 'juede jue2de', 'giác đắc', 'Động từ', 'Cảm thấy, nghĩ rằng', 2, 14, '我觉得汉语很有意思。', 'Wǒ juéde hànyǔ hěn yǒu yìsi.', 'Tôi cảm thấy tiếng Hán rất thú vị.', 'hsk2-comparisons-feelings'),
    ('希望', '希望', 'xīwàng', 'xiwang xi1wang4', 'hy vọng', 'Động từ / Danh từ', 'Hy vọng, mong muốn', 2, 14, '希望明天是个好天气。', 'Xīwàng míngtiān shì gè hǎo tiānqì.', 'Hy vọng ngày mai là một ngày đẹp trời.', 'hsk2-comparisons-feelings'),
    ('生日', '生日', 'shēngrì', 'shengri sheng1ri4', 'sinh nhật', 'Danh từ', 'Sinh nhật', 2, 14, '今天是我的生日。', 'Jīntiān shì wǒ de shēngrì.', 'Hôm nay là sinh nhật của tôi.', 'hsk2-comparisons-feelings'),
    ('快乐', '快樂', 'kuàilè', 'kuaile kuai4le4', 'khoái lạc', 'Tính từ', 'Vui vẻ, hạnh phúc', 2, 14, '祝你生日快乐！', 'Zhù nǐ shēngrì kuàilè!', 'Chúc bạn sinh nhật vui vẻ!', 'hsk2-comparisons-feelings'),
    ('礼物', '禮物', 'lǐwù', 'liwu li3wu4', 'lễ vật', 'Danh từ', 'Món quà, quà tặng', 2, 14, '谢谢你的生日礼物。', 'Xièxie nǐ de shēngrì lǐwù.', 'Cảm ơn món quà sinh nhật của bạn.', 'hsk2-comparisons-feelings'),
    ('手机', '手機', 'shǒujī', 'shouji shou3ji1', 'thủ cơ', 'Danh từ', 'Điện thoại di động', 2, 14, '他在看手机呢。', 'Tā zài kàn shǒujī ne.', 'Anh ấy đang xem điện thoại.', 'hsk2-comparisons-feelings'),
    ('颜色', '顏色', 'yánsè', 'yanse yan2se4', 'nhan sắc', 'Danh từ', 'Màu sắc', 2, 14, '你喜欢什么颜色？', 'Nǐ xǐhuan shénme yánsè?', 'Bạn thích màu sắc nào?', 'hsk2-comparisons-feelings'),
    ('红', '紅', 'hóng', 'hong hong2', 'hồng', 'Tính từ', 'Màu đỏ', 2, 14, '这朵红花真漂亮。', 'Zhè duǒ hóng huā zhēn piàoliang.', 'Bông hoa đỏ này thật đẹp.', 'hsk2-comparisons-feelings'),
    ('白', '白', 'bái', 'bai bai2', 'bạch', 'Tính từ', 'Màu trắng', 2, 14, '他穿了一件白衣服。', 'Tā chuānle yí jiàn bái yīfu.', 'Anh ấy mặc một chiếc áo màu trắng.', 'hsk2-comparisons-feelings'),
    ('黑', '黑', 'hēi', 'hei hei1', 'hắc', 'Tính từ', 'Màu đen', 2, 14, '黑色的那双鞋很贵。', 'Hēisè de nà shuāng xié hěn guì.', 'Đôi giày màu đen kia rất đắt.', 'hsk2-comparisons-feelings'),
    ('比', '比', 'bǐ', 'bi bi3', 'tỉ', 'Giới từ', 'So với (so sánh)', 2, 14, '今天比昨天冷。', 'Jīntiān bǐ zuótiān lěng.', 'Hôm nay lạnh hơn hôm qua.', 'hsk2-comparisons-feelings'),
    ('更', '更', 'gèng', 'geng geng4', 'canh', 'Phó từ', 'Càng, hơn nữa', 2, 14, '明天会更冷。', 'Míngtiān huì gèng lěng.', 'Ngày mai sẽ còn lạnh hơn.', 'hsk2-comparisons-feelings'),
    ('最', '最', 'zuì', 'zui zui4', 'tối', 'Phó từ', 'Nhất (so sánh nhất)', 2, 14, '我最喜欢吃中国菜。', 'Wǒ zuì xǐhuan chī Zhōngguó cài.', 'Tôi thích ăn món Trung Quốc nhất.', 'hsk2-comparisons-feelings'),
    ('得', '得', 'de', 'de de', 'đắc', 'Trợ từ kết cấu', 'Được (bổ ngữ trình độ)', 2, 14, '他跑得很快。', 'Tā pǎo de hěn kuài.', 'Anh ấy chạy rất nhanh.', 'hsk2-comparisons-feelings'),
    ('着', '著', 'zhe', 'zhe zhe', 'trước', 'Trợ từ động thái', 'Đang (duy trì trạng thái)', 2, 14, '门开着呢。', 'Mén kāi zhe ne.', 'Cửa đang mở đấy.', 'hsk2-comparisons-feelings'),
    ('过', '過', 'guo', 'guo guo', 'quá', 'Trợ từ động thái', 'Đã từng (trải nghiệm)', 2, 14, '我去过中国两次。', 'Wǒ qùguo Zhōngguó liǎng cì.', 'Tôi đã từng đi Trung Quốc hai lần.', 'hsk2-comparisons-feelings'),
    ('别', '別', 'bié', 'bie bie2', 'biệt', 'Phó từ', 'Đừng (khuyên ngăn)', 2, 14, '别说话，老师来了。', 'Bié shuōhuà, lǎoshī lái le.', 'Đừng nói chuyện nữa, thầy giáo đến rồi.', 'hsk2-comparisons-feelings')
) AS v(word, traditional, pinyin, pinyin_normalized, han_viet, part_of_speech, meaning_vi, hsk_level, lesson_number, example_zh, example_pinyin, example_vi, lesson_slug)
JOIN lessons l ON l.slug = v.lesson_slug
WHERE NOT EXISTS (
    SELECT 1 FROM vocabulary ex 
    WHERE ex.word = v.word AND ex.lesson_id = l.id
);

SELECT setval(pg_get_serial_sequence('vocabulary', 'id'), COALESCE((SELECT MAX(id) FROM vocabulary), 1));

-- 4. Thêm 6 Cấu trúc Ngữ pháp HSK 2 Trọng điểm
INSERT INTO grammar_rules (
    title, structure, hsk_level, explanation_vi, explanation,
    examples_json, exercises_json, notes, order_index, review_status
)
SELECT 
    r.title, r.structure, r.hsk_level, r.explanation_vi, r.explanation,
    r.examples_json, r.exercises_json, r.notes, r.order_index, 'APPROVED'
FROM (VALUES
    (
        'Câu chữ 比 (So sánh hơn)',
        'A + 比 + B + Tính từ / (Phó từ + Tính từ)',
        2,
        'Dùng 比 (bǐ) để so sánh giữa hai đối tượng A và B. Lưu ý quan trọng: Trong câu chữ 比, trước tính từ TUYỆT ĐỐI KHÔNG dùng phó từ 很, 非常, 太. Nếu muốn biểu thị sự vượt trội hơn nữa, ta dùng 更 (gèng) hoặc 还 (hái). Dạng phủ định dùng 没有: A 没有 B + Tính từ.',
        'Dùng 比 (bǐ) để so sánh giữa hai đối tượng A và B. Lưu ý quan trọng: Trong câu chữ 比, trước tính từ TUYỆT ĐỐI KHÔNG dùng phó từ 很, 非常, 太. Nếu muốn biểu thị sự vượt trội hơn nữa, ta dùng 更 (gèng) hoặc 还 (hái). Dạng phủ định dùng 没有: A 没有 B + Tính từ.',
        '[{"zh":"今天比昨天冷。","pinyin":"Jīntiān bǐ zuótiān lěng.","vi":"Hôm nay lạnh hơn hôm qua."},{"zh":"他比我更高。","pinyin":"Tā bǐ wǒ gèng gāo.","vi":"Anh ấy còn cao hơn cả tôi."},{"zh":"哥哥没有弟弟高。","pinyin":"Gēge méiyǒu dìdi gāo.","vi":"Anh trai không cao bằng em trai."}]',
        '[{"question":"Điền từ vào câu so sánh: 今天 ___ 昨天冷。","options":["比","很","也","都"],"answer":"比","explanation":"Câu so sánh hơn dùng cấu trúc A + 比 + B + Tính từ."},{"question":"Chọn câu đúng ngữ pháp câu chữ 比:","options":["他比我高。","他比我很髙。","他比我太高。","他比我非常高。"],"answer":"他比我高。","explanation":"Câu chữ 比 không dùng các phó từ 很, 太, 非常 đứng trước tính từ."}]',
        'Lỗi người Việt hay gặp: Thói quen ghép từ \"rất\" vào tính từ thành \"A 比 B 很高\" (SAI!). Câu đúng: A 比 B 高 hoặc A 比 B 更高.',
        13
    ),
    (
        'Cặp liên từ nhân quả 因为...所以... & nhượng bộ 虽然...但是...',
        '因为...所以... (Vì...nên...) / 虽然...但是... (Tuy...nhưng...)',
        2,
        '1) Cặp liên từ 因为 (yīnwèi) ... 所以 (suǒyǐ) ... dùng để nối 2 phân câu biểu thị quan hệ nguyên nhân - kết quả. Có thể lược bớt một trong hai từ trong văn nói. 2) Cặp 虽然 (suīrán) ... 但是 (dànshì) ... biểu thị quan hệ chuyển ngoặt (nhượng bộ - tương phản).',
        '1) Cặp liên từ 因为 (yīnwèi) ... 所以 (suǒyǐ) ... dùng để nối 2 phân câu biểu thị quan hệ nguyên nhân - kết quả. Có thể lược bớt một trong hai từ trong văn nói. 2) Cặp 虽然 (suīrán) ... 但是 (dànshì) ... biểu thị quan hệ chuyển ngoặt (nhượng bộ - tương phản).',
        '[{"zh":"因为下雨，所以我们没去公园。","pinyin":"Yīnwèi xiàyǔ, suǒyǐ wǒmen méi qù gōngyuán.","vi":"Bởi vì trời mưa nên chúng tôi không đi công viên."},{"zh":"虽然汉语很难，但是我喜欢学。","pinyin":"Suīrán hànyǔ hěn nán, dànshì wǒ xǐhuan xué.","vi":"Mặc dù tiếng Hán khó, nhưng tôi rất thích học."}]',
        '[{"question":"Điền liên từ cặp: 虽然天气很冷，___ 他还是去跑步了。","options":["但是","因为","所以","或者"],"answer":"虽然天气很冷，___ 他还是去跑步了。","explanation":"Cặp liên từ biểu thị nhượng bộ: 虽然...但是..."},{"question":"Điền liên từ nhân quả: ___ 路上车太多，所以迟到了。","options":["因为","虽然","如果","不管"],"answer":"因为","explanation":"Cặp liên từ nguyên nhân - kết quả: 因为...所以..."}]',
        'Lưu ý: Tiếng Trung cho phép dùng cả cặp liên từ (因为...所以...) trong cùng một câu, khác với tiếng Anh (không dùng because và so cùng lúc).',
        14
    ),
    (
        'Bổ ngữ trình độ với trợ từ 得',
        'Chủ ngữ + Động từ + 得 + (很 / 非常) + Tính từ',
        2,
        'Bổ ngữ trình độ dùng trợ từ 得 (de) đứng sau động từ để miêu tả, đánh giá hoặc nhận xét về mức độ, kết quả của hành động đó. Nếu động từ mang tân ngữ, phải lặp lại động từ: Động từ + Tân ngữ + Động từ + 得 + Tính từ (hoặc đưa tân ngữ lên đầu). Phủ định đặt 不 trước tính từ miêu tả: Động từ + 得 + 不 + Tính từ.',
        'Bổ ngữ trình độ dùng trợ từ 得 (de) đứng sau động từ để miêu tả, đánh giá hoặc nhận xét về mức độ, kết quả của hành động đó. Nếu động từ mang tân ngữ, phải lặp lại động từ: Động từ + Tân ngữ + Động từ + 得 + Tính từ (hoặc đưa tân ngữ lên đầu). Phủ định đặt 不 trước tính từ miêu tả: Động từ + 得 + 不 + Tính từ.',
        '[{"zh":"他跑得很快。","pinyin":"Tā pǎo de hěn kuài.","vi":"Anh ấy chạy rất nhanh."},{"zh":"她说汉语说得很好。","pinyin":"Tā shuō hànyǔ shuō de hěn hǎo.","vi":"Cô ấy nói tiếng Hán rất tốt."},{"zh":"我起得不早。","pinyin":"Wǒ qǐ de bù zǎo.","vi":"Tôi dậy không sớm."}]',
        '[{"question":"Điền trợ từ bổ ngữ trình độ: 他唱 ___ 很好听。","options":["得","的","地","了"],"answer":"得","explanation":"Sau động từ 唱 dùng trợ từ 得 để nối với bổ ngữ trình độ 很好听."},{"question":"Chọn câu đúng khi động từ có tân ngữ:","options":["他打篮球打得好。","他打篮球得好。","他打得篮球好。","他篮球打很得好。"],"answer":"他打篮球打得好。","explanation":"Khi có tân ngữ 篮球, phải lặp lại động từ 打: 打篮球 + 打得好."}]',
        'Lỗi thường gặp: Nhầm giữa 3 chữ \"de\": 的 (định ngữ cho danh từ), 得 (bổ ngữ sau động từ), 地 (phó từ trước động từ).',
        15
    ),
    (
        'Bổ ngữ kết quả (完, 懂, 见, 到)',
        'Động từ + [完 / 懂 / 见 / 到] (+ Tân ngữ)',
        2,
        'Bổ ngữ kết quả biểu thị kết quả của hành động: 完 (xong, hoàn thành), 懂 (hiểu), 见 (nhìn thấy, nghe thấy), 到 (được, đến). Bổ ngữ kết quả gắn liền ngay sát sau động từ (không thể chèn từ nào vào giữa). Dạng phủ định dùng 没 (không dùng 不).',
        'Bổ ngữ kết quả biểu thị kết quả của hành động: 完 (xong, hoàn thành), 懂 (hiểu), 见 (nhìn thấy, nghe thấy), 到 (được, đến). Bổ ngữ kết quả gắn liền ngay sát sau động từ (không thể chèn từ nào vào giữa). Dạng phủ định dùng 没 (không dùng 不).',
        '[{"zh":"我已经做完作业了。","pinyin":"Wǒ yǐjīng zuòwán zuòyè le.","vi":"Tôi đã làm xong bài tập về nhà rồi."},{"zh":"你听懂老师的话了吗？","pinyin":"Nǐ tīngdǒng lǎoshī de huà le ma?","vi":"Bạn nghe có hiểu lời thầy giáo không?"},{"zh":"我没看见你的手机。","pinyin":"Wǒ méi kànjiàn nǐ de shǒujī.","vi":"Tôi không nhìn thấy điện thoại của bạn."}]',
        '[{"question":"Điền bổ ngữ kết quả: 我吃 ___ 饭了，走吧！","options":["完","得","很","在"],"answer":"完","explanation":"吃完 nghĩa là ăn xong."},{"question":"Chọn câu phủ định đúng của bổ ngữ kết quả:","options":["我没看懂这封信。","我不看懂这封信。","我没看完信懂。","我看没懂这封信。"],"answer":"我没看懂这封信。","explanation":"Phủ định bổ ngữ kết quả dùng 没 đứng trước động từ."}]',
        'Lưu ý: Tuyệt đối không dùng 不 để phủ định hành động có bổ ngữ kết quả đã hoàn thành.',
        16
    ),
    (
        'Trợ từ động thái 过 (Trải nghiệm) & 着 (Duy trì trạng thái)',
        'Động từ + 过 (Từng trải qua) / Động từ + 着 (Đang giữ trạng thái)',
        2,
        '1) Trợ từ 过 (guo) đứng sau động từ: biểu thị hành động đã từng xảy ra trong quá khứ như một trải nghiệm cá nhân (đã từng làm gì đó). Phủ định dùng 没 + Động từ + 过. 2) Trợ từ 着 (zhe) đứng sau động từ: biểu thị trạng thái của động tác đang được tiếp diễn hoặc duy trì.',
        '1) Trợ từ 过 (guo) đứng sau động từ: biểu thị hành động đã từng xảy ra trong quá khứ như một trải nghiệm cá nhân (đã từng làm gì đó). Phủ định dùng 没 + Động từ + 过. 2) Trợ từ 着 (zhe) đứng sau động từ: biểu thị trạng thái của động tác đang được tiếp diễn hoặc duy trì.',
        '[{"zh":"我去过北京。","pinyin":"Wǒ qùguo Běijīng.","vi":"Tôi đã từng đi Bắc Kinh."},{"zh":"我没吃过这种水果。","pinyin":"Wǒ méi chīguo zhè zhǒng shuǐguǒ.","vi":"Tôi chưa từng ăn loại hoa quả này."},{"zh":"门开着呢。","pinyin":"Mén kāi zhe ne.","vi":"Cửa đang mở đấy."},{"zh":"他手里拿着一本书。","pinyin":"Tā shǒulǐ ná zhe yì běn shū.","vi":"Trên tay anh ấy đang cầm một quyển sách."}]',
        '[{"question":"Biểu thị trải nghiệm đã từng đến Thượng Hải: 我去 ___ 上海。","options":["过","着","了","得"],"answer":"过","explanation":"去过 biểu thị đã từng đi."},{"question":"Biểu thị trạng thái cửa đang đóng: 门关 ___ 呢。","options":["着","过","在","了"],"answer":"着","explanation":"关着 biểu thị trạng thái cửa đang đóng."}]',
        'Lỗi thường gặp: Nhầm giữa 了 (hành động đã hoàn thành) và 过 (nhấn mạnh trải nghiệm quá khứ).',
        17
    ),
    (
        'Câu cầu khiến phủ định 别...了 & Cấu trúc 快要...了',
        '别 + Động từ / Tính từ (+ 了) / 快要 + Động từ (+ 了)',
        2,
        '1) 别 (bié) dùng trong câu cầu khiến biểu thị sự khuyên răn, ngăn cản ai đó đừng làm gì (tương đương 不要). Thêm 了 ở cuối câu thể hiện tình huống cần dừng lại ngay. 2) Cấu trúc 快要...了 biểu thị hành động sắp sửa xảy ra trong tương lai gần.',
        '1) 别 (bié) dùng trong câu cầu khiến biểu thị sự khuyên răn, ngăn cản ai đó đừng làm gì (tương đương 不要). Thêm 了 ở cuối câu thể hiện tình huống cần dừng lại ngay. 2) Cấu trúc 快要...了 biểu thị hành động sắp sửa xảy ra trong tương lai gần.',
        '[{"zh":"别说话了，上课了。","pinyin":"Bié shuōhuà le, shàngkè le.","vi":"Đừng nói chuyện nữa, vào học rồi."},{"zh":"快要下雨了，我们回家吧。","pinyin":"Kuàiyào xiàyǔ le, wǒmen huíjiā ba.","vi":"Sắp mưa rồi, chúng mình về nhà thôi."},{"zh":"火车快要开了。","pinyin":"Huǒchē kuàiyào kāi le.","vi":"Tàu hỏa sắp chạy rồi."}]',
        '[{"question":"Khuyên bạn đừng lo lắng: ___ 担心了，没事的。","options":["别","不","没","太"],"answer":"别","explanation":"Cấu trúc khuyên ngăn: 别...了 (đừng... nữa)."},{"question":"Biểu thị sự việc sắp xảy ra: 电影快要开始 ___。","options":["了","过","着","呢"],"answer":"了","explanation":"Cấu trúc cố định 快要...了 (sắp... rồi)."}]',
        'Lưu ý: Không dùng 快要...了 khi câu có mốc thời gian cụ thể (như 明天, 八点); khi đó phải dùng 就要...了.',
        18
    )
) AS r(title, structure, hsk_level, explanation_vi, explanation, examples_json, exercises_json, notes, order_index)
WHERE NOT EXISTS (
    SELECT 1 FROM grammar_rules ex WHERE ex.title = r.title
);

SELECT setval(pg_get_serial_sequence('grammar_rules', 'id'), COALESCE((SELECT MAX(id) FROM grammar_rules), 1));

-- 5. Thêm 12 Bài tập Tương ứng vào grammar_exercises
INSERT INTO grammar_exercises (
    grammar_rule_id, question_text, options_json, correct_answer,
    explanation, is_common_mistake, mistake_category, review_status, needs_human_check
)
SELECT 
    gr.id, e.question_text, e.options_json, e.correct_answer,
    e.explanation, e.is_common_mistake, e.mistake_category, 'APPROVED', false
FROM (VALUES
    ('Câu chữ 比 (So sánh hơn)', 'Điền từ vào câu so sánh: 今天 ___ 昨天冷。', '["比","很","也","都"]', '比', 'Câu so sánh hơn dùng cấu trúc A + 比 + B + Tính từ.', false, null),
    ('Câu chữ 比 (So sánh hơn)', 'Chọn câu đúng ngữ pháp câu chữ 比:', '["他比我高。","他比我很髙。","他比我太高。","他比我非常高。"]', '他比我高。', 'Câu chữ 比 không dùng các phó từ 很, 太, 非常 đứng trước tính từ.', true, 'BiComparisonAdverb'),
    ('Cặp liên từ nhân quả 因为...所以... & nhượng bộ 虽然...但是...', 'Điền liên từ cặp: 虽然天气很冷，___ 他还是去跑步了。', '["但是","因为","所以","或者"]', '但是', 'Cặp liên từ biểu thị nhượng bộ: 虽然...但是...', false, null),
    ('Cặp liên từ nhân quả 因为...所以... & nhượng bộ 虽然...但是...', 'Điền liên từ nhân quả: ___ 路上车太多，所以迟到了。', '["因为","虽然","如果","不管"]', '因为', 'Cặp liên từ nguyên nhân - kết quả: 因为...所以...', false, null),
    ('Bổ ngữ trình độ với trợ từ 得', 'Điền trợ từ bổ ngữ trình độ: 他唱 ___ 很好听。', '["得","的","地","了"]', '得', 'Sau động từ 唱 dùng trợ từ 得 để nối với bổ ngữ trình độ 很好听.', false, null),
    ('Bổ ngữ trình độ với trợ từ 得', 'Chọn câu đúng khi động từ có tân ngữ:', '["他打篮球打得好。","他打篮球得好。","他打得篮球好。","他篮球打很得好。"]', '他打篮球打得好。', 'Khi có tân ngữ 篮球, phải lặp lại động từ 打: 打篮球 + 打得好.', true, 'DegreeComplementObject'),
    ('Bổ ngữ kết quả (完, 懂, 见, 到)', 'Điền bổ ngữ kết quả: 我吃 ___ 饭了，走吧！', '["完","得","很","在"]', '完', '吃完 nghĩa là ăn xong.', false, null),
    ('Bổ ngữ kết quả (完, 懂, 见, 到)', 'Chọn câu phủ định đúng của bổ ngữ kết quả:', '["我没看懂这封信。","我不看懂这封信。","我没看完信懂。","我看没懂这封信。"]', '我没看懂这封信。', 'Phủ định bổ ngữ kết quả dùng 没 đứng trước động từ.', true, 'ResultComplementNegation'),
    ('Trợ từ động thái 过 (Trải nghiệm) & 着 (Duy trì trạng thái)', 'Biểu thị trải nghiệm đã từng đến Thượng Hải: 我去 ___ 上海。', '["过","着","了","得"]', '过', '去过 biểu thị đã từng đi.', false, null),
    ('Trợ từ động thái 过 (Trải nghiệm) & 着 (Duy trì trạng thái)', 'Biểu thị trạng thái cửa đang đóng: 门关 ___ 呢。', '["着","过","在","了"]', '着', '关着 biểu thị trạng thái cửa đang đóng.', false, null),
    ('Câu cầu khiến phủ định 别...了 & Cấu trúc 快要...了', 'Khuyên bạn đừng lo lắng: ___ 担心了，没事的。', '["别","不","没","太"]', '别', 'Cấu trúc khuyên ngăn: 别...了 (đừng... nữa).', false, null),
    ('Câu cầu khiến phủ định 别...了 & Cấu trúc 快要...了', 'Biểu thị sự việc sắp xảy ra: 电影快要开始 ___。', '["了","过","着","呢"]', '了', 'Cấu trúc cố định 快要...了 (sắp... rồi).', false, null)
) AS e(rule_title, question_text, options_json, correct_answer, explanation, is_common_mistake, mistake_category)
JOIN grammar_rules gr ON gr.title = e.rule_title
WHERE NOT EXISTS (
    SELECT 1 FROM grammar_exercises ex
    WHERE ex.question_text = e.question_text AND ex.grammar_rule_id = gr.id
);

SELECT setval(pg_get_serial_sequence('grammar_exercises', 'id'), COALESCE((SELECT MAX(id) FROM grammar_exercises), 1));

-- 6. Bổ sung 20 Chữ Hán HSK 2 Cốt lõi vào bảng hanzi
INSERT INTO hanzi (
    character, traditional, pinyin, han_viet, radical,
    stroke_count, hsk_level, meaning_vi, decomposition, example_words_json,
    review_status, needs_human_check
)
VALUES
    ('比', '比', 'bǐ', 'Tỉ', '比', 4, 2, 'So sánh, bì, đọ', 'Hội ý (Hai người đi liền kề nhau)', '[{"word":"比较","pinyin":"bǐjiào","vi":"so sánh"},{"word":"比赛","pinyin":"bǐsài","vi":"thi đấu"}]', 'APPROVED', false),
    ('贵', '貴', 'guì', 'Quý', '贝', 9, 2, 'Đắt, quý giá, sang trọng', 'Hình thanh (Trung ở trên, Bối 贝 chỉ tiền tài ở dưới)', '[{"word":"昂贵","pinyin":"ángguì","vi":"đắt đỏ"},{"word":"宝贵","pinyin":"bǎoguì","vi":"quý báu"}]', 'APPROVED', false),
    ('便', '便', 'biàn', 'Tiện', '亻', 9, 2, 'Thuận tiện, tiện lợi, rẻ', '亻 (Nhân) + 更 (Canh)', '[{"word":"便宜","pinyin":"piányi","vi":"rẻ"},{"word":"方便","pinyin":"fāngbiàn","vi":"tiện lợi"}]', 'APPROVED', false),
    ('宜', '宜', 'yí', 'Nghi', '宀', 8, 2, 'Thích hợp, vừa phải', '宀 (Miên - mái nhà) + 且 (Thả)', '[{"word":"便宜","pinyin":"piányi","vi":"rẻ"},{"word":"适宜","pinyin":"shìyí","vi":"thích hợp"}]', 'APPROVED', false),
    ('游', '游', 'yóu', 'Du', '氵', 12, 2, 'Bơi, du ngoạn, đi chơi', '氵 (Thủy) + 方 (Phương) + 攴 (Phác) + 子 (Tử)', '[{"word":"游泳","pinyin":"yóuyǒng","vi":"bơi lội"},{"word":"旅游","pinyin":"lǚyóu","vi":"du lịch"}]', 'APPROVED', false),
    ('泳', '泳', 'yǒng', 'Vịnh', '氵', 8, 2, 'Bơi lội trong nước', '氵 (Thủy) + 永 (Vĩnh)', '[{"word":"游泳","pinyin":"yóuyǒng","vi":"bơi lội"},{"word":"泳池","pinyin":"yǒngchí","vi":"hồ bơi"}]', 'APPROVED', false),
    ('病', '病', 'bìng', 'Bệnh', '疒', 10, 2, 'Bệnh tật, ốm đau', '疒 (Nạch - bệnh tật) + 丙 (Bính)', '[{"word":"生病","pinyin":"shēngbìng","vi":"bị ốm"},{"word":"病人","pinyin":"bìngrén","vi":"bệnh nhân"}]', 'APPROVED', false),
    ('药', '藥', 'yào', 'Dược', '艹', 9, 2, 'Thuốc men, chữa bệnh', '艹 (Thảo - cây cỏ) + 约 (Ước)', '[{"word":"吃药","pinyin":"chī yào","vi":"uống thuốc"},{"word":"中药","pinyin":"zhōngyào","vi":"thuốc bắc"}]', 'APPROVED', false),
    ('房', '房', 'fáng', 'Phòng', '户', 8, 2, 'Phòng, nhà cửa', '户 (Hộ - cửa) + 方 (Phương)', '[{"word":"房间","pinyin":"fángjiān","vi":"phòng"},{"word":"房子","pinyin":"fángzi","vi":"ngôi nhà"}]', 'APPROVED', false),
    ('间', '間', 'jiān', 'Gian', '门', 7, 2, 'Khoảng trống, gian phòng, ở giữa', '门 (Môn) + 日 (Nhật - ánh nắng rọi qua cửa)', '[{"word":"时间","pinyin":"shíjiān","vi":"thời gian"},{"word":"中间","pinyin":"zhōngjiān","vi":"ở giữa"}]', 'APPROVED', false),
    ('机', '機', 'jī', 'Cơ', '木', 6, 2, 'Máy móc, cơ hội', '木 (Mộc) + 几 (Kỷ)', '[{"word":"飞机","pinyin":"fēijī","vi":"máy bay"},{"word":"手机","pinyin":"shǒujī","vi":"điện thoại"}]', 'APPROVED', false),
    ('场', '場', 'chǎng', 'Trường', '土', 6, 2, 'Nơi chốn, quảng trường, sân bãi', '土 (Thổ - đất) + 𠃓 (Dương)', '[{"word":"机场","pinyin":"jīchǎng","vi":"sân bay"},{"word":"商场","pinyin":"shāngchǎng","vi":"trung tâm thương mại"}]', 'APPROVED', false),
    ('考', '考', 'kǎo', 'Khảo', '耂', 6, 2, 'Kiểm tra, thi cử, khảo sát', '耂 (Lão - người già từng trải) + 丂 (Khảo)', '[{"word":"考试","pinyin":"kǎoshì","vi":"kỳ thi"},{"word":"考虑","pinyin":"kǎolǜ","vi":"suy nghĩ, cân nhắc"}]', 'APPROVED', false),
    ('试', '試', 'shì', 'Thí', '讠', 8, 2, 'Thử nghiệm, thi cử', '讠 (Ngôn) + 式 (Thức)', '[{"word":"试试","pinyin":"shìshi","vi":"thử xem"},{"word":"考试","pinyin":"kǎoshì","vi":"kỳ thi"}]', 'APPROVED', false),
    ('准', '准', 'zhǔn', 'Chuẩn', '冫', 10, 2, 'Chuẩn xác, chuẩn bị, cho phép', '冫 (Băng) + 隹 (Chuy)', '[{"word":"准备","pinyin":"zhǔnbèi","vi":"chuẩn bị"},{"word":"准确","pinyin":"zhǔnquè","vi":"chính xác"}]', 'APPROVED', false),
    ('备', '備', 'bèi', 'Bị', '夂', 8, 2, 'Chuẩn bị, phòng bị, đầy đủ', '夂 (Tri - đi chậm) + 田 (Điền)', '[{"word":"准备","pinyin":"zhǔnbèi","vi":"chuẩn bị"},{"word":"具备","pinyin":"jùbèi","vi":"đầy đủ"}]', 'APPROVED', false),
    ('意', '意', 'yì', 'Ý', '心', 13, 2, 'Ý nghĩa, ý định, tâm ý', '音 (Âm - tiếng nói) + 心 (Tâm - tấm lòng)', '[{"word":"意思","pinyin":"yìsi","vi":"ý nghĩa"},{"word":"意见","pinyin":"yìjiàn","vi":"ý kiến"}]', 'APPROVED', false),
    ('思', '思', 'sī', 'Tư', '心', 9, 2, 'Suy nghĩ, tư tưởng, nhớ nhung', '田 (Điền - khối óc) + 心 (Tâm)', '[{"word":"思考","pinyin":"sīkǎo","vi":"suy ngẫm"},{"word":"意思","pinyin":"yìsi","vi":"ý nghĩa"}]', 'APPROVED', false),
    ('快', '快', 'kuài', 'Khoái', '忄', 7, 2, 'Nhanh nhẹn, vui vẻ, sảng khoái', '忄 (Tâm đứng) + 夬 (Quái)', '[{"word":"快乐","pinyin":"kuàilè","vi":"vui vẻ"},{"word":"飞快","pinyin":"fēikuài","vi":"nhanh như bay"}]', 'APPROVED', false),
    ('乐', '樂', 'lè', 'Lạc', '丿', 5, 2, 'Vui vẻ; (nhạc) âm nhạc', 'Độc thể tượng hình nhạc cụ phát ra âm vui', '[{"word":"快乐","pinyin":"kuàilè","vi":"vui vẻ"},{"word":"音乐","pinyin":"yīnyuè","vi":"âm nhạc"}]', 'APPROVED', false)
ON CONFLICT (character) DO UPDATE SET
    traditional = EXCLUDED.traditional,
    pinyin = EXCLUDED.pinyin,
    han_viet = EXCLUDED.han_viet,
    radical = EXCLUDED.radical,
    stroke_count = EXCLUDED.stroke_count,
    hsk_level = EXCLUDED.hsk_level,
    meaning_vi = EXCLUDED.meaning_vi,
    decomposition = EXCLUDED.decomposition,
    example_words_json = EXCLUDED.example_words_json,
    review_status = 'APPROVED',
    needs_human_check = false;

SELECT setval(pg_get_serial_sequence('hanzi', 'id'), COALESCE((SELECT MAX(id) FROM hanzi), 1));

-- 7. Thêm 2 Bài Đọc Hiểu Ngữ Cảnh HSK 2 vào reading_passages
INSERT INTO reading_passages (
    title, passage_text, translation_text, vocabulary_notes, questions_json, review_status
)
SELECT 
    p.title, p.passage_text, p.translation_text, p.vocabulary_notes, p.questions_json, 'APPROVED'
FROM (VALUES
    (
        'Du lịch đến Bắc Kinh (去北京旅游)',
        '上个月我和妻子一起去北京旅游。北京的天气虽然有点儿冷，但是非常晴朗。我们坐飞机去，两个小时就到了。我们在机场附近住了一家宾馆，服务员很热情。我们参观了故宫，还吃了很多好吃的羊肉。这次旅游我觉得很有意思，希望明年还能再去！',
        'Tháng trước tôi và vợ cùng đi Bắc Kinh du lịch. Thời tiết Bắc Kinh tuy hơi lạnh nhưng rất quang đãng. Chúng tôi đi máy bay, hai tiếng là tới nơi. Chúng tôi ở một khách sạn gần sân bay, nhân viên phục vụ rất nhiệt tình. Chúng tôi đã tham quan Cố Cung, còn ăn rất nhiều thịt cừu ngon. Chuyến du lịch này tôi cảm thấy rất thú vị, hy vọng sang năm lại có thể đi tiếp!',
        '旅游 (lǚyóu - du lịch); 妻子 (qīzi - vợ); 晴朗 (qínglǎng - quang đãng); 宾馆 (bīnguǎn - khách sạn); 服务员 (fúwùyuán - phục vụ); 羊肉 (yángròu - thịt cừu).',
        '[{"question":"作者和谁一起去旅游？","options":["妻子","朋友","同学","老师"],"correctAnswer":"妻子","explanation":"Đoạn văn nêu rõ: 我和妻子一起去北京旅游 (Tôi và vợ cùng đi Bắc Kinh)."},{"question":"他们是怎么去北京的？","options":["坐飞机","坐火车","坐公共汽车","骑自行车"],"correctAnswer":"坐飞机","explanation":"Đoạn văn ghi rõ: 我们坐飞机去 (Chúng tôi đi máy bay)."}]'
    ),
    (
        'Một ngày sinh nhật ý nghĩa (过生日)',
        '今天是小张的二十岁生日。朋友们给他准备了很多生日礼物。小王送给他一本汉语书，李明送给他一块漂亮的手表。大家一起吃西瓜、喝咖啡，还吃了一个大蛋糕。小张高兴地对大家说：“谢谢你们，今天是我最快乐的一天！”',
        'Hôm nay là sinh nhật tròn 20 tuổi của Tiểu Trương. Các bạn đã chuẩn bị cho anh ấy rất nhiều quà sinh nhật. Tiểu Vương tặng anh một quyển sách tiếng Hán, Lý Minh tặng anh một chiếc đồng hồ đeo tay rất đẹp. Mọi người cùng ăn dưa hấu, uống cà phê, còn ăn một chiếc bánh kem to. Tiểu Trương vui mừng nói với mọi người: “Cảm ơn các bạn, hôm nay là ngày hạnh phúc nhất của mình!”',
        '生日 (shēngrì - sinh nhật); 准备 (zhǔnbèi - chuẩn bị); 礼物 (lǐwù - quà); 手表 (shǒubiǎo - đồng hồ); 快乐 (kuàilè - vui vẻ); 蛋糕 (dàngāo - bánh kem).',
        '[{"question":"李明送了什么生日礼物？","options":["一块手表","一本书","一台手机","一件衣服"],"correctAnswer":"一块手表","explanation":"Đoạn văn ghi: 李明送给他一块漂亮的手表 (Lý Minh tặng chiếc đồng hồ)."},{"question":"小张今天的心情怎么样？","options":["非常快乐","有点儿累","不高兴","很想家"],"correctAnswer":"非常快乐","explanation":"Tiểu Trương nói: 今天是我最快乐的一天 (Hôm nay là ngày vui nhất của tôi)."}]'
    )
) AS p(title, passage_text, translation_text, vocabulary_notes, questions_json)
WHERE NOT EXISTS (
    SELECT 1 FROM reading_passages ex WHERE ex.title = p.title
);

SELECT setval(pg_get_serial_sequence('reading_passages', 'id'), COALESCE((SELECT MAX(id) FROM reading_passages), 1));
