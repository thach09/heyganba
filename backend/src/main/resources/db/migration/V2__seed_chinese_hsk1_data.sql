-- =========================================================
-- V2: Seed Chinese HSK 1 Foundational Data
-- =========================================================

-- 1. Seed Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'ROLE_USER', 'Standard learner account'),
(2, 'ROLE_ADMIN', 'Platform administrator')
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Lessons (HSK 1 Lessons 1–3)
INSERT INTO lessons (id, slug, title, description, curriculum_level, order_index) VALUES
(1, 'hsk1-lesson-1', 'Bài 1: Chào hỏi (问候)', 'Học các câu chào hỏi căn bản, làm quen Pinyin và Thanh điệu.', 'HSK1', 1),
(2, 'hsk1-lesson-2', 'Bài 2: Làm quen & Quốc tịch (认识与国籍)', 'Giới thiệu bản thân, quốc tịch, nghề nghiệp và trường học.', 'HSK1', 2),
(3, 'hsk1-lesson-3', 'Bài 3: Mua sắm & Ăn uống (买东西与吃饭)', 'Hỏi giá tiền, gọi món ăn, đồ uống và các vật dụng thường ngày.', 'HSK1', 3)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Hanzi (25 foundational characters)
INSERT INTO hanzi (character, traditional, pinyin, han_viet, radical, stroke_count, hsk_level, meaning_vi, decomposition, example_words_json) VALUES
('人', '人', 'rén', 'nhân', '人', 2, 1, 'Người, con người', 'Độc thể', '[{"word":"中国人","pinyin":"zhōngguórén","vi":"người Trung Quốc"},{"word":"男人","pinyin":"nánrén","vi":"đàn ông"}]'),
('口', '口', 'kǒu', 'khẩu', '口', 3, 1, 'Miệng, lượng từ chỉ nhân khẩu', 'Độc thể', '[{"word":"人口","pinyin":"rénkǒu","vi":"dân số"},{"word":"一口水","pinyin":"yì kǒu shuǐ","vi":"một ngụm nước"}]'),
('日', '日', 'rì', 'nhật', '日', 4, 1, 'Mặt trời, ngày', 'Độc thể', '[{"word":"生日","pinyin":"shēngrì","vi":"sinh nhật"},{"word":"今日","pinyin":"jīnrì","vi":"hôm nay"}]'),
('月', '月', 'yuè', 'nguyệt', '月', 4, 1, 'Mặt trăng, tháng', 'Độc thể', '[{"word":"月亮","pinyin":"yuèliang","vi":"mặt trăng"},{"word":"一月","pinyin":"yīyuè","vi":"tháng một"}]'),
('水', '水', 'shuǐ', 'thủy', '水', 4, 1, 'Nước, chất lỏng', 'Độc thể', '[{"word":"喝水","pinyin":"hē shuǐ","vi":"uống nước"},{"word":"水果","pinyin":"shuǐguǒ","vi":"hoa quả"}]'),
('火', '火', 'huǒ', 'hỏa', '火', 4, 1, 'Lửa', 'Độc thể', '[{"word":"火车","pinyin":"huǒchē","vi":"tàu hỏa"},{"word":"火山","pinyin":"huǒshān","vi":"núi lửa"}]'),
('山', '山', 'shān', 'sơn', '山', 3, 1, 'Núi, đồi', 'Độc thể', '[{"word":"高山","pinyin":"gāoshān","vi":"núi cao"},{"word":"爬山","pinyin":"pá shān","vi":"leo núi"}]'),
('木', '木', 'mù', 'mộc', '木', 4, 1, 'Cây, gỗ', 'Độc thể', '[{"word":"树木","pinyin":"shùmù","vi":"cây cối"},{"word":"木头","pinyin":"mùtou","vi":"khúc gỗ"}]'),
('好', '好', 'hǎo', 'hảo', '女', 6, 1, 'Tốt, đẹp, hay, khỏe', '女 + 子', '[{"word":"你好","pinyin":"nǐ hǎo","vi":"xin chào"},{"word":"好看","pinyin":"hǎokàn","vi":"đẹp, dễ nhìn"}]'),
('学', '學', 'xué', 'học', '子', 8, 1, 'Học tập, bắt chước', '冖 + 子', '[{"word":"学习","pinyin":"xuéxí","vi":"học tập"},{"word":"学生","pinyin":"xuésheng","vi":"học sinh"}]'),
('生', '生', 'shēng', 'sinh', '生', 5, 1, 'Sinh ra, sống, học trò', 'Độc thể', '[{"word":"生活","pinyin":"shēnghuó","vi":"cuộc sống"},{"word":"先生","pinyin":"xiānsheng","vi":"tiên sinh, ông"}]'),
('中', '中', 'zhōng', 'trung', '丨', 4, 1, 'Ở giữa, bên trong, Trung Quốc', '口 + 丨', '[{"word":"中国","pinyin":"zhōngguó","vi":"Trung Quốc"},{"word":"中文","pinyin":"zhōngwén","vi":"tiếng Trung"}]'),
('国', '國', 'guó', 'quốc', '囗', 8, 1, 'Đất nước, quốc gia', '囗 + 玉', '[{"word":"国家","pinyin":"guójiā","vi":"quốc gia"},{"word":"外国","pinyin":"wàiguó","vi":"nước ngoài"}]'),
('语', '語', 'yǔ', 'ngữ', '讠', 9, 1, 'Ngôn ngữ, lời nói', '讠 + 吾', '[{"word":"汉语","pinyin":"hànyǔ","vi":"tiếng Hán"},{"word":"英语","pinyin":"yīngyǔ","vi":"tiếng Anh"}]'),
('文', '文', 'wén', 'văn', '文', 4, 1, 'Văn tự, chữ viết, văn hóa', 'Độc thể', '[{"word":"文化","pinyin":"wénhuà","vi":"văn hóa"},{"word":"文章","pinyin":"wénzhāng","vi":"bài văn"}]'),
('大', '大', 'dà', 'đại', '大', 3, 1, 'To, lớn', 'Độc thể', '[{"word":"大家","pinyin":"dàjiā","vi":"mọi người"},{"word":"大学","pinyin":"dàxué","vi":"đại học"}]'),
('小', '小', 'xiǎo', 'tiểu', '小', 3, 1, 'Nhỏ, bé', 'Độc thể', '[{"word":"小孩","pinyin":"xiǎohái","vi":"trẻ con"},{"word":"小时","pinyin":"xiǎoshí","vi":"giờ đồng hồ"}]'),
('多', '多', 'duō', 'đa', '夕', 6, 1, 'Nhiều', '夕 + 夕', '[{"word":"多少","pinyin":"duōshao","vi":"bao nhiêu"},{"word":"很多","pinyin":"hěn duō","vi":"rất nhiều"}]'),
('少', '少', 'shǎo', 'thiểu', '小', 4, 1, 'Ít, thiếu', '小 + 丿', '[{"word":"少女","pinyin":"shàonǚ","vi":"thiếu nữ"},{"word":"少见","pinyin":"shǎojiàn","vi":"hiếm thấy"}]'),
('上', '上', 'shàng', 'thượng', '一', 3, 1, 'Trên, lên trên, đi làm', 'Chỉ sự', '[{"word":"上午","pinyin":"shàngwǔ","vi":"buổi sáng"},{"word":"上班","pinyin":"shàngbān","vi":"đi làm"}]'),
('下', '下', 'xià', 'hạ', '一', 3, 1, 'Dưới, xuống, tan tầm', 'Chỉ sự', '[{"word":"下午","pinyin":"xiàwǔ","vi":"buổi chiều"},{"word":"下班","pinyin":"xiàbān","vi":"tan làm"}]'),
('左', '左', 'zuǒ', 'tả', '工', 5, 1, 'Bên trái', '𠂇 + 工', '[{"word":"左边","pinyin":"zuǒbian","vi":"bên trái"},{"word":"左右","pinyin":"zuǒyòu","vi":"khoảng chừng"}]'),
('右', '右', 'yòu', 'hữu', '口', 5, 1, 'Bên phải', '𠂇 + 口', '[{"word":"右边","pinyin":"yòubian","vi":"bên phải"},{"word":"右手","pinyin":"yòushǒu","vi":"tay phải"}]'),
('一', '一', 'yī', 'nhất', '一', 1, 1, 'Số một', 'Độc thể', '[{"word":"一起","pinyin":"yìqǐ","vi":"cùng nhau"},{"word":"一下","pinyin":"yíxià","vi":"một lát"}]'),
('二', '二', 'èr', 'nhị', '二', 2, 1, 'Số hai', 'Độc thể', '[{"word":"二十","pinyin":"èrshí","vi":"hai mươi"},{"word":"二月","pinyin":"èryuè","vi":"tháng hai"}]'),
('三', '三', 'sān', 'tam', '一', 3, 1, 'Số ba', 'Độc thể', '[{"word":"三月","pinyin":"sānyuè","vi":"tháng ba"},{"word":"三十","pinyin":"sānshí","vi":"ba mươi"}]')
ON CONFLICT (character) DO NOTHING;

