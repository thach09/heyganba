# Content Mapping — Nguồn tài liệu JPD113/JPD123 (Dekiru Nihongo)

Tài liệu này map nội dung từ blog tổng hợp của Min Thep sang schema đã định nghĩa trong `roadmap.md`, để agent biết seed nội dung nào vào bảng nào, theo đúng thứ tự bài học thay vì theo độ khó chữ Kanji ngẫu nhiên.

## Quy trình duyệt nội dung (chốt 27/09/2026) — `needs_human_check` + `source_ref`

Đây là quy trình CHÍNH THỨC thay cho cách làm cũ ("agent tự soạn rồi để `PENDING_REVIEW` chờ duyệt tay"). Áp dụng cho
mọi nội dung tiếng Nhật do AI soạn.

**Tiêu chí đối chiếu (bắt buộc với TỪNG câu/ từng thẻ trước khi gắn `needs_human_check = FALSE`):**

1. **Ngữ pháp** phải đối chiếu được với ít nhất 1 nguồn: tài liệu gốc của môn (số gốc `doc:#N` trong
   `grammar_rules.source_ref`), Minna no Nihongo (phần tương đương), hoặc **danh sách ngữ pháp JLPT N5/N4 công khai**.
   Không chấp nhận chỉ dựa vào suy luận của mô hình.
2. **Từ vựng/kanji**: tra chéo cách đọc (onyomi/kunyomi) và nghĩa Hán Việt qua từ điển uy tín (Jisho/Weblio hoặc
   tương đương) — không tự suy ra cách đọc.
3. **Câu trắc nghiệm**: chỉ được có DUY NHẤT 1 đáp án đúng (cả ngữ pháp lẫn ngữ nghĩa). Câu có thể chấp nhận 2 đáp án
   tuỳ ngữ cảnh **phải** gắn `needs_human_check = TRUE` — nhóm hay sai nhất là trợ từ gần nghĩa (は/が, に/で, に/へ, を/が, も/は).
4. **Nhóm "bẫy"** (trợ từ đọc khác は/へ/を, biến âm số đếm ふん/ぷん, giờ 4/7/9, ngày 1/4/8/14/20/24...) kiểm kỹ hơn: ví dụ phải
   phản ánh đúng ngữ cảnh dùng biến âm, không bịa tình huống gượng ép.

**Cơ chế lưu trữ:** mỗi bảng nội dung có 3 cột (migration `V19__add_needs_human_check.sql`):
`needs_human_check` (BOOL, mặc định false), `source_ref` (nguồn đã dùng để đối chiếu), `review_note` (lý do cần kiểm).
Câu không đối chiếu được nguồn: giữ `review_status = PENDING_REVIEW` + `needs_human_check = TRUE`.

**Nơi duyệt (Admin panel):** tab **"Cần kiểm"** trong `/admin` — gọi `GET /api/v1/admin/review-queue` (ADMIN):
các item `needs_human_check = TRUE` được xếp LÊN ĐẦU kèm `reviewNote` + `sourceRef`; `?onlyNeedsCheck=true` để chỉ xem
nhóm cần kiểm. Số tổng hợp theo loại nằm ở `GET /api/v1/content/review-status` (`totalNeedsHumanCheck` +
`needsHumanCheck` từng loại).

### Kết quả đợt kiểm đầu tiên — nội dung V12/V14 (27/09/2026)

| Chỉ số | Giá trị | Cách đo |
|---|---|---|
| Tổng số câu bài tập | 306 | `select count(*) from grammar_exercises` (64 từ V9 + 242 từ V12/V14) |
| Câu V12/V14 được gắn `source_ref` | **242 / 242** | `id > 64 and source_ref is not null` → 0 dòng thiếu |
| Câu **đối chiếu được nguồn** (`needs_human_check = FALSE`) | **179 / 242** | `not needs_human_check` |
| Câu **cần người biết tiếng Nhật kiểm** (`needs_human_check = TRUE`) | **63 / 242** | `needs_human_check and review_status = 'PENDING_REVIEW'` (đều có `review_note`) |
| Câu thiếu đáp án trong `options_json` | **0** | `options_json not like '%"' || correct_answer || '"%'` |
| Câu trùng (rule + câu hỏi) | **0** | `group by grammar_rule_id, question_text having count(*) > 1` |
| Câu có đồng thời では + じゃ trong lựa chọn | **0** | nhóm phủ định vì thế không bị 2 đáp án |

