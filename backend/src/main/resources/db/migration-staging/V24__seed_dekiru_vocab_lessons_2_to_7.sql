-- =========================================================
-- V24: Seed từ vựng Dekiru Nihongo Sơ cấp Bài 2 đến Bài 7
--
-- Phạm vi: 72 từ vựng cốt lõi đối chiếu giáo trình Dekiru Nihongo & JLPT N5
-- Trạng thái: PENDING_REVIEW (chờ giáo viên tiếng Nhật duyệt, seed vào staging)
-- Idempotent: ON CONFLICT (word, lesson_id) DO NOTHING
-- =========================================================

INSERT INTO vocabulary (word, reading, meaning, sino_vietnamese, example_sentence, example_reading, example_meaning, lesson_id, review_status, needs_human_check, source_ref)
SELECT v.word, v.reading, v.meaning, v.sino_vietnamese, v.example_sentence, v.example_reading, v.example_meaning, l.id, 'PENDING_REVIEW', false, 'Dekiru Nihongo Sơ cấp'
FROM (VALUES
    -- ===== JPD113 — Bài 2: Đồ vật & Địa điểm =====
    ('鉛筆', 'えんぴつ', 'bút chì', 'DUYÊN BÚT', '鉛筆で名前を書きます。', 'enpitsu de namae o kakimasu', 'Tôi viết tên bằng bút chì.', 'jpd113-b2'),
    ('傘', 'かさ', 'cái dù, cái ô', 'TẢN', '雨ですから傘を持って行きます。', 'ame desu kara kasa o motte ikimasu', 'Vì trời mưa nên tôi mang theo ô.', 'jpd113-b2'),
    ('鍵', 'かぎ', 'chìa khóa', 'KIỆN', '部屋の鍵を忘れました。', 'heya no kagi o wasuremashita', 'Tôi đã quên chìa khóa phòng.', 'jpd113-b2'),
    ('時計', 'とけい', 'đồng hồ', 'THỜI KẾ', 'この時計は父の物です。', 'kono tokei wa chichi no mono desu', 'Cái đồng hồ này là của bố tôi.', 'jpd113-b2'),
    ('車', 'くるま', 'ô tô, xe hơi', 'XA', '車を運転します。', 'kuruma o unten shimasu', 'Tôi lái xe ô tô.', 'jpd113-b2'),
    ('部屋', 'へや', 'căn phòng', 'BỘ ỐC', '私の部屋は広いです。', 'watashi no heya wa hiroi desu', 'Phòng của tôi rộng.', 'jpd113-b2'),
    ('椅子', 'いす', 'cái ghế', 'Y TỬ', '椅子に座ってください。', 'isu ni suwatte kudasai', 'Xin hãy ngồi xuống ghế.', 'jpd113-b2'),
    ('窓', 'まど', 'cửa sổ', 'SONG', '窓を開けてください。', 'mado o akete kudasai', 'Xin hãy mở cửa sổ.', 'jpd113-b2'),
    ('ドア', 'ドア', 'cửa ra vào', NULL, 'ドアを閉めてください。', 'doa o shimete kudasai', 'Xin hãy đóng cửa lại.', 'jpd113-b2'),
    ('図書館', 'としょかん', 'thư viện', 'ĐỒ THƯ QUÁN', '図書館で本を借ります。', 'toshokan de hon o karimasu', 'Tôi mượn sách ở thư viện.', 'jpd113-b2'),
    ('銀行', 'ぎんこう', 'ngân hàng', 'NGÂN HÀNH', '銀行へお金を下ろしに行きます。', 'ginkou e okane o oroshi ni ikimasu', 'Tôi đi ngân hàng rút tiền.', 'jpd113-b2'),
    ('病院', 'びょういん', 'bệnh viện', 'BỆNH VIỆN', '具合が悪いので病院へ行きます。', 'guai ga warui node byouin e ikimasu', 'Vì thấy không khỏe nên tôi đi bệnh viện.', 'jpd113-b2'),

    -- ===== JPD113 — Bài 3: Mua sắm & Thời gian =====
    ('朝', 'あさ', 'buổi sáng', 'TRIÊU', '毎朝散歩します。', 'maiasa sanpo shimasu', 'Mỗi sáng tôi đi dạo.', 'jpd113-b3'),
    ('昼', 'ひる', 'buổi trưa', 'TRÚ', '昼ごはんを食べましょう。', 'hirugohan o tabemashou', 'Cùng ăn trưa nhé.', 'jpd113-b3'),
    ('晩', 'ばん', 'buổi tối', 'VÃN', '毎晩日本語を勉強します。', 'maiban nihongo o benkyou shimasu', 'Mỗi tối tôi học tiếng Nhật.', 'jpd113-b3'),
    ('今日', 'きょう', 'hôm nay', 'KIM NHẬT', '今日は月曜日です。', 'kyou wa getsuyoubi desu', 'Hôm nay là thứ Hai.', 'jpd113-b3'),
    ('昨日', 'きのう', 'hôm qua', 'TÁC NHẬT', '昨日は休みでした。', 'kinou wa yasumi deshita', 'Hôm qua là ngày nghỉ.', 'jpd113-b3'),
    ('今', 'いま', 'bây giờ', 'KIM', '今何時ですか。', 'ima nanji desu ka', 'Bây giờ là mấy giờ?', 'jpd113-b3'),
    ('休み', 'やすみ', 'ngày nghỉ, giờ nghỉ', 'HƯU', '日曜日は学校の休みです。', 'nichiyoubi wa gakkou no yasumi desu', 'Chủ nhật là ngày nghỉ học.', 'jpd113-b3'),
    ('働く', 'はたらく', 'làm việc', 'ĐỘNG', '父は会社で働きます。', 'chichi wa kaisha de hatarakimasu', 'Bố tôi làm việc ở công ty.', 'jpd113-b3'),
    ('勉強する', 'べんきょうする', 'học tập', 'MIỄN CƯỜNG', '毎日二時間勉強します。', 'mainichi nijikan benkyou shimasu', 'Mỗi ngày tôi học 2 tiếng.', 'jpd113-b3'),
    ('デパート', 'デパート', 'trung tâm thương mại', NULL, 'デパートで服を買いました。', 'depaato de fuku o kaimashita', 'Tôi đã mua quần áo ở trung tâm thương mại.', 'jpd113-b3'),
    ('スーパー', 'スーパー', 'siêu thị', NULL, 'スーパーへ買い物に行きます。', 'suupaa e kaimono ni ikimasu', 'Tôi đi siêu thị mua đồ.', 'jpd113-b3'),
    ('水', 'みず', 'nước', 'THỦY', '冷たい水を飲みます。', 'tsumetai mizu o nomimasu', 'Tôi uống nước lạnh.', 'jpd113-b3'),

    -- ===== JPD123 — Bài 4: Sở thích & Mong muốn =====
    ('スポーツ', 'スポーツ', 'thể thao', NULL, 'どんなスポーツが好きですか。', 'donna supootsu ga suki desu ka', 'Bạn thích môn thể thao nào?', 'jpd123-b4'),
    ('サッカー', 'サッカー', 'bóng đá', NULL, '友達とサッカーをします。', 'tomodachi to sakkaa o shimasu', 'Tôi chơi bóng đá với bạn.', 'jpd123-b4'),
    ('写真', 'しゃしん', 'bức ảnh', 'CHÂN TẢ', 'きれいな写真を撮りました。', 'kirei na shashin o torimashita', 'Tôi đã chụp một bức ảnh đẹp.', 'jpd123-b4'),
    ('料理', 'りょうり', 'món ăn, nấu ăn', 'LIỆU LÍ', '母の料理はおいしいです。', 'haha no ryouri wa oishii desu', 'Món ăn của mẹ tôi rất ngon.', 'jpd123-b4'),
    ('歌', 'うた', 'bài hát', 'CA', '日本の歌を歌います。', 'nihon no uta o utaimasu', 'Tôi hát bài hát tiếng Nhật.', 'jpd123-b4'),
    ('暇', 'ひま', 'rảnh rỗi', 'HẠ', '暇な時何をしますか。', 'hima na toki nani o shimasu ka', 'Khi rảnh rỗi bạn làm gì?', 'jpd123-b4'),
    ('上手', 'じょうず', 'giỏi, khéo', 'THƯỢNG THỦ', '田中さんは料理が上手です。', 'Tanaka san wa ryouri ga jouzu desu', 'Anh Tanaka nấu ăn giỏi.', 'jpd123-b4'),
    ('下手', 'へた', 'kém, dở', 'HẠ THỦ', '私はテニスが下手です。', 'watashi wa tenisu ga heta desu', 'Tôi chơi quần vợt dở.', 'jpd123-b4'),
    ('面白い', 'おもしろい', 'thú vị, hay', 'DIỆN BẠCH', 'この本はとても面白いです。', 'kono hon wa totemo omoshiroi desu', 'Cuốn sách này rất thú vị.', 'jpd123-b4'),
    ('忙しい', 'いそがしい', 'bận rộn', 'MANG', '今週はとても忙しいです。', 'konshuu wa totemo isogashii desu', 'Tuần này tôi rất bận.', 'jpd123-b4'),
    ('楽しい', 'たのしい', 'vui vẻ', 'LẠC', '旅行はとても楽しかったです。', 'ryokou wa totemo tanoshikatta desu', 'Chuyến du lịch rất vui vẻ.', 'jpd123-b4'),
    ('友達', 'ともだち', 'bạn bè', 'HỮU ĐẠT', '週末友達と遊びます。', 'shuumatsu tomodachi to asobimasu', 'Cuối tuần tôi đi chơi với bạn.', 'jpd123-b4'),

    -- ===== JPD123 — Bài 5: Kế hoạch & Chuyến đi =====
    ('新幹線', 'しんかんせん', 'tàu Shinkansen', 'TÂN CÁN TUYẾN', '新幹線で大阪へ行きます。', 'shinkansen de Oosaka e ikimasu', 'Tôi đi Osaka bằng tàu Shinkansen.', 'jpd123-b5'),
    ('バス', 'バス', 'xe buýt', NULL, 'バスで駅まで行きます。', 'basu de eki made ikimasu', 'Tôi đi xe buýt đến nhà ga.', 'jpd123-b5'),
    ('自転車', 'じてんしゃ', 'xe đạp', 'TỰ CHUYỂN XA', '自転車で学校へ通います。', 'jitensha de gakkou e kayoimasu', 'Tôi đi học bằng xe đạp.', 'jpd123-b5'),
    ('歩いて', 'あるいて', 'đi bộ', 'BỘ', '駅から歩いて五分です。', 'eki kara aruite gofun desu', 'Đi bộ từ ga mất 5 phút.', 'jpd123-b5'),
    ('駅', 'えき', 'nhà ga', 'DỊCH', '駅の前で待ち合わせします。', 'eki no mae de machiawase shimasu', 'Tôi hẹn gặp ở trước nhà ga.', 'jpd123-b5'),
    ('空港', 'くうこう', 'sân bay', 'KHÔNG CẢNG', '空港に友達を迎えに行きます。', 'kuukou ni tomodachi o mukae ni ikimasu', 'Tôi đến sân bay đón bạn.', 'jpd123-b5'),
    ('来週', 'らいしゅう', 'tuần sau', 'LAI CHU', '来週テストがあります。', 'raishuu tesuto ga arimasu', 'Tuần sau có bài kiểm tra.', 'jpd123-b5'),
    ('来月', 'らいげつ', 'tháng sau', 'LAI NGUYỆT', '来月日本へ行きます。', 'raigetsu nihon e ikimasu', 'Tháng sau tôi đi Nhật Bản.', 'jpd123-b5'),
    ('来年', 'らいねん', 'năm sau', 'LAI NIÊN', '来年大学を卒業します。', 'rainen daigaku o sotsugyou shimasu', 'Năm sau tôi tốt nghiệp đại học.', 'jpd123-b5'),
    ('いつ', 'いつ', 'khi nào', NULL, '日本へいつ来ましたか。', 'nihon e itsu kimashita ka', 'Bạn đến Nhật khi nào?', 'jpd123-b5'),
    ('一緒に', 'いっしょに', 'cùng nhau', 'NHẤT TỰ', '一緒にお昼を食べませんか。', 'isshoni ohiru o tabemasen ka', 'Cùng nhau ăn trưa nhé?', 'jpd123-b5'),
    ('どこ', 'どこ', 'ở đâu', NULL, 'どこへ旅行に行きたいですか。', 'doko e ryokou ni ikitai desu ka', 'Bạn muốn đi du lịch ở đâu?', 'jpd123-b5'),

    -- ===== JPD123 — Bài 6: Trải nghiệm & So sánh =====
    ('静か', 'しずか', 'yên tĩnh', 'TĨNH', 'この公園はとても静かです。', 'kono kouen wa totemo shizuka desu', 'Công viên này rất yên tĩnh.', 'jpd123-b6'),
    ('賑やか', 'にぎやか', 'náo nhiệt, nhộn nhịp', NULL, '新宿はいつも賑やかです。', 'Shinjuku wa itsumo nigiyaka desu', 'Shinjuku lúc nào cũng nhộn nhịp.', 'jpd123-b6'),
    ('便利', 'べんり', 'tiện lợi', 'TIỆN LỢI', '駅の近くはとても便利です。', 'eki no chikaku wa totemo benri desu', 'Gần nhà ga rất tiện lợi.', 'jpd123-b6'),
    ('小さい', 'ちいさい', 'nhỏ, bé', 'TIỂU', '小さいかばんを買いました。', 'chiisai kaban o kaimashita', 'Tôi đã mua một chiếc cặp nhỏ.', 'jpd123-b6'),
    ('新しい', 'あたらしい', 'mới', 'TÂN', '新しいパソコンが欲しいです。', 'atarashii pasokon ga hoshii desu', 'Tôi muốn có một máy tính mới.', 'jpd123-b6'),
    ('古い', 'ふるい', 'cũ, cổ', 'CỔ', 'あの寺はとても古いです。', 'ano tera wa totemo furui desu', 'Ngôi chùa kia rất cổ kính.', 'jpd123-b6'),
    ('暑い', 'あつい', 'nóng (thời tiết)', 'THỬ', '夏はとても暑いです。', 'natsu wa totemo atsui desu', 'Mùa hè rất nóng.', 'jpd123-b6'),
    ('寒い', 'さむい', 'lạnh (thời tiết)', 'HÀN', '冬の北海道はとても寒いです。', 'fuyu no Hokkaidou wa totemo samui desu', 'Mùa đông ở Hokkaido rất lạnh.', 'jpd123-b6'),
    ('海', 'うみ', 'biển', 'HẢI', '夏休みに海へ行きました。', 'natsuyasumi ni umi e ikimashita', 'Kỳ nghỉ hè tôi đã đi biển.', 'jpd123-b6'),
    ('山', 'やま', 'núi', 'SƠN', '週末に山に登ります。', 'shuumatsu ni yama ni noborimasu', 'Cuối tuần tôi leo núi.', 'jpd123-b6'),
    ('川', 'かわ', 'sông', 'XUYÊN', 'この川は水がきれいです。', 'kono kawa wa mizu ga kirei desu', 'Dòng sông này nước rất trong.', 'jpd123-b6'),
    ('どちら', 'どちら', 'bên nào, cái nào', NULL, 'コーヒーとお茶とどちらが好きですか。', 'koohii to ocha to dochira ga suki desu ka', 'Cà phê và trà, bạn thích cái nào hơn?', 'jpd123-b6'),

    -- ===== JPD123 — Bài 7: Cuộc sống thường nhật & Thể Te =====
    ('聞く', 'きく', 'nghe, hỏi', 'VĂN', '先生に質問を聞きます。', 'sensei ni shitsumon o kikimasu', 'Tôi hỏi giáo viên câu hỏi.', 'jpd123-b7'),
    ('話す', 'はなす', 'nói chuyện', 'THOẠI', '日本語で話しましょう。', 'nihongo de hanashimashou', 'Hãy nói bằng tiếng Nhật nhé.', 'jpd123-b7'),
    ('読む', 'よむ', 'đọc', 'ĐỘC', '毎朝新聞を読みます。', 'maiasa shinbun o yomimasu', 'Mỗi sáng tôi đọc báo.', 'jpd123-b7'),
    ('開ける', 'あける', 'mở (cửa, sách)', 'KHAI', '窓を開けてもいいですか。', 'mado o aketemo ii desu ka', 'Tôi mở cửa sổ có được không?', 'jpd123-b7'),
    ('閉める', 'しめる', 'đóng (cửa)', 'BẾ', '寒いのでドアを閉めてください。', 'samui node doa o shimete kudasai', 'Vì lạnh nên hãy đóng cửa lại.', 'jpd123-b7'),
    ('使う', 'つかう', 'dùng, sử dụng', 'SỬ', 'このペンを使ってもいいですか。', 'kono pen o tsukattemo ii desu ka', 'Tôi dùng cái bút này được không?', 'jpd123-b7'),
    ('待つ', 'まつ', 'chờ, đợi', 'ĐÃI', 'ここで少し待ってください。', 'koko de sukoshi matte kudasai', 'Xin hãy chờ ở đây một chút.', 'jpd123-b7'),
    ('手伝う', 'てつだう', 'giúp đỡ', 'THỦ TRUYỀN', '荷物を持つのを手伝います。', 'nimotsu o motsu no o tetsudaimasu', 'Tôi giúp bạn xách hành lý.', 'jpd123-b7'),
    ('貸す', 'かす', 'cho mượn', 'THẢI', '友達に傘を貸しました。', 'tomodachi ni kasa o kashimashita', 'Tôi đã cho bạn mượn ô.', 'jpd123-b7'),
    ('借りる', 'かりる', 'mượn', 'TÁ', '図書館で本を借りました。', 'toshokan de hon o karimashita', 'Tôi đã mượn sách ở thư viện.', 'jpd123-b7'),
    ('教える', 'おしえる', 'dạy, chỉ dẫn', 'GIÁO', '日本語を教えてください。', 'nihongo o oshiete kudasai', 'Xin hãy dạy tiếng Nhật cho tôi.', 'jpd123-b7'),
    ('習う', 'ならう', 'học (từ ai đó)', 'TẬP', '先生にピアノを習っています。', 'sensei ni piano o naratte imasu', 'Tôi đang học đàn piano từ cô giáo.', 'jpd123-b7')
) AS v(word, reading, meaning, sino_vietnamese, example_sentence, example_reading, example_meaning, lesson_slug)
JOIN lessons l ON l.slug = v.lesson_slug
ON CONFLICT (word, lesson_id) DO NOTHING;
