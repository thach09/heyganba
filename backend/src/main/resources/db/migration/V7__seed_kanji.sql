-- =========================================================
-- V7: Seed bảng kanji + liên kết kanji_radicals (Phase 3)
--
-- Phạm vi: kanji xuất hiện trong bài JPD113/JPD123 (bám content-mapping), KHÔNG tải toàn bộ Jōyō 2136.
--
-- ⚠️ DRAFT — cách đọc onyomi/kunyomi, nghĩa Hán Việt và mnemonic do người soạn nội dung viết lại
--    (không copy nguyên văn từ tài liệu nào). Cần người biết tiếng Nhật duyệt trước khi coi là chính thức.
--
-- Stroke order animation CHƯA có: KanjiVG là CC BY-SA 3.0 (share-alike + bắt buộc attribution) nên
-- không đưa vào sản phẩm ở bước này — UI cho luyện viết tự do theo mẫu mờ.
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_kanji_character ON kanji (character);

INSERT INTO kanji (character, stroke_count, onyomi, kunyomi, sino_vietnamese, meaning, mnemonic, lesson_id)
SELECT k.character, k.stroke_count, k.onyomi, k.kunyomi, k.sino_vietnamese, k.meaning, k.mnemonic, l.id
FROM (VALUES
    -- jpd113-b1 — Chào hỏi & Làm quen
    ('私', 7, 'シ', 'わたし、わたくし', 'TƯ', 'tôi, riêng tư', 'Cây lúa (禾) thuộc về phần riêng (厶) → cái "tôi" của mỗi người', 'jpd113-b1'),
    ('学', 8, 'ガク', 'まな.ぶ', 'HỌC', 'học', 'Đứa trẻ (子) ngồi dưới mái nhà (宀) chăm chú học bài', 'jpd113-b1'),
    ('生', 5, 'セイ、ショウ', 'い.きる、う.まれる、なま', 'SINH', 'sinh, sống', 'Mầm cây nhú lên khỏi mặt đất (土) → sự sống bắt đầu', 'jpd113-b1'),
    ('先', 6, 'セン', 'さき', 'TIÊN', 'trước, phía trước', 'Đôi chân (儿) bước lên trước những người khác', 'jpd113-b1'),
    ('名', 6, 'メイ、ミョウ', 'な', 'DANH', 'tên', 'Trời tối (夕) nên phải mở miệng (口) gọi tên nhau', 'jpd113-b1'),
    ('国', 8, 'コク', 'くに', 'QUỐC', 'đất nước', 'Viên ngọc (玉) được bao quanh bởi thành lũy (囗) → lãnh thổ', 'jpd113-b1'),
    ('日', 4, 'ニチ、ジツ', 'ひ、び', 'NHẬT', 'mặt trời, ngày', 'Hình vẽ mặt trời tròn có nét ngang giữa', 'jpd113-b1'),
    ('本', 5, 'ホン', 'もと', 'BẢN', 'sách, gốc rễ', 'Cái cây (木) có vạch chỉ phần gốc → gốc, nguồn, sách là gốc kiến thức', 'jpd113-b1'),
    -- jpd113-b2 — Đồ vật & Địa điểm
    ('上', 3, 'ジョウ', 'うえ、あ.げる、のぼ.る', 'THƯỢNG', 'phía trên', 'Vạch chỉ điểm nằm phía trên đường ngang', 'jpd113-b2'),
    ('下', 3, 'カ、ゲ', 'した、さ.げる、くだ.さる', 'HẠ', 'phía dưới', 'Vạch chỉ điểm nằm phía dưới đường ngang', 'jpd113-b2'),
    ('中', 4, 'チュウ', 'なか', 'TRUNG', 'trong, giữa', 'Cây gậy (丨) xuyên thẳng qua giữa cái hộp (口)', 'jpd113-b2'),
    ('食', 9, 'ショク、ジキ', 'た.べる、く.う', 'THỰC', 'ăn, đồ ăn', 'Người (人) ngồi dưới mái che (亼) để ăn cơm', 'jpd113-b2'),
    ('入', 2, 'ニュウ', 'はい.る、い.れる', 'NHẬP', 'đi vào', 'Mũi dùi cắm sâu vào bên trong', 'jpd113-b2'),
    ('出', 5, 'シュツ', 'で.る、だ.す', 'XUẤT', 'đi ra', 'Mầm cây vươn ra khỏi miệng hộp (凵) và ngọn núi (山)', 'jpd113-b2'),
    ('米', 6, 'ベイ、マイ', 'こめ', 'MỄ', 'gạo', 'Hạt gạo nở ra theo bốn hướng', 'jpd113-b2'),
    ('犬', 4, 'ケン', 'いぬ', 'KHUYỂN', 'con chó', 'Hình con chó đứng có đuôi vểnh', 'jpd113-b2'),
    ('白', 5, 'ハク、ビャク', 'しろ、しろ.い', 'BẠCH', 'màu trắng', 'Tia nắng (丿) hắt ra từ mặt trời → trắng sáng', 'jpd113-b2'),
    -- jpd113-b3 — Mua sắm & Thời gian
    ('時', 10, 'ジ', 'とき', 'THỜI', 'giờ, thời gian', 'Mặt trời (日) đi qua ngôi chùa (寺) → dòng thời gian trôi', 'jpd113-b3'),
    ('間', 12, 'カン、ケン', 'あいだ、ま', 'GIAN', 'khoảng, ở giữa', 'Mặt trời (日) chiếu vào khe cổng (門) → khoảng ở giữa', 'jpd113-b3'),
    ('円', 4, 'エン', 'まる.い', 'VIÊN', 'yên (tiền Nhật), hình tròn', 'Đồng tiền tròn của Nhật Bản', 'jpd113-b3'),
    ('店', 8, 'テン', 'みせ', 'ĐIẾM', 'cửa hàng', 'Dưới mái nhà (广) có người chiếm chỗ (占) bày hàng để bán', 'jpd113-b3'),
    ('買', 12, 'バイ', 'か.う', 'MÃI', 'mua', 'Cái lưới (罒) hứng vỏ sò (貝) làm tiền để đi mua hàng', 'jpd113-b3'),
    ('行', 6, 'コウ、ギョウ', 'い.く、ゆ.く、おこな.う', 'HÀNH', 'đi, thực hiện', 'Ngã tư đường, người đi phải chọn hướng để bước', 'jpd113-b3'),
    ('金', 8, 'キン、コン', 'かね', 'KIM', 'vàng, tiền, kim loại', 'Hạt quặng (土) nằm dưới mái (亼) là kim loại quý', 'jpd113-b3'),
    ('何', 7, 'カ', 'なに、なん', 'HÀ', 'cái gì', 'Người (亻) có thể (可) làm được cái gì?', 'jpd113-b3'),
    -- jpd123-b4 — Sở thích & Mong muốn
    ('好', 6, 'コウ', 'この.む、す.き', 'HẢO', 'thích, tốt', 'Người phụ nữ (女) bế đứa con (子) → điều mình thích nhất', 'jpd123-b4'),
    ('音', 9, 'オン、イン', 'おと、ね', 'ÂM', 'âm thanh', 'Chữ đứng (立) cạnh mặt trời (日) → âm thanh vang lên', 'jpd123-b4'),
    ('楽', 13, 'ガク、ラク', 'たの.しい', 'LẠC, NHẠC', 'vui vẻ, âm nhạc', 'Cây (木) treo hai dây đàn trắng (白) → chơi nhạc cho vui', 'jpd123-b4'),
    ('花', 7, 'カ', 'はな', 'HOA', 'hoa', 'Cỏ (艹) biến đổi (化) mà nở thành hoa', 'jpd123-b4'),
    ('映', 9, 'エイ', 'うつ.る、は.える', 'ÁNH', 'chiếu, phản chiếu (映画: phim)', 'Mặt trời (日) chiếu thẳng vào trung tâm (央)', 'jpd123-b4'),
    ('欲', 11, 'ヨク', 'ほ.しい', 'DỤC', 'muốn, tham muốn', 'Thung lũng (谷) trống khiến con người thấy thiếu (欠) mà thèm muốn', 'jpd123-b4'),
    -- jpd123-b5 — Kế hoạch & Chuyến đi
    ('電', 13, 'デン', '', 'ĐIỆN', 'điện', 'Cơn mưa (雨) sinh ra tia chớp → điện', 'jpd123-b5'),
    ('車', 7, 'シャ', 'くるま', 'XA', 'xe', 'Hình cỗ xe nhìn từ trên xuống, có bánh hai bên', 'jpd123-b5'),
    ('飛', 9, 'ヒ', 'と.ぶ、と.ばす', 'PHI', 'bay', 'Hình con chim đang vỗ cánh bay lên', 'jpd123-b5'),
    ('機', 16, 'キ', 'はた', 'CƠ', 'máy móc (飛行機: máy bay)', 'Cái cây (木) cùng mấy sợi tơ se lại (幾) → máy dệt', 'jpd123-b5'),
    ('明', 8, 'メイ、ミョウ', 'あ.ける、あか.るい、あした', 'MINH', 'sáng, ngày mai', 'Mặt trời (日) và mặt trăng (月) cùng chiếu → sáng tỏ', 'jpd123-b5'),
    ('予', 4, 'ヨ', 'あらかじ.め', 'DỰ', 'trước, dự định', 'Nét móc (亅) chuẩn bị sẵn từ trước khi bắt đầu', 'jpd123-b5'),
    ('定', 8, 'テイ、ジョウ', 'さだ.める、さだ.まる', 'ĐỊNH', 'định, quyết định', 'Dưới mái nhà (宀) mọi thứ được sắp đặt chắc chắn', 'jpd123-b5'),
    ('切', 4, 'セツ、サイ', 'き.る、き.れる', 'THIẾT', 'cắt (切符: vé)', 'Bảy (七) nhát dao (刀) cắt đứt mọi thứ', 'jpd123-b5'),
    ('荷', 10, 'カ', 'に', 'HÀ', 'hành lý, hàng hóa', 'Cỏ (艹) mọc trên người (何) đang gánh hàng nặng', 'jpd123-b5'),
    ('物', 8, 'ブツ、モツ', 'もの', 'VẬT', 'đồ vật', 'Con bò (牛) bị đánh dấu (勿) để đếm đồ vật', 'jpd123-b5'),
    -- jpd123-b6 — Trải nghiệm & So sánh
    ('高', 10, 'コウ', 'たか.い、たか', 'CAO', 'cao, đắt', 'Cái tháp nhiều tầng, trên cùng có ô cửa (口) → cao', 'jpd123-b6'),
    ('安', 6, 'アン', 'やす.い', 'AN', 'rẻ, yên ổn', 'Người phụ nữ (女) ở dưới mái nhà (宀) thấy yên tâm', 'jpd123-b6'),
    ('大', 3, 'ダイ、タイ', 'おお.きい', 'ĐẠI', 'to, lớn', 'Người dang rộng hai tay hai chân → to lớn', 'jpd123-b6'),
    ('天', 4, 'テン', 'あめ、あま', 'THIÊN', 'trời', 'Vạch nằm trên người (大) là bầu trời', 'jpd123-b6'),
    ('気', 6, 'キ、ケ', 'いき、け', 'KHÍ', 'khí, không khí, tinh thần', 'Hơi nước (气) cuộn lên mang theo năng lượng', 'jpd123-b6'),
    ('町', 7, 'チョウ', 'まち', 'ĐINH', 'phố, thị trấn', 'Ruộng (田) nằm cạnh con đường (丁) thành khu phố', 'jpd123-b6'),
    ('有', 6, 'ユウ、ウ', 'あ.る', 'HỮU', 'có, sở hữu', 'Bàn tay cầm miếng thịt (月) → đang có của ăn', 'jpd123-b6'),
    ('京', 8, 'キョウ、ケイ', '', 'KINH', 'kinh đô, thủ đô', 'Ngôi nhà cao có cổng lớn và chân đế → nơi vua ở', 'jpd123-b6'),
    ('都', 11, 'ト、ツ', 'みやこ', 'ĐÔ', 'đô thị, thủ đô', 'Thành lũy (阝) tập trung dân cư thành đô thị', 'jpd123-b6'),
    -- jpd123-b7 — Cuộc sống thường nhật & động từ thể て
    ('起', 10, 'キ', 'お.きる、お.こる', 'KHỞI', 'thức dậy, xảy ra', 'Người (走) rời khỏi tư thế co lại (己) → thức dậy', 'jpd123-b7'),
    ('寝', 13, 'シン', 'ね.る、ね.かす', 'TẨM', 'ngủ', 'Dưới mái nhà (宀) người ta nằm xuống để ngủ', 'jpd123-b7'),
    ('手', 4, 'シュ', 'て', 'THỦ', 'tay', 'Hình bàn tay xoè với các ngón', 'jpd123-b7'),
    ('伝', 6, 'デン', 'つた.える、つた.わる', 'TRUYỀN', 'truyền đạt, giúp (手伝う)', 'Người (亻) đứng trên đường (云) chuyển lời cho nhau', 'jpd123-b7'),
    ('掃', 11, 'ソウ', 'は.く', 'TẢO', 'quét, dọn', 'Tay (扌) cầm chổi (帚) quét nhà', 'jpd123-b7'),
    ('除', 10, 'ジョ、ジ', 'のぞ.く', 'TRỪ', 'loại bỏ, trừ đi', 'Dùng bức thành (阝) để gạt bỏ phần dư thừa', 'jpd123-b7'),
    ('洗', 9, 'セン', 'あら.う', 'TẨY', 'rửa', 'Nước (氵) rửa sạch trước (先) khi ăn', 'jpd123-b7'),
    ('濯', 17, 'タク', 'すす.ぐ', 'TRẠC', 'giặt', 'Nước (氵) và chim (隹) đập vào nhau → giặt sạch', 'jpd123-b7'),
    ('料', 10, 'リョウ', '', 'LIỆU', 'nguyên liệu, tiền phí (料理: nấu ăn)', 'Cái đấu (斗) đong gạo (米) → đong nguyên liệu', 'jpd123-b7'),
    ('理', 11, 'リ', '', 'LÝ', 'lý lẽ, nguyên lý (料理)', 'Viên ngọc (玉) được mài trong làng (里) → lý lẽ sáng rõ', 'jpd123-b7'),
    ('仕', 5, 'シ', 'つか.える', 'SĨ', 'làm việc (仕事)', 'Người (亻) phục vụ kẻ sĩ (士) là đi làm việc', 'jpd123-b7'),
    ('事', 8, 'ジ', 'こと', 'SỰ', 'việc, sự việc', 'Tay cầm bút ghi lại công việc vào sổ', 'jpd123-b7'),
    ('休', 6, 'キュウ', 'やす.む、やす.み', 'HƯU', 'nghỉ', 'Người (亻) tựa vào gốc cây (木) để nghỉ', 'jpd123-b7')
) AS k(character, stroke_count, onyomi, kunyomi, sino_vietnamese, meaning, mnemonic, slug)
JOIN lessons l ON l.slug = k.slug
ON CONFLICT (character) DO NOTHING;