-- 4. Seed Vocabulary (38 authentic HSK 1 items across Lessons 1–3)
INSERT INTO vocabulary (word, traditional, pinyin, pinyin_normalized, han_viet, part_of_speech, meaning_vi, hsk_level, lesson_number, example_zh, example_pinyin, example_vi, lesson_id) VALUES
('你好', '你好', 'nǐ hǎo', 'ni hao ni3 hao3', 'nễ hảo', 'Chào hỏi', 'Xin chào', 1, 1, '你好！很高兴认识你。', 'Nǐ hǎo! Hěn gāoxìng rènshi nǐ.', 'Xin chào! Rất vui được làm quen với bạn.', 1),
('谢谢', '謝謝', 'xièxie', 'xiexie xie4xie', 'tạ tạ', 'Động từ', 'Cảm ơn', 1, 1, '谢谢你的热情帮助。', 'Xièxie nǐ de rèqíng bāngzhù.', 'Cảm ơn sự giúp đỡ nhiệt tình của bạn.', 1),
('不客气', '不客氣', 'bú kèqi', 'bu keqi bu2 ke4qi', 'bất khách khí', 'Cụm từ', 'Không có gì / Đừng khách sáo', 1, 1, '不客气，这是我应该做的。', 'Bú kèqi, zhè shì wǒ yīnggāi zuò de.', 'Không có gì, đây là điều tôi nên làm.', 1),
('对不起', '對不起', 'duìbuqǐ', 'duibuqi dui4bu5qi3', 'đối bất khởi', 'Cụm từ', 'Xin lỗi', 1, 1, '对不起，我今天迟到了。', 'Duìbuqǐ, wǒ jīntiān chídào le.', 'Xin lỗi, hôm nay tôi đến muộn rồi.', 1),
('没关系', '沒關係', 'méi guānxi', 'mei guanxi mei2 guan1xi', 'một quan hệ', 'Cụm từ', 'Không sao đâu / Không có chi', 1, 1, '没关系，请快坐下吧。', 'Méi guānxi, qǐng kuài zuò xia ba.', 'Không sao đâu, xin mời ngồi xuống mau.', 1),
('再见', '再見', 'zàijiàn', 'zaijian zai4jian4', 'tái kiến', 'Động từ', 'Tạm biệt', 1, 1, '明天见，老师再见！', 'Míngtiān jiàn, lǎoshī zàijiàn!', 'Ngày mai gặp lại, chào tạm biệt thầy!', 1),
('好', '好', 'hǎo', 'hao hao3', 'hảo', 'Tính từ', 'Tốt, đẹp, khỏe', 1, 1, '今天天气很好。', 'Jīntiān tiānqì hěn hǎo.', 'Thời tiết hôm nay rất tốt.', 1),
('请', '請', 'qǐng', 'qing qing3', 'thỉnh', 'Động từ', 'Xin mời, làm ơn', 1, 1, '请进，请喝茶。', 'Qǐng jìn, qǐng hē chá.', 'Mời vào, xin mời uống trà.', 1),
('老师', '老師', 'lǎoshī', 'laoshi lao3shi1', 'lão sư', 'Danh từ', 'Thầy giáo / Cô giáo', 1, 2, '李老师是我们的汉语老师。', 'Lǐ lǎoshī shì wǒmen de hànyǔ lǎoshī.', 'Thầy Lý là giáo viên tiếng Trung của chúng tôi.', 2),
('学生', '學生', 'xuésheng', 'xuesheng xue2sheng', 'học sinh', 'Danh từ', 'Học sinh, sinh viên', 1, 2, '我们学校有很多外国学生。', 'Wǒmen xuéxiào yǒu hěn duō wàiguó xuésheng.', 'Trường chúng tôi có rất nhiều du học sinh.', 2),
('中国', '中國', 'zhōngguó', 'zhongguo zhong1guo2', 'Trung Quốc', 'Danh từ riêng', 'Trung Quốc', 1, 2, '我想去中国旅游。', 'Wǒ xiǎng qù zhōngguó lǚyóu.', 'Tôi muốn đi du lịch Trung Quốc.', 2),
('越南', '越南', 'yuènán', 'yuenan yue4nan2', 'Việt Nam', 'Danh từ riêng', 'Việt Nam', 1, 2, '我是越南人，我住在河内。', 'Wǒ shì yuènán rén, wǒ zhù zài hénèi.', 'Tôi là người Việt Nam, tôi sống ở Hà Nội.', 2),
('学习', '學習', 'xuéxí', 'xuexi xue2xi2', 'học tập', 'Động từ', 'Học tập, học', 1, 2, '我们一起学习汉语语法。', 'Wǒmen yìqǐ xuéxí hànyǔ yǔfǎ.', 'Chúng ta cùng nhau học ngữ pháp tiếng Trung.', 2),
('汉语', '漢語', 'hànyǔ', 'hanyu han4yu3', 'Hán ngữ', 'Danh từ', 'Tiếng Trung, tiếng Hán', 1, 2, '汉语的发音很有意思。', 'Hànyǔ de fāyīn hěn yǒu yìsi.', 'Phát âm của tiếng Trung rất thú vị.', 2),
('朋友', '朋友', 'péngyou', 'pengyou peng2you', 'bằng hữu', 'Danh từ', 'Bạn bè', 1, 2, '他是我的好朋友。', 'Tā shì wǒ de hǎo péngyou.', 'Anh ấy là người bạn tốt của tôi.', 2),
('高兴', '高興', 'gāoxìng', 'gaoxing gao1xing4', 'cao hứng', 'Tính từ', 'Vui vẻ, phấn khởi', 1, 2, '今天见到你我很高兴。', 'Jīntiān jiàndào nǐ wǒ hěn gāoxìng.', 'Hôm nay được gặp bạn tôi rất vui.', 2),
('认识', '認識', 'rènshi', 'renshi ren4shi', 'nhận thức', 'Động từ', 'Quen biết, nhận biết', 1, 2, '认识你我也很高兴。', 'Rènshi nǐ wǒ yě hěn gāoxìng.', 'Quen biết bạn tôi cũng rất vui.', 2),
('很', '很', 'hěn', 'hen hen3', 'ngận', 'Phó từ', 'Rất', 1, 2, '汉语语法不太难，汉字很难。', 'Hànyǔ yǔfǎ bú tài nán, hànzì hěn nán.', 'Ngữ pháp tiếng Trung không khó lắm, chữ Hán rất khó.', 2),
('人', '人', 'rén', 'ren ren2', 'nhân', 'Danh từ', 'Người, con người', 1, 2, '你是哪国人？我是越南人。', 'Nǐ shì nǎ guó rén? Wǒ shì yuènán rén.', 'Bạn là người nước nào? Tôi là người Việt Nam.', 2),
('叫', '叫', 'jiào', 'jiao jiao4', 'khiếu', 'Động từ', 'Gọi là, tên là', 1, 2, '我叫王明，你叫什么？', 'Wǒ jiào wáng míng, nǐ jiào shénme?', 'Tôi tên là Vương Minh, bạn tên là gì?', 2),
('什么', '什麼', 'shénme', 'shenme shen2me', 'thập ma', 'Đại từ', 'Cái gì', 1, 2, '你叫什么名字？', 'Nǐ jiào shénme míngzi?', 'Bạn tên là gì?', 2),
('名字', '名字', 'míngzi', 'mingzi ming2zi', 'danh tự', 'Danh từ', 'Tên', 1, 2, '我的中文名字很好听。', 'Wǒ de zhōngwén míngzi hěn hǎotīng.', 'Tên tiếng Trung của tôi rất hay.', 2),
('爸爸', '爸爸', 'bàba', 'baba ba4ba', 'ba ba', 'Danh từ', 'Bố, ba', 1, 2, '我爸爸今年五十岁。', 'Wǒ bàba jīnnián wǔshí suì.', 'Bố tôi năm nay 50 tuổi.', 2),
('妈妈', '媽媽', 'māma', 'mama ma1ma', 'ma ma', 'Danh từ', 'Mẹ, má', 1, 2, '我妈妈是一位医生。', 'Wǒ māma shì yí wèi yīshēng.', 'Mẹ tôi là một bác sĩ.', 2),
('哪', '哪', 'nǎ', 'na na3', 'nả', 'Đại từ', 'Nào, đâu', 1, 2, '你是哪国人？', 'Nǐ shì nǎ guó rén?', 'Bạn là người nước nào?', 2),
('喝', '喝', 'hē', 'he he1', 'hạt', 'Động từ', 'Uống', 1, 3, '你想喝茶还是喝咖啡？', 'Nǐ xiǎng hē chá háishì hē kāfēi?', 'Bạn muốn uống trà hay uống cà phê?', 3),
('茶', '茶', 'chá', 'cha cha2', 'trà', 'Danh từ', 'Trà, chè', 1, 3, '中国人很喜欢喝热茶。', 'Zhōngguórén hěn xǐhuan hē rè chá.', 'Người Trung Quốc rất thích uống trà nóng.', 3),
('吃', '吃', 'chī', 'chi chi1', 'ngật', 'Động từ', 'Ăn', 1, 3, '你想吃中国菜吗？', 'Nǐ xiǎng chī zhōngguó cài ma?', 'Bạn muốn ăn món Trung Quốc không?', 3),
('米饭', '米飯', 'mǐfàn', 'mifan mi3fan4', 'mão phạn', 'Danh từ', 'Cơm trắng', 1, 3, '服务员，请给我一碗米饭。', 'Fúwùyuán, qǐng gěi wǒ yì wǎn mǐfàn.', 'Phục vụ, cho tôi một bát cơm trắng.', 3),
('钱', '錢', 'qián', 'qian qian2', 'tiền', 'Danh từ', 'Tiền, tiền bạc', 1, 3, '这本书多少钱？二十块钱。', 'Zhè běn shū duōshao qián? Èrshí kuài qián.', 'Cuốn sách này bao nhiêu tiền? 20 tệ.', 3),
('买', '買', 'mǎi', 'mai mai3', 'mãi', 'Động từ', 'Mua', 1, 3, '我想买这件红色的衣服。', 'Wǒ xiǎng mǎi zhè jiàn hóngsè de yīfu.', 'Tôi muốn mua chiếc áo màu đỏ này.', 3),
('多少', '多少', 'duōshao', 'duoshao duo1shao3', 'đa thiểu', 'Đại từ', 'Bao nhiêu', 1, 3, '这个苹果多少钱一斤？', 'Zhè ge píngguǒ duōshao qián yì jīn?', 'Táo này bao nhiêu tiền một cân?', 3),
('块', '塊', 'kuài', 'kuai kuai4', 'khối', 'Lượng từ', 'Đồng, tệ (khẩu ngữ tiền tệ)', 1, 3, '一杯茶五块钱。', 'Yì bēi chá wǔ kuài qián.', 'Một cốc trà 5 đồng.', 3),
('水', '水', 'shuǐ', 'shui shui3', 'thủy', 'Danh từ', 'Nước', 1, 3, '我渴了，我想喝一杯水。', 'Wǒ kě le, wǒ xiǎng hē yì bēi shuǐ.', 'Tôi khát rồi, tôi muốn uống một cốc nước.', 3),
('苹果', '蘋果', 'píngguǒ', 'pingguo ping2guo3', 'bình quả', 'Danh từ', 'Quả táo', 1, 3, '这里的苹果又大又甜。', 'Zhèlǐ de píngguǒ yòu dà yòu tián.', 'Táo ở đây vừa to vừa ngọt.', 3),
('家', '家', 'jiā', 'jia jia1', 'gia', 'Danh từ', 'Gia đình, nhà', 1, 3, '你家有几口人？我家有四口人。', 'Nǐ jiā yǒu jǐ kǒu rén? Wǒ jiā yǒu sì kǒu rén.', 'Nhà bạn có mấy người? Nhà tôi có 4 người.', 3),
('有', '有', 'yǒu', 'you you3', 'hữu', 'Động từ', 'Có, sở hữu', 1, 3, '你有没有汉语书？', 'Nǐ yǒu méi yǒu hànyǔ shū?', 'Bạn có sách tiếng Trung không?', 3),
('书', '書', 'shū', 'shu shu1', 'thư', 'Danh từ', 'Sách, cuốn sách', 1, 3, '我很喜欢看中国文学书。', 'Wǒ hěn xǐhuan kàn zhōngguó wénxué shū.', 'Tôi rất thích đọc sách văn học Trung Quốc.', 3);

