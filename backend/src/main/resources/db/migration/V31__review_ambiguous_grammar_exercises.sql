-- Corrections checked against Japan Foundation Marugoto grammar.
-- Sources and review scope: docs/Internal/audit-2026-10-06.md

UPDATE grammar_exercises SET question_text = 'かばん は どこですか。 → かばん は へや __ あります。', options_json = '["に","を","と","で"]', correct_answer = 'に', explanation = 'Có thể diễn đạt bằng に あります thay cho の 中 です: へや に あります.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'かばん は どこですか。 → かばん は へや __ あります。';

UPDATE grammar_exercises SET question_text = 'つくえ の 上 に 本 __ あります。', options_json = '["が","を","で","に"]', correct_answer = 'が', explanation = 'Câu tồn tại: <nơi> に <vật> が あります. Chủ thể tồn tại đánh dấu bằng が (không dùng は).', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'つくえ の 上 に 本 __ あります。';

UPDATE grammar_exercises SET question_text = 'トイレ __ どこですか。', options_json = '["は","を","に","へ"]', correct_answer = 'は', explanation = 'Mẫu hỏi vị trí: N は どこですか.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'トイレ __ どこですか。';

UPDATE grammar_exercises SET question_text = 'コーヒー __ ください。', options_json = '["を","が","に","へ"]', correct_answer = 'を', explanation = 'を đánh dấu tân ngữ (vật được yêu cầu). Chú ý: を làm trợ từ đọc là "o", không đọc "wo".', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'コーヒー __ ください。';

UPDATE grammar_exercises SET question_text = 'A: なに __ ほしいですか。', options_json = '["が","で","と","に"]', correct_answer = 'が', explanation = 'Câu hỏi cũng dùng が: なに が ほしいですか.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'A: なに __ ほしいですか。';

UPDATE grammar_exercises SET question_text = 'あたらしい 車 __ ほしいです。', options_json = '["が","に","へ","で"]', correct_answer = 'が', explanation = 'Đối tượng mong muốn đánh dấu bằng が: N が ほしいです.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'あたらしい 車 __ ほしいです。';

UPDATE grammar_exercises SET question_text = 'サッカー __ スポーツ です。', options_json = '["は","を","と","に"]', correct_answer = 'は', explanation = 'サッカー là chủ đề của câu nên dùng は (khi làm trợ từ は đọc là “wa”, không đọc “ha”).', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'サッカー __ スポーツ です。';

UPDATE grammar_exercises SET question_text = 'きょう は 日曜日 です。 あした __ 月曜日 です。', options_json = '["は","に","へ","を"]', correct_answer = 'は', explanation = 'Mỗi câu có chủ đề riêng và đều đánh dấu bằng は.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'きょう は 日曜日 です。 あした __ 月曜日 です。';

UPDATE grammar_exercises SET question_text = '(chọn trợ từ mang nghĩa cũng) わたし の 父 は せんせい です。 母 __ せんせい です。', options_json = '["も","の","を","に"]', correct_answer = 'も', explanation = 'Cả bố và mẹ đều là giáo viên, も biểu thị cũng.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'わたし の 父 は せんせい です。 母 __ せんせい です。';

UPDATE grammar_exercises SET question_text = 'A: わたし は がくせい です。 B: (hỏi Tanaka có cũng là sinh viên không) たなかさん __ がくせいですか。', options_json = '["も","を","に","へ"]', correct_answer = 'も', explanation = 'Ngữ cảnh yêu cầu nghĩa cũng, dùng も.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'A: わたし は がくせい です。 B: たなかさん __ がくせいですか。';

UPDATE grammar_exercises SET question_text = '(chọn trợ từ mang nghĩa cũng) こちら は コーヒー です。 そちら __ コーヒー です。', options_json = '["も","で","を","に"]', correct_answer = 'も', explanation = 'も biểu thị bên đó cũng là cà phê.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'こちら は コーヒー です。 そちら __ コーヒー です。';

UPDATE grammar_exercises SET question_text = '(chỉ chiếc cặp ở ngay cạnh người nói) __ かばん は わたし の です。', options_json = '["この","これ","ここ","こちら"]', correct_answer = 'この', explanation = 'Vật gần người nói, đứng trước danh từ dùng この.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = '__ かばん は わたし の です。';

UPDATE grammar_exercises SET question_text = 'A: (chỉ quyển từ điển B đang cầm) それは 何ですか。 B: __ は じしょ です。', options_json = '["これ","それ","あれ","どれ"]', correct_answer = 'これ', explanation = 'Vật B đang cầm ở gần B, B dùng これ.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'A: それは 何ですか。 B: __ は じしょ です。';

UPDATE grammar_exercises SET question_text = 'へや に テレビ __ あります。', options_json = '["が","を","で","に"]', correct_answer = 'が', explanation = 'Câu tồn tại: <nơi> に <vật> が あります — chủ thể tồn tại luôn đánh dấu bằng が.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'へや に テレビ __ あります。';