-- =========================================================
-- Liên kết kanji ↔ bộ thủ (tra cứu theo bộ thủ ở UI)
-- =========================================================
INSERT INTO kanji_radicals (kanji_id, radical_id)
SELECT k.id, r.id
FROM (VALUES
    ('私', '禾'), ('学', '子'), ('学', '宀'), ('生', '生'), ('先', '儿'), ('先', '土'),
    ('名', '口'), ('名', '夕'), ('国', '囗'), ('国', '玉'), ('日', '日'), ('本', '木'), ('本', '一'),
    ('上', '一'), ('下', '一'), ('中', '丨'), ('中', '口'), ('食', '食'), ('入', '入'),
    ('出', '凵'), ('出', '山'), ('米', '米'), ('犬', '犬'), ('白', '白'),
    ('時', '日'), ('時', '寸'), ('間', '門'), ('間', '日'), ('円', '冂'), ('店', '广'), ('店', '口'),
    ('買', '貝'), ('買', '目'), ('行', '行'), ('金', '金'), ('金', '土'), ('何', '人'), ('何', '口'),
    ('好', '女'), ('好', '子'), ('音', '音'), ('音', '立'), ('楽', '木'), ('楽', '白'),
    ('花', '艹'), ('映', '日'), ('映', '大'), ('欲', '欠'), ('欲', '谷'),
    ('電', '雨'), ('電', '田'), ('車', '車'), ('飛', '飛'), ('機', '木'), ('明', '日'), ('明', '月'),
    ('予', '亅'), ('定', '宀'), ('定', '一'), ('切', '刀'), ('荷', '艹'), ('荷', '人'),
    ('物', '牛'), ('物', '力'),
    ('高', '高'), ('高', '口'), ('安', '宀'), ('安', '女'), ('大', '大'), ('天', '大'), ('天', '一'),
    ('気', '气'), ('町', '田'), ('町', '亅'), ('有', '月'), ('京', '亠'), ('京', '小'),
    ('都', '阝'), ('都', '日'),
    ('起', '走'), ('起', '己'), ('寝', '宀'), ('手', '手'), ('伝', '人'), ('伝', '一'),
    ('掃', '手'), ('掃', '巾'), ('除', '阝'), ('除', '人'), ('洗', '水'), ('洗', '儿'),
    ('濯', '水'), ('料', '斗'), ('料', '米'), ('理', '玉'), ('仕', '人'), ('仕', '士'),
    ('事', '亅'), ('事', '口'), ('休', '人'), ('休', '木')
) AS m(kanji, radical)
JOIN kanji k ON k.character = m.kanji
JOIN radicals r ON r.radical = m.radical
ON CONFLICT (kanji_id, radical_id) DO NOTHING;