-- 5. Seed 6 Core HSK 1 Grammar Structures
INSERT INTO grammar_rules (id, title, structure, hsk_level, explanation_vi, explanation, examples_json, exercises_json, lesson_id, order_index) VALUES
(1, 'Câu phán đoán với 是', 'Chủ ngữ + 是 + Tân ngữ danh từ', 1, 
 'Động từ "是" (shì) tương đương với "là" trong tiếng Việt, dùng để phán đoán, xác nhận danh tính, quốc tịch, nghề nghiệp hoặc đặc điểm của sự vật. Thể phủ định dùng "不是" (bú shì).',
 'Động từ "是" (shì) tương đương với "là" trong tiếng Việt, dùng để phán đoán, xác nhận danh tính, quốc tịch, nghề nghiệp hoặc đặc điểm của sự vật. Thể phủ định dùng "不是" (bú shì).',
 '[{"zh":"我是学生。","pinyin":"Wǒ shì xuésheng.","vi":"Tôi là học sinh."},{"zh":"他不是老师，他是医生。","pinyin":"Tā bú shì lǎoshī, tā shì yīshēng.","vi":"Anh ấy không phải thầy giáo, anh ấy là bác sĩ."},{"zh":"这是汉语书。","pinyin":"Zhè shì hànyǔ shū.","vi":"Đây là sách tiếng Trung."}]',
 '[{"question":"Điền từ thích hợp: 我 ___ 越南人。","options":["是","在","有","不"],"answer":"是","explanation":"Dùng 是 để nối chủ ngữ với danh từ quốc tịch 越南人."},{"question":"Chọn câu phủ định đúng:","options":["我没是老师。","我不是老师。","我不老师。","我没老师。"],"answer":"我不是老师。","explanation":"Phủ định của động từ 是 luôn là 不是, không bao giờ dùng 没."}]',
 2, 1),

