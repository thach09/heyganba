-- =========================================================
-- V4: Seed bảng vocabulary (bộ từ vựng khởi điểm theo bài JPD113 / JPD123)
--
-- ⚠️ DRAFT — nội dung do agent soạn dựa trên tham khảo chương trình Dekiru Nihongo
--    (docs/Internal/content-mapping-fpt-curriculum.md). CHƯA được người biết tiếng Nhật duyệt:
--    cần review cách đọc / nghĩa / ví dụ trước khi promote lên production.
--    Đây là bộ khởi điểm, chưa phải danh sách đầy đủ của bài 1-7.
--
-- Quy tắc idempotent: unique index theo (word, lesson_id) + ON CONFLICT DO NOTHING.
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_vocabulary_word_lesson ON vocabulary (word, lesson_id);

INSERT INTO vocabulary (word, reading, meaning, sino_vietnamese, example_sentence, example_reading, example_meaning, lesson_id)
SELECT v.word, v.reading, v.meaning, v.sino_vietnamese, v.example_sentence, v.example_reading, v.example_meaning, l.id
FROM (VALUES
    -- jpd113-b1: Chào hỏi & Làm quen
    ('私', 'わたし', 'tôi (đại từ ngôi thứ nhất)', NULL, '私は学生です。', 'watashi wa gakusei desu', 'Tôi là học sinh.', 'jpd113-b1'),
    ('学生', 'がくせい', 'học sinh, sinh viên', '學生', 'あの人は学生です。', 'ano hito wa gakusei desu', 'Người kia là học sinh.', 'jpd113-b1'),
    ('先生', 'せんせい', 'giáo viên, thầy cô', '先生', '田中先生は日本語の先生です。', 'Tanaka sensei wa nihongo no sensei desu', 'Thầy Tanaka là giáo viên tiếng Nhật.', 'jpd113-b1'),
    ('名前', 'なまえ', 'tên', '名字', 'お名前は何ですか。', 'onamae wa nan desu ka', 'Tên bạn là gì?', 'jpd113-b1'),
    ('国', 'くに', 'đất nước, quốc gia', '國', 'お国はどちらですか。', 'okuni wa dochira desu ka', 'Bạn đến từ nước nào?', 'jpd113-b1'),
    ('日本', 'にほん', 'Nhật Bản', '日本', '私は日本から来ました。', 'watashi wa nihon kara kimashita', 'Tôi đến từ Nhật Bản.', 'jpd113-b1'),
    -- jpd113-b2: Đồ vật & Địa điểm
    ('本', 'ほん', 'sách', '本', 'これは本です。', 'kore wa hon desu', 'Đây là quyển sách.', 'jpd113-b2'),
    ('辞書', 'じしょ', 'từ điển', '辭書', '辞書はどこですか。', 'jisho wa doko desu ka', 'Từ điển ở đâu?', 'jpd113-b2'),
    ('教室', 'きょうしつ', 'lớp học, phòng học', '教室', '教室に机があります。', 'kyoushitsu ni tsukue ga arimasu', 'Trong lớp học có cái bàn.', 'jpd113-b2'),
    ('机', 'つくえ', 'cái bàn', '机', '机の上に本があります。', 'tsukue no ue ni hon ga arimasu', 'Trên bàn có quyển sách.', 'jpd113-b2'),
    ('上', 'うえ', 'phía trên', '上', '机の上に辞書があります。', 'tsukue no ue ni jisho ga arimasu', 'Trên bàn có quyển từ điển.', 'jpd113-b2'),
    ('食堂', 'しょくどう', 'nhà ăn, căng tin', '食堂', 'ここは食堂です。', 'koko wa shokudou desu', 'Đây là nhà ăn.', 'jpd113-b2'),
    -- jpd113-b3: Mua sắm & Thời gian
    ('時間', 'じかん', 'thời gian, giờ', '時間', '今、時間がありますか。', 'ima, jikan ga arimasu ka', 'Bây giờ bạn có thời gian không?', 'jpd113-b3'),
    ('円', 'えん', 'yên (đơn vị tiền Nhật)', '円', 'これは五百円です。', 'kore wa gohyaku en desu', 'Cái này 500 yên.', 'jpd113-b3'),
    ('店', 'みせ', 'cửa hàng', '店', 'あの店でパンを買います。', 'ano mise de pan o kaimasu', 'Tôi mua bánh mì ở cửa hàng kia.', 'jpd113-b3'),
    ('買う', 'かう', 'mua', '買', 'スーパーで野菜を買います。', 'suupaa de yasai o kaimasu', 'Tôi mua rau ở siêu thị.', 'jpd113-b3'),
    ('食べる', 'たべる', 'ăn', '食', '朝ごはんを食べます。', 'asagohan o tabemasu', 'Tôi ăn sáng.', 'jpd113-b3'),
    ('行く', 'いく', 'đi', '行', '学校へ行きます。', 'gakkou e ikimasu', 'Tôi đi đến trường.', 'jpd113-b3'),
    -- jpd123-b4: Sở thích & Mong muốn
    ('好き', 'すき', 'thích', '好', '音楽が好きです。', 'ongaku ga suki desu', 'Tôi thích âm nhạc.', 'jpd123-b4'),
    ('音楽', 'おんがく', 'âm nhạc', '音樂', '音楽を聞きます。', 'ongaku o kikimasu', 'Tôi nghe nhạc.', 'jpd123-b4'),
    ('欲しい', 'ほしい', 'muốn (đồ vật)', '欲', '新しい車が欲しいです。', 'atarashii kuruma ga hoshii desu', 'Tôi muốn một chiếc xe mới.', 'jpd123-b4'),
    ('旅行', 'りょこう', 'du lịch', '旅行', '日本へ旅行に行きたいです。', 'nihon e ryokou ni ikitai desu', 'Tôi muốn đi du lịch Nhật Bản.', 'jpd123-b4'),
    ('花', 'はな', 'hoa', '花', 'この花はきれいです。', 'kono hana wa kirei desu', 'Bông hoa này đẹp.', 'jpd123-b4'),
    ('映画', 'えいが', 'phim', '映畫', '週末に映画を見ます。', 'shuumatsu ni eiga o mimasu', 'Cuối tuần tôi xem phim.', 'jpd123-b4'),
    -- jpd123-b5: Kế hoạch & Chuyến đi
    ('電車', 'でんしゃ', 'tàu điện', '電車', '電車で学校へ行きます。', 'densha de gakkou e ikimasu', 'Tôi đi học bằng tàu điện.', 'jpd123-b5'),
    ('飛行機', 'ひこうき', 'máy bay', '飛行機', '飛行機で日本へ行きます。', 'hikouki de nihon e ikimasu', 'Tôi đi Nhật bằng máy bay.', 'jpd123-b5'),
    ('明日', 'あした', 'ngày mai', NULL, '明日、映画を見ます。', 'ashita, eiga o mimasu', 'Ngày mai tôi sẽ xem phim.', 'jpd123-b5'),
    ('予定', 'よてい', 'dự định, kế hoạch', '豫定', '週末の予定はありますか。', 'shuumatsu no yotei wa arimasu ka', 'Cuối tuần bạn có kế hoạch gì chưa?', 'jpd123-b5'),
    ('切符', 'きっぷ', 'vé (tàu, xe)', '切符', '京都までの切符を買います。', 'Kyouto made no kippu o kaimasu', 'Tôi mua vé đến Kyoto.', 'jpd123-b5'),
    ('荷物', 'にもつ', 'hành lý', '行李', '荷物が重いです。', 'nimotsu ga omoi desu', 'Hành lý nặng.', 'jpd123-b5'),
    -- jpd123-b6: Trải nghiệm & So sánh
    ('高い', 'たかい', 'cao, đắt', '高', 'このかばんは高いです。', 'kono kaban wa takai desu', 'Cái cặp này đắt.', 'jpd123-b6'),
    ('安い', 'やすい', 'rẻ', '安', 'あの店は安いです。', 'ano mise wa yasui desu', 'Cửa hàng kia rẻ.', 'jpd123-b6'),
    ('大きい', 'おおきい', 'to, lớn', '大', '東京は大きい町です。', 'Toukyou wa ookii machi desu', 'Tokyo là một thành phố lớn.', 'jpd123-b6'),
    ('天気', 'てんき', 'thời tiết', '天氣', '今日はいい天気ですね。', 'kyou wa ii tenki desu ne', 'Hôm nay thời tiết đẹp nhỉ.', 'jpd123-b6'),
    ('町', 'まち', 'thành phố, thị trấn', '町', 'この町は静かです。', 'kono machi wa shizuka desu', 'Thành phố này yên tĩnh.', 'jpd123-b6'),
    ('有名', 'ゆうめい', 'nổi tiếng', '有名', '京都は寺で有名です。', 'Kyouto wa tera de yuumei desu', 'Kyoto nổi tiếng về chùa.', 'jpd123-b6'),
    -- jpd123-b7: Cuộc sống thường nhật & Thể Te
    ('起きる', 'おきる', 'thức dậy', '起', '毎朝六時に起きます。', 'maiasa rokuji ni okimasu', 'Mỗi sáng tôi thức dậy lúc 6 giờ.', 'jpd123-b7'),
    ('寝る', 'ねる', 'ngủ, đi ngủ', '寢', '十一時に寝ます。', 'juuichiji ni nemasu', 'Tôi ngủ lúc 11 giờ.', 'jpd123-b7'),
    ('手伝う', 'てつだう', 'giúp đỡ', '手伝', '母を手伝います。', 'haha o tetsudaimasu', 'Tôi giúp mẹ.', 'jpd123-b7'),
    ('掃除', 'そうじ', 'dọn dẹp, vệ sinh', '掃除', '部屋を掃除してから出かけます。', 'heya o souji shite kara dekakemasu', 'Sau khi dọn phòng tôi mới ra ngoài.', 'jpd123-b7'),
    ('洗濯', 'せんたく', 'giặt giũ', '洗濯', '週末に洗濯します。', 'shuumatsu ni sentaku shimasu', 'Cuối tuần tôi giặt đồ.', 'jpd123-b7'),
    ('料理', 'りょうり', 'nấu ăn, món ăn', '料理', '母は料理が上手です。', 'haha wa ryouri ga jouzu desu', 'Mẹ tôi nấu ăn giỏi.', 'jpd123-b7'),
    ('仕事', 'しごと', 'công việc', '仕事', '八時に仕事を始めます。', 'hachiji ni shigoto o hajimemasu', 'Tôi bắt đầu công việc lúc 8 giờ.', 'jpd123-b7'),
    ('休む', 'やすむ', 'nghỉ, nghỉ ngơi', '休', '今日は仕事を休みます。', 'kyou wa shigoto o yasumimasu', 'Hôm nay tôi nghỉ làm.', 'jpd123-b7')
) AS v(word, reading, meaning, sino_vietnamese, example_sentence, example_reading, example_meaning, slug)
JOIN lessons l ON l.slug = v.slug
ON CONFLICT (word, lesson_id) DO NOTHING;