63 câu bị gắn cờ gồm 2 nhóm, đều CÓ LÝ DO ghi trong `review_note`:

- **Nhóm (a) — chỉ định từ こ/そ/あ** (câu hội thoại / có chú thích ngữ cảnh): đáp án phụ thuộc vị trí người nói – người
  nghe nên có thể có 2 phương án đúng nếu không nói rõ ai đang cầm vật.
- **Nhóm (b) — đáp án nằm trong CẶP TRỢ TỪ GẦN NGHĨA**, cả 2 đều có trong lựa chọn (は/が, に/へ, に/で, を/が, も/は):
  63 câu này là các câu thoả điều kiện "đáp án ∈ cặp và cả 2 có trong options" (đã lọc bằng SQL trên staging).

Nguồn dùng để đối chiếu (đã đọc trực tiếp, không suy đoán):

- **JLPT N5 grammar list công khai** — https://jlptsensei.com/jlpt-n5-grammar-list/ (3 trang, 84 mục). Nhãn trong
  `source_ref` ghi đúng nhãn của danh sách này, ví dụ `jlpt-n5: tai たい`, `jlpt-n5: te wa ikenai てはいけない`,
  `jlpt-n5: wa ~yori... desu は〜より`, `jlpt-n5: no naka de [A] ga ichiban の中で[A]が一番`.
- **Số gốc tài liệu môn học** `doc:#N` (từ `grammar_rules.source_ref`, migration V11) — giữ để đối chiếu ngược lại
  giáo trình Dekiru dạy ở FPT (JPD113 bài 1–3, JPD123 bài 4–7).
- **Jisho** cho cách đọc của nhóm số đếm/ngày/tháng — đã tra và khớp: `四日 = よっか` (JLPT N5, "4th day/four days"),
  `八百 = はっぴゃく`. Các mục biến âm khác (9時 = くじ, 4時 = よじ, 30分 = さんじゅっぷん, 1日 = ついたち, 14日 = じゅうよっか...)
  đối chiếu theo bảng số đếm JLPT N5 chuẩn và khớp với nội dung V12/V14.

**Việc còn lại của người biết tiếng Nhật**: mở tab "Cần kiểm" và chốt 63 câu trên (mỗi câu có sẵn `reviewNote` nói rõ
vì sao cần chốt). Sau khi chốt: sửa `needs_human_check = FALSE` (hoặc sửa lại câu cho rõ ngữ cảnh rồi mới hạ cờ) bằng
một migration mới — **không sửa file V12/V14** vì staging đã áp chúng (Flyway lưu checksum).

### Nguồn tài liệu trước khi seed (giữ nguyên từ bản gốc)

Nguồn gốc: `thepkz.github.io/minthep-portfolio` (tác giả Min Thep), tổng hợp giáo trình **Dekiru Nihongo** dạy tại FPT (JPD113 = bài 1–3, JPD123 = bài 4–7). Tác giả có ghi rõ trên trang: cấm dùng để dạy học/kinh doanh tài liệu vì mục đích kiếm tiền — chỉ để học phi thương mại. Vì web của m sẽ có user thật, nên trước khi seed dữ liệu vào bảng chính thức:
- Ghi rõ nguồn tham khảo trong seed script/CHANGELOG.
- Không copy nguyên khối các bảng tổng hợp (vocab, kanji, ngữ pháp) làm dữ liệu hiển thị công khai mà không biến đổi — nên coi đây là *nguồn tham khảo để xây dựng lại nội dung của riêng m* (tự viết lại ví dụ, tự chọn cách trình bày), không phải để sao chép nguyên văn.
- Nếu định public sản phẩm rộng rãi (không chỉ dùng cá nhân/nội bộ lớp), nên nhắn tác giả xin phép trước, vì tác giả đã chủ động nêu điều kiện sử dụng.

## Cấu trúc môn học → cấu trúc lesson trong hệ thống

| Học phần | Phạm vi | Nội dung chính |
|---|---|---|
| JPD113 | Bài 1–3 | Chào hỏi, các loại số đếm (tháng/ngày/thứ/giờ/phút/tuổi/tầng/số lớn), 17 điểm ngữ pháp nền tảng (vị trí, xuất xứ, sở hữu, thời gian, chia động từ dạng ます, cách di chuyển...) |
| JPD123 | Bài 4–7 | Chia tính từ い/な, mong muốn (V-たい, N-がほしい), mục đích chuyến đi, so sánh hơn/nhất, động từ thể て |