(2, 'Câu hỏi Có/Không với trợ từ 吗', 'Câu trần thuật + 吗？', 1,
 'Trợ từ nghi vấn "吗" (ma) đặt ở cuối câu trần thuật để biến câu đó thành câu hỏi Có/Không (tương đương "...phải không?", "...à?", "...chăng?"). Khi trả lời, có thể lặp lại động từ chính hoặc dùng 是/不是.',
 'Trợ từ nghi vấn "吗" (ma) đặt ở cuối câu trần thuật để biến câu đó thành câu hỏi Có/Không (tương đương "...phải không?", "...à?", "...chăng?"). Khi trả lời, có thể lặp lại động từ chính hoặc dùng 是/不是.',
 '[{"zh":"你是中国人吗？","pinyin":"Nǐ shì zhōngguórén ma?","vi":"Bạn là người Trung Quốc phải không?"},{"zh":"你喝茶吗？","pinyin":"Nǐ hē chá ma?","vi":"Bạn uống trà không?"},{"zh":"汉语难吗？","pinyin":"Hànyǔ nán ma?","vi":"Tiếng Hán có khó không?"}]',
 '[{"question":"Chuyển câu sau thành câu hỏi Có/Không: 他是老师。","options":["他是老师吗？","他是老师呢？","他是老师什么？","他是老师谁？"],"answer":"他是老师吗？","explanation":"Thêm trợ từ nghi vấn 吗 vào cuối câu trần thuật để tạo câu hỏi Có/Không."},{"question":"Trả lời câu hỏi: 你喝咖啡吗？ (Khẳng định)","options":["喝","不喝","没有","是吗"],"answer":"喝","explanation":"Trả lời khẳng định câu hỏi Yes/No ngắn gọn bằng cách nhắc lại vị ngữ động từ."}]',
 1, 2),