UPDATE grammar_exercises SET question_text = 'にわ に いぬ __ います。', options_json = '["が","を","へ","に"]', correct_answer = 'が', explanation = 'Người / động vật dùng います + が: にわ に いぬ が います.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'にわ に いぬ __ います。';

UPDATE grammar_exercises SET question_text = 'A: へや に なに __ ありますか。 B: つくえ が あります。', options_json = '["が","を","も","に"]', correct_answer = 'が', explanation = 'Câu hỏi tồn tại cũng dùng が: なに が ありますか (không dùng は).', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'A: へや に なに __ ありますか。 B: つくえ が あります。';

UPDATE grammar_exercises SET question_text = 'A: いらっしゃいませ。 B: その りんご __ ください。', options_json = '["を","で","と","に"]', correct_answer = 'を', explanation = 'Mua vật cụ thể: その N を ください.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'A: いらっしゃいませ。 B: その りんご __ ください。';

UPDATE grammar_exercises SET question_text = 'こども の とき、ロボット __ ほしかったです。', options_json = '["が","に","へ","で"]', correct_answer = 'が', explanation = 'Quá khứ của ほしい là ほしかったです, không dùng ほしいでした.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'こども の とき、ロボット __ ほしい でした。';

UPDATE grammar_exercises SET question_text = 'A: (chỉ sách B đang cầm) その ほん は おもしろいですか。 B: はい、__ ほん は おもしろいです。', options_json = '["この","その","あの","どの"]', correct_answer = 'この', explanation = 'B nói về quyển sách đang ở gần mình nên dùng この + danh từ.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'A: その ほん は おもしろいですか。 B: はい、__ ほん は おもしろいです。';

UPDATE grammar_exercises SET question_text = 'A: (chỉ chiếc ô B đang cầm) それは あなた の かさですか。 B: いいえ、__ は わたし の かさ では ありません。', options_json = '["これ","それ","あれ","どれ"]', correct_answer = 'これ', explanation = 'Chiếc ô ở gần người trả lời B nên B dùng これ. Chiếc ô không thuộc B.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'A: それは あなた の かさですか。 B: いいえ、__ は ちがいます。';

UPDATE grammar_exercises SET question_text = 'A: おしごと は なんですか。 B: わたし __ がくせい です。', options_json = '["は","を","に","へ"]', correct_answer = 'は', explanation = 'Giới thiệu nghề nghiệp: <chủ thể> は N です.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'A: おしごと は なんですか。 B: わたし __ がくせい です。';

UPDATE grammar_exercises SET question_text = 'この へや __ しずか です。', options_json = '["は","を","へ","に"]', correct_answer = 'は', explanation = 'Chủ đề của câu (phòng này) đánh dấu bằng は.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'この へや __ しずか です。';

UPDATE grammar_exercises SET question_text = 'A: たなかさん の でんわばんごう は? B: たなかさん の でんわばんごう __ 090-1234-5678 です。', options_json = '["は","も","を","に"]', correct_answer = 'は', explanation = 'Chủ đề là số điện thoại của Tanaka, dùng は.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'A: たなかさん の でんわばんごう は? B: たなかさん __ 090-1234-5678 です。';

UPDATE grammar_exercises SET question_text = 'FPT だいがく __ ハノイ に あります。', options_json = '["は","を","へ","に"]', correct_answer = 'は', explanation = 'Vị trí của chủ thể: <chủ thể> は <nơi> に あります.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'FPT だいがく __ ハノイ に あります。';

UPDATE grammar_exercises SET question_text = 'わたし の かぞく __ よにん です。', options_json = '["は","を","で","に"]', correct_answer = 'は', explanation = 'N は <số lượng> です: số người trong gia đình đánh dấu bằng は.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'わたし の かぞく __ よにん です。';

UPDATE grammar_exercises SET question_text = 'A: きょう は やすみですか。 B: いいえ、きょう __ やすみ じゃありません。', options_json = '["は","を","に","へ"]', correct_answer = 'は', explanation = 'Câu phủ định vẫn giữ は cho chủ đề.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'A: きょう は やすみですか。 B: いいえ、きょう __ やすみ じゃありません。';

UPDATE grammar_exercises SET question_text = 'つめたい おみず __ ほしいです。', options_json = '["が","に","へ","で"]', correct_answer = 'が', explanation = 'Đối tượng mong muốn dùng が: N が ほしいです.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'つめたい おみず __ ほしいです。';

UPDATE grammar_exercises SET question_text = 'A: どんな かばん __ ほしいですか。 B: ちいさい かばん が ほしいです。', options_json = '["が","で","と","に"]', correct_answer = 'が', explanation = 'Câu hỏi mong muốn cũng dùng が: どんな N が ほしいですか.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'A: どんな かばん __ ほしいですか。 B: ちいさい かばん が ほしいです。';