Đề xuất `lesson_id` dạng slug để dễ đối chiếu ngược lại nguồn: `jpd113-b1`, `jpd113-b2`, `jpd113-b3`, `jpd123-b4`, `jpd123-b5`, `jpd123-b6`, `jpd123-b7`.

## Map nội dung → bảng dữ liệu

**Bảng `kana`**
- 46 Hiragana + 46 Katakana + biến thể (dakuten/handakuten, âm ghép yōon, âm ngắt sokuon, âm dài chōon).
- Thêm field `is_particle_exception` (hoặc bảng riêng `particle_readings`) cho đúng 3 ký tự đọc khác khi làm trợ từ (は/へ/を) — đây là nội dung agent phải giữ lại đúng bản chất "viết không đổi, chỉ đọc đổi khi làm trợ từ", tránh seed nhầm thành 3 ký tự riêng biệt.
- Thêm ghi chú riêng cho nhóm ký tự dễ nhầm khi đọc (シ/ツ/ソ/ン) — nên có ở phần luyện tập nhận diện của Trạm Kana, không chỉ ở bảng tra cứu.

**Bảng `vocabulary` / `kanji`**
- Gán theo đúng `lesson_id` (bài 1–7), không tải nguyên bộ Jōyō 2136 chữ.
- Với kanji: giữ cả 2 cách đọc (onyomi/kunyomi) khi có, và ghi chú ngắn cách đọc nào dùng khi đứng riêng / khi ghép từ.

**Bảng `grammar_rules`**
- 17 điểm ngữ pháp JPD113 + các mục ngữ pháp JPD123 theo bài 4–7 (chia tính từ, thể て, so sánh, mẫu câu mục đích...).
- Numbering gốc của tài liệu nhảy từ 5 sang 7 (không có mục 6) — giữ nguyên số gốc trong metadata để agent và người duyệt dễ đối chiếu ngược lại nguồn khi cần sửa.

**Bảng/flag "bẫy thường gặp"** (đề xuất field `is_common_mistake` trên exercise, hoặc bảng riêng `common_mistakes` liên kết tới `grammar_rules`/`kana`)
- 3 trợ từ đọc khác (は/へ/を).
- Các số đếm có biến âm/ngoại lệ: ngày 14/20/24 đổi hẳn từ, ngày 17/19/27/29 chỉ đổi cách đọc số; giờ 4/7/9; phút với biến âm ふん/ぷん; tuổi với biến âm っさい và ngoại lệ duy nhất 20 tuổi (đọc khác hẳn, không dùng đơn vị tuổi thông thường); tầng với biến âm tương tự cách đếm tuổi.
- Phân biệt trợ từ liệt kê đầy đủ và liệt kê ví dụ (dễ nhầm khi dịch sang tiếng Việt).
- Đây chính là nhóm nội dung nên ưu tiên đưa vào Trạm Trợ từ & Ngữ pháp (Phase 4) vì là nhóm dễ mất điểm nhất theo tài liệu gốc.

## Trạng thái triển khai — nhóm Kana ở Trạm Kana (Phase 1)

Bảng nháp phía frontend: `frontend/src/features/kana/kanaData.ts` (agent tạo, **chờ người biết tiếng Nhật duyệt** trước khi đưa vào Flyway seed / bảng production — theo AGENTS.md).

| Nhóm | Số ký tự | Ghi chú |
|---|---|---|
| Hiragana Gojūon | 46 | Giữ đúng cột a/i/u/e/o, hàng や/わ để ô trống cho đúng cột |
| Hiragana Dakuten / Handakuten | 20 / 5 | ぢ/づ gắn cờ dễ nhầm (đọc giống じ/ず, chỉ dùng khi ghép) |
| Hiragana Yōon | 33 | きゃ → ぴゃ |
| **Katakana Gojūon (46 chữ cơ bản)** | 46 | Bảng cơ bản tách riêng, không trộn nội dung mở rộng |
| Katakana Dakuten / Handakuten | 20 / 5 | |
| Katakana Yōon | 33 | |
| **Katakana mở rộng — tổ hợp âm cho từ mượn** | 37 | ファ / フィ / フェ / フォ / フュ, ウィ / ウェ / ウォ, ヴァ / ヴィ / ヴ / ヴェ / ヴォ, シェ / ジェ / チェ, ティ / ディ / テュ / デュ, トゥ / ドゥ, **ツァ / ツィ / ツェ / ツォ**, スィ / ズィ, クァ行, グァ行 |
| **Katakana ký tự đôi** | 2 | 促音 ッ (gấp đôi phụ âm đứng sau) và 長音 ー (kéo dài nguyên âm) kèm ví dụ từ mượn |