(3, 'Quan hệ sở hữu và định ngữ với 的', 'Định ngữ + 的 + Trung tâm ngữ', 1,
 'Trợ từ kết cấu "的" (de) dùng để nối định ngữ với trung tâm ngữ, biểu thị: 1) Quan hệ sở hữu ("của"): 我的书 (sách của tôi); 2) Quan hệ miêu tả tính chất: 好的老师 (giáo viên tốt). Lưu ý: Khi danh từ chỉ người thân hoặc mối quan hệ thân thiết, có thể lược bỏ 的 (VD: 我爸爸).',
 'Trợ từ kết cấu "的" (de) dùng để nối định ngữ với trung tâm ngữ, biểu thị: 1) Quan hệ sở hữu ("của"): 我的书 (sách của tôi); 2) Quan hệ miêu tả tính chất: 好的老师 (giáo viên tốt). Lưu ý: Khi danh từ chỉ người thân hoặc mối quan hệ thân thiết, có thể lược bỏ 的 (VD: 我爸爸).',
 '[{"zh":"这是我的书。","pinyin":"Zhè shì wǒ de shū.","vi":"Đây là sách của tôi."},{"zh":"他的汉语很好。","pinyin":"Tā de hànyǔ hěn hǎo.","vi":"Tiếng Trung của anh ấy rất tốt."},{"zh":"我朋友在中国工作。","pinyin":"Wǒ péngyou zài zhōngguó gōngzuò.","vi":"Bạn tôi làm việc ở Trung Quốc (lược bỏ 的)."}]',
 '[{"question":"Chọn cụm từ đúng nghĩa \"Bạn của tôi\":","options":["我朋友 / 我的朋友","我友的","我的友","友我的"],"answer":"我朋友 / 我的朋友","explanation":"Định ngữ đứng trước 的 đứng trước trung tâm ngữ. Với người quen có thể lược 的."},{"question":"Sắp xếp câu: 书 / 是 / 这 / 我 / 的","options":["这是我的书。","这我的书是。","这是书我的。","书是我的这。"],"answer":"这是我的书。","explanation":"Cấu trúc: Đây (这) + là (是) + sách của tôi (我的书)."}]',
 2, 3),

