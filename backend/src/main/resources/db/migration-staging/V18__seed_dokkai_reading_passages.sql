-- =========================================================
-- V18: Seed Dokkai Reading Passages (JPD113 / JPD123)
--
-- Lưu ý:
--  - Toàn bộ nội dung là DRAFT bám sát giáo trình Dekiru Nihongo (JPD113 bài 1-3, JPD123 bài 4-7).
--  - Trạng thái review_status = 'PENDING_REVIEW' (chờ giáo viên tiếng Nhật thẩm định, KHÔNG tự promote).
--  - Tuyệt đối không dùng dấu chấm phẩy (;) bên trong chuỗi SQL.
-- =========================================================

INSERT INTO reading_passages (lesson_id, title, passage_text, translation_text, vocabulary_notes, questions_json, review_status)
SELECT l.id, p.title, p.passage_text, p.translation_text, p.vocabulary_notes, p.questions_json, 'PENDING_REVIEW'
FROM (VALUES
    -- ===== JPD113 — Bài 1: Chào hỏi & Làm quen =====
    (
        'jpd113-b1',
        'わたし の じこしょうかい (Giới thiệu bản thân)',
        'はじめまして。わたし の なまえ は グエン・ヴァン・ナム です。ベトナム から きました。ことし は はたち です。わたし は FPTだいがく の がくせい です。せんこう は IT です。どうぞ よろしく おねがいします。',
        'Xin chào lần đầu gặp mặt. Tên tôi là Nguyen Van Nam. Tôi đến từ Việt Nam. Năm nay tôi 20 tuổi. Tôi là sinh viên Đại học FPT. Chuyên ngành của tôi là CNTT. Rất mong nhận được sự giúp đỡ.',
        'はじめまして (chào lần đầu gặp), なまえ (tên), はたち (20 tuổi), だいがく (đại học), せんこう (chuyên ngành)',
        '[{"question":"ナムさん の せんこう は 何ですか。","options":["IT","にほんご","けいざい","デザイン"],"correctAnswer":"IT","explanation":"Trong đoạn văn có câu: せんこう は IT です (Chuyên ngành là CNTT)."},{"question":"ナムさん は なにじん ですか。","options":["ベトナムじん","にほんじん","アメリカじん","かんこくじん"],"correctAnswer":"ベトナムじん","explanation":"Đoạn văn ghi: ベトナム から きました (Đến từ Việt Nam)."},{"question":"ナムさん は なんさい ですか。","options":["はたち (20さい)","じゅうきゅうさい","にじゅういっさい","にじゅうごさい"],"correctAnswer":"はたち (20さい)","explanation":"Đoạn văn ghi: ことし は はたち です (Năm nay 20 tuổi)."}]'
    ),

    -- ===== JPD113 — Bài 2: Đồ vật & Địa điểm =====
    (
        'jpd113-b2',
        'わたし の へや と がっこう (Phòng của tôi và trường học)',
        'ここ は わたし の へや です。へや に つくえ と いす が あります。つくえ の うえ に パソコン と ほん が あります。これ は にほんご の じしょ です。がっこう は えき の まえ に あります。きょうしつ は さんがい です。',
        'Đây là phòng của tôi. Trong phòng có bàn và ghế. Trên bàn có máy tính và sách. Đây là từ điển tiếng Nhật. Trường học nằm ở trước nhà ga. Phòng học ở tầng 3.',
        'つくえ (bàn), いす (ghế), うえ (phía trên), パソコン (máy tính cá nhân), じしょ (từ điển), さんがい (tầng 3)',
        '[{"question":"つくえ の うえ に 何 が ありますか。","options":["パソコン と ほん","テレビ と でんわ","かばん と さいふ","めがね と ペン"],"correctAnswer":"パソコン と ほん","explanation":"Trong bài có câu: つくえ の うえ に パソコン と ほん が あります."},{"question":"きょうしつ は なんがい ですか。","options":["さんがい","いっかい","にかい","よんかい"],"correctAnswer":"さんがい","explanation":"Trong bài có câu: きょうしつ は さんがい です (Phòng học ở tầng 3)."},{"question":"がっこう は どこ に ありますか。","options":["えき の まえ","えき の となり","ぎんこう の うしろ","こうえん の なか"],"correctAnswer":"えき の まえ","explanation":"Trong bài có câu: がっこう は えき の まえ に あります (Trường học ở trước nhà ga)."}]'
    ),

    -- ===== JPD113 — Bài 3: Mua sắm & Thời gian =====
    (
        'jpd113-b3',
        'とうきょう の いちにち (Một ngày ở Tokyo)',
        'わたし は まいあさ ろくじはん に おきます。あさごはん を たべて、ななじ に うち を でます。ちかてつ で とうきょうえき へ いきます。ごご は しんじゅく の デパート で かいもの を します。この シャツ は さんぜんえん でした。やすかったです。',
        'Mỗi sáng tôi thức dậy lúc 6 giờ rưỡi. Tôi ăn sáng rồi rời nhà lúc 7 giờ. Tôi đi đến ga Tokyo bằng tàu điện ngầm. Buổi chiều tôi mua sắm ở trung tâm thương mại Shinjuku. Chiếc áo sơ mi này giá 3000 yên. Nó khá rẻ.',
        'まいあさ (mỗi sáng), ろくじはん (6h30), ちかてつ (tàu điện ngầm), デパート (trung tâm thương mại), さんぜんえん (3000 yên)',
        '[{"question":"この 人 は まいあさ なんじ に おきますか。","options":["ろくじはん","ろくじ","ななじ","しちじはん"],"correctAnswer":"ろくじはん","explanation":"Đoạn văn ghi: まいあさ ろくじはん に おきます (Mỗi sáng dậy lúc 6h30)."},{"question":"なん で とうきょうえき へ いきますか。","options":["ちかてつ","バス","くるま","じてんしゃ"],"correctAnswer":"ちかてつ","explanation":"Trong bài có câu: ちかてつ で とうきょうえき へ いきます (Đi ga Tokyo bằng tàu điện ngầm)."},{"question":"シャツ は いくら でしたか。","options":["さんぜんえん","にせんえん","よんせんえん","ごせんえん"],"correctAnswer":"さんぜんえん","explanation":"Đoạn văn nêu: この シャツ は さんぜんえん でした (Áo giá 3000 yên)."}]'
    ),

    -- ===== JPD123 — Bài 4: Sở thích & Mong muốn =====
    (
        'jpd123-b4',
        'わたし の しゅみ と ゆめ (Sở thích và ước mơ)',
        'わたし の しゅみ は りょうり を つくる こと と おんがく を きく こと です。にほんりょうり の なか で すし が いちばん すき です。わたし は にほん へ いきたい です。そして ほっかいどう で スキー を したい です。',
        'Sở thích của tôi là nấu ăn và nghe nhạc. Trong các món ăn Nhật, tôi thích nhất là sushi. Tôi muốn đi Nhật Bản. Và tôi muốn đi trượt tuyết ở Hokkaido.',
        'しゅみ (sở thích), りょうり (món ăn/nấu ăn), すき (thích), いきたい (muốn đi), スキー を したい (muốn trượt tuyết)',
        '[{"question":"この 人 の しゅみ は 何ですか。","options":["りょうり と おんがく","スポーツ と どくしょ","えいが と りょこう","ゲーム と アニメ"],"correctAnswer":"りょうり と おんがく","explanation":"Đoạn văn viết: わたし の しゅみ は りょうり を つくる こと と おんがく を きく こと です."},{"question":"にほんりょうり の なか で 何 が いちばん すき ですか。","options":["すし","ラーメン","てんぷら","うどん"],"correctAnswer":"すし","explanation":"Đoạn văn ghi rõ: にほんりょうり の なか で すし が いちばん すき です."},{"question":"ほっかいどう で 何 を したい ですか。","options":["スキー を したい","おんせん に はいりたい","さくら を みたい","かいもの を したい"],"correctAnswer":"スキー を したい","explanation":"Đoạn văn ghi: ほっかいどう で スキー を したい です."}]'
    ),

    -- ===== JPD123 — Bài 5: Kế hoạch & Chuyến đi =====
    (
        'jpd123-b5',
        'きょうと りょこう の よてい (Kế hoạch đi Kyoto)',
        'らいしゅう の どようび に ともだち と きょうと へ いきます。とうきょう から きょうと まで しんかんせん で にじかんはん かかります。きょうと で ゆうめい な きんかくじ を みて、おいしい まっちゃアイス を たべます。しゃしん を たくさん とりたい です。',
        'Thứ bảy tuần sau tôi sẽ đi Kyoto cùng bạn bè. Từ Tokyo đến Kyoto mất 2 tiếng rưỡi bằng shinkansen. Ở Kyoto chúng tôi sẽ ngắm chùa Vàng Kinkakuji nổi tiếng và ăn kem trà xanh ngon. Tôi muốn chụp thật nhiều ảnh.',
        'よてい (kế hoạch), しんかんせん (tàu shinkansen), にじかんはん (2 tiếng rưỡi), きんかくじ (chùa Kinkakuji), まっちゃ (trà xanh matcha)',
        '[{"question":"だれ と きょうと へ いきますか。","options":["ともだち","かぞく","ひとり で","せんせい"],"correctAnswer":"ともだち","explanation":"Đoạn văn ghi: ともだち と きょうと へ いきます (Đi cùng bạn bè)."},{"question":"とうきょう から きょうと まで どのくらい かかりますか。","options":["にじかんはん","いちじかん","さんじかん","よじかん"],"correctAnswer":"にじかんはん","explanation":"Trong bài ghi: しんかんせん で にじかんはん かかります (Mất 2 tiếng rưỡi)."},{"question":"きょうと で どこ を みますか。","options":["きんかくじ","ふじさん","とうきょうタワー","おおさかじょう"],"correctAnswer":"きんかくじ","explanation":"Trong bài nêu: ゆうめい な きんかくじ を みて (Ngắm chùa Vàng Kinkakuji)."}]'
    ),

    -- ===== JPD123 — Bài 6: Trải nghiệm & So sánh =====
    (
        'jpd123-b6',
        'にほん の しき と きせつ (Bốn mùa và các mùa ở Nhật Bản)',
        'にほん に は はる、なつ、あき、ふゆ の よっつ の きせつ が あります。はる は さくら が とても きれい です。なつ は あつい です が、おまつり が たのしい です。わたし は あき が いちばん すき です。あき は すずしくて もみじ が うつくしい です。ふゆ は ゆき が ふります。',
        'Ở Nhật Bản có 4 mùa xuân, hạ, thu, đông. Mùa xuân hoa anh đào rất đẹp. Mùa hè nóng nhưng lễ hội rất vui. Tôi thích nhất là mùa thu. Mùa thu mát mẻ và lá đỏ tuyệt đẹp. Mùa đông thì có tuyết rơi.',
        'しき (bốn mùa), きせつ (mùa), さくら (hoa anh đào), おまつり (lễ hội), すずしい (mát mẻ), もみじ (lá đỏ)',
        '[{"question":"この 人 は どの きせつ が いちばん すき ですか。","options":["あき","はる","なつ","ふゆ"],"correctAnswer":"あき","explanation":"Đoạn văn khẳng định: わたし は あき が いちばん すき です (Tôi thích mùa thu nhất)."},{"question":"はる は 何 が きれい ですか。","options":["さくら","もみじ","ゆき","うみ"],"correctAnswer":"さくら","explanation":"Đoạn văn ghi: はる は さくら が とても きれい です (Mùa xuân hoa anh đào rất đẹp)."},{"question":"あき の てんき は どう ですか。","options":["すずしい","あつい","さむい","あめ が おおい"],"correctAnswer":"すずしい","explanation":"Đoạn văn có câu: あき は すずしくて もみじ が うつくしい です."}]'
    ),

    -- ===== JPD123 — Bài 7: Cuộc sống thường nhật & Thể Te =====
    (
        'jpd123-b7',
        'いそがしい しゅうまつ (Cuối tuần bận rộn)',
        'せんしゅう の にちようび は とても いそがしかったです。あさ はちじ に おきて、へや を そうじして、せんたく を しました。それから スーパー へ いって、しょくりょうひん を かいました。ごご は としょかん で にほんご を べんきょうしました。よる は ともだち と レストラン で ごはん を たべて、たくさん はなしました。',
        'Chủ nhật tuần trước rất bận rộn. Buổi sáng tôi thức dậy lúc 8 giờ, dọn dẹp phòng rồi giặt giũ. Sau đó đi siêu thị và mua thực phẩm. Buổi chiều học tiếng Nhật ở thư viện. Buổi tối ăn cơm cùng bạn ở nhà hàng và nói chuyện rất nhiều.',
        'いそがしい (bận rộn), そうじして (dọn dẹp rồi), せんたく (giặt giũ), しょくりょうひん (thực phẩm), としょかん (thư viện)',
        '[{"question":"あさ なんじ に おきましたか。","options":["はちじ","ななじ","ろくじ","くじ"],"correctAnswer":"はちじ","explanation":"Đoạn văn ghi: あさ はちじ に おきて (Sáng thức dậy lúc 8 giờ)."},{"question":"ごご どこ で べんきょうしましたか。","options":["としょかん","きっさてん","うち","がっこう"],"correctAnswer":"としょかん","explanation":"Đoạn văn ghi: ごご は としょかん で にほんご を べんきょうしました (Buổi chiều học ở thư viện)."},{"question":"よる だれ と ごはん を たべましたか。","options":["ともだち","かぞく","せんせい","ひとり で"],"correctAnswer":"ともだち","explanation":"Đoạn văn ghi: よる は ともだち と レストラン で ごはん を たべて (Buổi tối ăn cơm cùng bạn)."}]'
    )
) AS p(lesson_slug, title, passage_text, translation_text, vocabulary_notes, questions_json)
JOIN lessons l ON l.slug = p.lesson_slug
ON CONFLICT DO NOTHING;