- は / へ / を giữ nguyên 1 record cho mỗi ký tự, chỉ gắn cờ `isParticleException` — không tách thành ký tự riêng.
- Nhóm dễ nhầm khi đọc (し / つ / そ / ん và シ / ツ / ソ / ン) gắn cờ `isCommonMistake` để highlight trong bảng và xuất hiện trong quiz nhận diện.
- Mục cần duyệt kỹ: cách đọc của ヴ (v/b), nhóm スィ / ズィ (ít dùng), chính tả các từ mượn trong ví dụ (ウィンドウ, カルツォーネ...).

### Seed đã tạo từ mapping này

| Migration | Nội dung | Trạng thái | Chạy ở đâu |
|---|---|---|---|
| `V3__seed_kana.sql` | 247 ký tự kana (Hiragana/Katakana đầy đủ + Katakana mở rộng + 促音/長音), 3 cờ `is_particle_exception` | Nháp — chờ duyệt (`review_status = PENDING_REVIEW`) | `db/migration` (mọi môi trường) |
| `V4__seed_vocabulary.sql` | 44 từ vựng khởi điểm trải 7 bài (jpd113-b1 → jpd123-b7), có reading/nghĩa/Hán Việt/ví dụ | Nháp — chờ duyệt | `db/migration` (mọi môi trường) |
| `V7__seed_kanji.sql` + `V6__seed_radicals.sql` | 63 kanji + 70 bộ thủ + 101 liên kết | Nháp — chờ duyệt | `db/migration` (mọi môi trường) |
| `V8__seed_grammar_rules.sql` | 32 điểm ngữ pháp (số hiển thị liên tục 1..32; số gốc `doc:#N` giấu ở `source_ref`) | Nháp — chờ duyệt | `db/migration` (mọi môi trường) |
| `V9__seed_grammar_exercises.sql` | 64 câu bài tập (29 câu cờ bẫy) | Nháp — chờ duyệt | `db/migration` (mọi môi trường) |
| `V12__expand_grammar_exercises.sql` | +96 câu (đạt 5 câu/điểm), 46 câu cờ bẫy | **Nháp — CHỜ DUYỆT, KHÔNG promote** | `db/migration-staging` (**chỉ local/staging**) |
| `V14__expand_trap_exercises.sql` | +146 câu cho nhóm bẫy (mọi nhóm ≥10 câu; tổng 221 câu cờ bẫy) | **Nháp — CHỜ DUYỆT, KHÔNG promote** | `db/migration-staging` (**chỉ local/staging**) |

- Trạng thái duyệt được lưu **trong DB** ở cột `review_status` (migration V13, mặc định `PENDING_REVIEW`) và phơi ra qua
  `GET /content/review-status`; UI Trạm Trợ từ hiện badge "chờ duyệt".
- `V12`/`V14` nằm ở `db/migration-staging` nên **production không nhận** — chỉ promote sau khi có người biết tiếng Nhật duyệt
  (xem `docs/Internal/deployment-plan.md` → "Gate nội dung chưa duyệt").

Các file seed đều ghi rõ trong header rằng nội dung **chưa qua người biết tiếng Nhật duyệt** và phải hoàn tất review trước khi
coi là dữ liệu chính thức.

## Việc cần người biết tiếng Nhật duyệt trước khi lên bảng chính thức

- Toàn bộ cách đọc/âm biến đổi (đã liệt kê ở trên) — vì đây là chỗ agent trích xuất tự động dễ sai nhất nếu không hiểu ngữ cảnh.
- Nghĩa Hán Việt và cách đọc onyomi/kunyomi của từng kanji theo bài.
- Đúng theo quy trình đã nêu trong `agent-guidelines.md`: agent chỉ đưa vào bảng staging, không tự động lên bảng production.

## Audio — Google Translate TTS + cache (chốt 27/09/2026)

- Endpoint dùng: `https://translate.google.com/translate_tts` với **`tl=ja`** (đúng language code tiếng Nhật) +
  `client=tw-ob` + User-Agent thật. Đây là endpoint **KHÔNG chính thức** (không SLA, không API key) ⇒ **bắt buộc cache**:
  mỗi chuỗi kana chỉ được gọi Google **1 lần**, các lần sau đọc từ cache (tránh rate-limit/chặn IP).