(4, 'Chỉ nơi chốn và hành động với 在', 'Chủ ngữ + 在 + Nơi chốn (+ Động từ)', 1,
 '"在" (zài) có hai cách dùng chính ở HSK 1: 1) Làm động từ vị ngữ mang nghĩa "ở / tại": 我在家 (Tôi ở nhà); 2) Làm giới từ chỉ nơi chốn diễn ra hành động: Chủ ngữ + 在 + Nơi chốn + Hành động (VD: 我在中国学习 - Tôi học tập ở Trung Quốc). Thứ tự từ luôn là "Ở ĐÂU LÀM GÌ", ngược với tiếng Việt!',
 '"在" (zài) có hai cách dùng chính ở HSK 1: 1) Làm động từ vị ngữ mang nghĩa "ở / tại": 我在家 (Tôi ở nhà); 2) Làm giới từ chỉ nơi chốn diễn ra hành động: Chủ ngữ + 在 + Nơi chốn + Hành động (VD: 我在中国学习 - Tôi học tập ở Trung Quốc). Thứ tự từ luôn là "Ở ĐÂU LÀM GÌ", ngược với tiếng Việt!',
 '[{"zh":"李老师在学校。","pinyin":"Lǐ lǎoshī zài xuéxiào.","vi":"Thầy Lý ở trường học."},{"zh":"我们在中国学习汉语。","pinyin":"Wǒmen zài zhōngguó xuéxí hànyǔ.","vi":"Chúng tôi học tiếng Trung ở Trung Quốc."},{"zh":"你爸爸在哪儿工作？","pinyin":"Nǐ bàba zài nǎr gōngzuò?","vi":"Bố bạn làm việc ở đâu?"}]',
 '[{"question":"Chọn trật tự câu đúng cho \"Tôi ăn cơm ở nhà\":","options":["我在家吃饭。","我吃饭在家。","家在吃饭我。","我饭吃在家。"],"answer":"我在家吃饭。","explanation":"Quy tắc vàng tiếng Trung: Ở ĐÂU trước rồi mới LÀM GÌ (在 + Địa điểm + Động từ)."},{"question":"Phủ định của 在 khi làm động từ:","options":["不在","没在","不有","没是"],"answer":"不在","explanation":"Phủ định sự có mặt hoặc vị trí dùng 不在."}]',
 3, 4),