UPDATE grammar_exercises SET question_text = 'わたし は ともだち __ ほしいです。', options_json = '["が","に","と","へ"]', correct_answer = 'が', explanation = 'N が ほしいです áp dụng cho cả người: ともだち が ほしいです.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'わたし は ともだち __ ほしいです。';

UPDATE grammar_exercises SET question_text = 'A: いま なに __ いちばん ほしいですか。', options_json = '["が","で","に","へ"]', correct_answer = 'が', explanation = 'Hỏi mong muốn nhất: なに が いちばん ほしいですか.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'A: いま なに __ いちばん ほしいですか。';

UPDATE grammar_exercises SET question_text = 'じかん __ ほしいです。(muốn có thời gian)', options_json = '["が","に","へ","で"]', correct_answer = 'が', explanation = 'じかん が ほしいです — đối tượng mong muốn luôn dùng が.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'じかん __ ほしいです。(muốn có thời gian)';

UPDATE grammar_exercises SET question_text = 'かみ __ てがみ を かきます。', options_json = '["で","に","と","を"]', correct_answer = 'に', explanation = 'Viết thư lên giấy, に đánh dấu bề mặt được viết lên. で chỉ công cụ, như bút.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'かみ __ てがみ を かきます。';

UPDATE grammar_exercises SET question_text = 'おんせん へ やすみ __ 行きます。', options_json = '["に","で","を","と"]', correct_answer = 'に', explanation = 'やすみます → やすみ + に 行きます (đi nghỉ dưỡng).', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'おんせん へ やすみ __ 行きます。';

UPDATE grammar_exercises SET question_text = 'つくえ の 上 に ノート __ あります。', options_json = '["が","を","で","に"]', correct_answer = 'が', explanation = 'Chủ thể tồn tại đánh dấu bằng が: ノート が あります.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'つくえ の 上 に ノート __ あります。';

UPDATE grammar_exercises SET question_text = 'へや に だれ __ いますか。', options_json = '["が","を","へ","に"]', correct_answer = 'が', explanation = 'Câu hỏi tồn tại với người: だれ が いますか.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'へや に だれ __ いますか。';

UPDATE grammar_exercises SET question_text = 'こうえん に き __ あります。', options_json = '["が","を","で","に"]', correct_answer = 'が', explanation = 'Cây cối là vật không tự di chuyển → き が あります.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'こうえん に き __ あります。';

UPDATE grammar_exercises SET question_text = 'A: コンビニ は どこですか。 B: あそこ に コンビニ __ あります。', options_json = '["が","も","を","に"]', correct_answer = 'が', explanation = 'Nhắc lại vị trí tồn tại: <nơi> に N が あります.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'A: コンビニ は どこですか。 B: あそこ に コンビニ __ あります。';

UPDATE grammar_exercises SET question_text = 'えき の ちかく に ぎんこう __ あります。', options_json = '["が","を","に","へ"]', correct_answer = 'が', explanation = 'えき の ちかく に ぎんこう が あります.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'えき の ちかく に ぎんこう __ あります。';

UPDATE grammar_exercises SET question_text = 'かばん の 中 に かぎ __ あります。', options_json = '["が","で","へ","を"]', correct_answer = 'が', explanation = 'N の 中 に <vật> が あります.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'かばん の 中 に かぎ __ あります。';

UPDATE grammar_exercises SET question_text = 'くうこう __ ともだち を むかえに 行きます。', options_json = '["へ","を","と","で"]', correct_answer = 'へ', explanation = 'Đích đến vẫn dùng へ: くうこう へ むかえに 行きます.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'くうこう __ ともだち を むかえに 行きます。';

UPDATE grammar_exercises SET question_text = 'この ペン __ ください。', options_json = '["を","が","に","へ"]', correct_answer = 'を', explanation = 'N を ください: を đánh dấu vật yêu cầu.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'この ペン __ ください。';

UPDATE grammar_exercises SET question_text = 'おちゃ を ふたつ __。', options_json = '["ください","あります","います","でした"]', correct_answer = 'ください', explanation = 'を đã đi với おちゃ, thêm ください để yêu cầu hai phần trà.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'おちゃ を ふたつ __ ください。';

UPDATE grammar_exercises SET question_text = 'A: どれ が いいですか。 B: その ノート __ ください。', options_json = '["を","に","で","へ"]', correct_answer = 'を', explanation = 'その N を ください (chọn vật cụ thể).', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'A: どれ が いいですか。 B: その ノート __ ください。';

UPDATE grammar_exercises SET question_text = 'A: おみやげ は なんですか。 B: この おかし __ ください。', options_json = '["を","で","へ","に"]', correct_answer = 'を', explanation = 'Yêu cầu phần quà: この おかし を ください.', needs_human_check = false, source_ref = coalesce(source_ref, '') || ' | reviewed:2026-10-06 Marugoto/JF particles and demonstratives' WHERE question_text = 'A: おみやげ は なんですか。 B: この おかし __ ください。';