- Cache: bảng `tts_audio` (migration `V21__tts_audio_cache.sql`), khoá `sha256(kana_text)`. Nếu cấu hình Cloudflare R2
  (`R2_ACCOUNT_ID` + `R2_API_TOKEN` + `R2_BUCKET` + `R2_PUBLIC_BASE_URL`) thì file được đẩy lên R2 và `public_url` là
  URL CDN (frontend phát trực tiếp, backend trả 302). Chưa cấu hình R2 thì file nằm trong DB và phục vụ qua
  `GET /api/v1/audio/tts?text=<kana>` (yêu cầu đăng nhập + rate limit 120 req/phút/user + chỉ nhận chuỗi kana/kanji ≤ 64 ký tự).
- Frontend: `services/ttsAudio.ts` — fetch kèm `Authorization` rồi phát **blob URL** (thẻ `<audio>` không gửi được header,
  nên không thể trỏ thẳng vào endpoint có auth). Web Speech API của trình duyệt chỉ còn là **fallback** khi server lỗi.
- **Quy tắc ngữ âm (bắt buộc)**: TTS nhận **chuỗi KANA**, không nhận kanji thô. Đã sửa đề thi thử để `audioText` của câu
  từ vựng là `vocabulary.reading` (trước đây truyền chữ kanji), và kana ッ/ー dùng `audioText` là từ mượn đầy đủ
  (ベッド / コーヒー). Có test `ExamApiTest` chặn hồi quy: `audioText` của câu VOCABULARY phải khớp `[hiragana/katakana/ー]`.
- **Nhóm bẫy biến âm** (ふん/ぷん, giờ 4/7/9, ngày 1/4/8/14/20/24, 20歳...): vẫn phải **nghe thử lại bằng tai** sau khi
  generate. Nếu Google TTS đọc sai (hay gặp với số đếm đặc biệt) thì **ghi đè bằng audio thu tay** cho riêng nhóm đó:
  đặt file thật vào `audio_url` của bản ghi — `playKanaAudio` ưu tiên `audioUrl` nên TTS sẽ bị bỏ qua.

## Stroke order Kanji — kết quả tìm nguồn thay KanjiVG (27/09/2026)

**Kết luận: KHÔNG tìm được nguồn license permissive ⇒ KHÔNG tích hợp animation nét viết** (theo đúng phương án dự phòng
đã chốt trước khi làm). Đã tắt animation và hiển thị badge rõ ràng trên UI.

| Nguồn ứng viên | License (đã đọc điều khoản, không đoán theo tên) | Kết luận |
|---|---|---|
| **KanjiVG** (bộ dữ liệu nét vẽ SVG mà phần lớn từ điển/tool dùng) | **CC BY-SA 3.0** — share-alike. Xác nhận trực tiếp trên chân trang Jisho.org: *"Kanji stroke diagrams are based on data from KanjiVG, which is copyright © 2009-2012 Ulrich Apel and released under the Creative Commons Attribution-Share Alike 3.0 license."* | **Loại** — share-alike không phù hợp nhúng vào sản phẩm đóng |
| Bản đóng gói lại/dẫn xuất từ KanjiVG (kể cả trong thư viện JS) | Thừa hưởng CC BY-SA của dữ liệu gốc | **Loại** |
| Make Me a Hanzi / Hanzi Writer | Dữ liệu nét viết thiên về chữ Hán (không phải kanji Nhật) và ràng buộc giấy phép của font gốc | **Loại** (không dùng được cho kanji tiếng Nhật) |

Vì vậy: **không có animation stroke order**. UI luyện viết hiển thị badge **"Stroke order: Chưa hỗ trợ"**
(`KanaCanvas` → prop `strokeOrderSupported`, mặc định `false`) kèm ghi chú "xem thứ tự nét trong sách/giáo trình", và
giữ nguyên luồng chính hiện có: **vẽ tự do trên chữ mẫu mờ** (`showTemplate`). Badge nằm ngay trên khung vẽ nên không gây
hiểu nhầm là lỗi.

Khi nào tìm được nguồn permissive (MIT / OFL / CC0 / CC-BY): truyền `strokeOrderSupported={true}`, **ghi nguồn + license
vào chính mục này trước khi tích hợp**, rồi mới bật animation.