(5, 'Phân biệt phó từ phủ định 不 và 没', '不 + Tính từ / Động từ  vs  没 + Động từ / 有', 1,
 '"不" (bù) dùng để phủ định ý chí chủ quan, thói quen, chân lý hiển nhiên hoặc hành động ở hiện tại và tương lai (VD: 我不吃肉 - Tôi không ăn thịt). "没" (méi) dùng để phủ định hành động đã xảy ra trong quá khứ ("chưa"), hoặc đi với "有" để biểu thị không sở hữu (没有 - không có).',
 '"不" (bù) dùng để phủ định ý chí chủ quan, thói quen, chân lý hiển nhiên hoặc hành động ở hiện tại và tương lai (VD: 我不吃肉 - Tôi không ăn thịt). "没" (méi) dùng để phủ định hành động đã xảy ra trong quá khứ ("chưa"), hoặc đi với "有" để biểu thị không sở hữu (没有 - không có).',
 '[{"zh":"我不喝茶，我喝水。","pinyin":"Wǒ bù hē chá, wǒ hē shuǐ.","vi":"Tôi không uống trà (thói quen/ý chí), tôi uống nước."},{"zh":"我今天没有去学校。","pinyin":"Wǒ jīntiān méiyǒu qù xuéxiào.","vi":"Hôm nay tôi chưa/không đến trường (hành động quá khứ)."},{"zh":"我没有钱。","pinyin":"Wǒ méiyǒu qián.","vi":"Tôi không có tiền."}]',
 '[{"question":"Điền từ: 我昨天 ___ 去上课。","options":["没","不","别","非"],"answer":"没","explanation":"Hành động trong quá khứ (昨天 - hôm qua) dùng 没 để phủ định sự phát sinh."},{"question":"Điền từ: 我 ___ 是中国人，我是越南人。","options":["不","没","无","未"],"answer":"不","explanation":"Động từ 是 luôn đi với 不 (不是), không bao giờ dùng 没是."}]',
 2, 5),

(6, 'Trợ từ ngữ khí nghi vấn tỉnh lược 呢', 'Danh từ / Đại từ + 呢？', 1,
 'Trợ từ "呢" (ne) đặt sau danh từ hoặc đại từ để tạo câu hỏi tỉnh lược khi ngữ cảnh đã rõ ràng, mang nghĩa "Thế còn... thì sao?" hoặc "ở đâu?". Ví dụ: 我很好，你呢？ (Tôi rất khỏe, còn bạn thì sao?); 我的手机呢？ (Điện thoại của tôi đâu rồi?).',
 'Trợ từ "呢" (ne) đặt sau danh từ hoặc đại từ để tạo câu hỏi tỉnh lược khi ngữ cảnh đã rõ ràng, mang nghĩa "Thế còn... thì sao?" hoặc "ở đâu?". Ví dụ: 我很好，你呢？ (Tôi rất khỏe, còn bạn thì sao?); 我的手机呢？ (Điện thoại của tôi đâu rồi?).',
 '[{"zh":"我很好，你呢？","pinyin":"Wǒ hěn hǎo, nǐ ne?","vi":"Tôi rất khỏe, còn bạn thì sao?"},{"zh":"我是越南人，他呢？","pinyin":"Wǒ shì yuènán rén, tā ne?","vi":"Tôi là người Việt Nam, còn anh ấy thì sao?"},{"zh":"我的茶呢？在桌子上。","pinyin":"Wǒ de chá ne? Zài zhuōzi shang.","vi":"Trà của tôi đâu rồi? Ở trên bàn."}]',
 '[{"question":"Hoàn thành hội thoại: A: 我喜欢喝茶。 B: 他 ___？","options":["呢","吗","吧","啊"],"answer":"呢","explanation":"Dùng 呢 để hỏi lặp lại câu hỏi trước cho một đối tượng mới (\"Còn anh ấy thì sao?\")."},{"question":"\"Sách của tôi đâu rồi?\" dịch sang tiếng Trung là:","options":["我的书呢？","我的书吗？","我的书是？","谁的书呢？"],"answer":"我的书呢？","explanation":"Khi tìm đồ vật, Danh từ + 呢? biểu thị \"...ở đâu rồi?\"."}]',
 1, 6)
ON CONFLICT (id) DO NOTHING;

-- 6. Seed corresponding individual Grammar Exercises for backward compatibility
INSERT INTO grammar_exercises (grammar_rule_id, question_text, options_json, correct_answer, explanation) VALUES
(1, 'Điền từ thích hợp vào chỗ trống: 我 ___ 越南人。', '["是","在","有","不"]', '是', 'Dùng 是 để nối chủ ngữ với danh từ quốc tịch 越南人.'),
(1, 'Chọn câu phủ định đúng trong các câu sau:', '["我没是老师。","我不是老师。","我不老师。","我没老师。"]', '我不是老师。', 'Phủ định của động từ 是 luôn là 不是, không bao giờ dùng 没.'),
(2, 'Chuyển câu sau thành câu hỏi Có/Không: 他是老师。', '["他是老师吗？","他是老师呢？","他是老师什么？","他是老师谁？"]', '他是老师吗？', 'Thêm trợ từ nghi vấn 吗 vào cuối câu trần thuật để tạo câu hỏi Có/Không.'),
(2, 'Trả lời câu hỏi: 你喝咖啡吗？ (Khẳng định)', '["喝","不喝","没有","是吗"]', '喝', 'Trả lời khẳng định câu hỏi Yes/No ngắn gọn bằng cách nhắc lại vị ngữ động từ.'),
(3, 'Chọn cụm từ đúng nghĩa "Bạn của tôi":', '["我朋友 / 我的朋友","我友的","我的友","友我的"]', '我朋友 / 我的朋友', 'Định ngữ đứng trước 的 đứng trước trung tâm ngữ. Với người quen có thể lược 的.'),
(3, 'Sắp xếp các từ thành câu đúng: 书 / 是 / 这 / 我 / 的', '["这是我的书。","这我的书是。","这是书我的。","书是我的这。"]', '这是我的书。', 'Cấu trúc: Đây (这) + là (是) + sách của tôi (我的书).'),
(4, 'Chọn trật tự câu đúng cho "Tôi ăn cơm ở nhà":', '["我在家吃饭。","我吃饭在家。","家在吃饭我。","我饭吃在家。"]', '我在家吃饭。', 'Quy tắc vàng tiếng Trung: Ở ĐÂU trước rồi mới LÀM GÌ (在 + Địa điểm + Động từ).'),
(4, 'Phủ định của 在 khi làm động từ:', '["不在","没在","不有","没是"]', '不在', 'Phủ định sự có mặt hoặc vị trí dùng 不在.'),
(5, 'Điền từ phủ định: 我昨天 ___ 去上课。', '["没","不","别","非"]', '没', 'Hành động trong quá khứ (昨天 - hôm qua) dùng 没 để phủ định sự phát sinh.'),
(5, 'Điền từ phủ định: 我 ___ 是中国人，我是越南人。', '["不","没","无","未"]', '不', 'Động từ 是 luôn đi với 不 (不是), không bao giờ dùng 没是.'),
(6, 'Hoàn thành hội thoại: A: 我喜欢喝茶。 B: 他 ___？', '["呢","吗","吧","啊"]', '呢', 'Dùng 呢 để hỏi lặp lại câu hỏi trước cho một đối tượng mới ("Còn anh ấy thì sao?").'),
(6, '"Sách của tôi đâu rồi?" dịch sang tiếng Trung là:', '["我的书呢？","我的书吗？","我的书是？","谁的书呢？"]', '我的书呢？', 'Khi tìm đồ vật, Danh từ + 呢? biểu thị "...ở đâu rồi?".');
