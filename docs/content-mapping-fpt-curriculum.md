# Content Mapping — Nguồn tài liệu JPD113/JPD123 (Dekiru Nihongo)

Tài liệu này map nội dung từ blog tổng hợp của Min Thep sang schema đã định nghĩa trong `roadmap.md`, để agent biết seed nội dung nào vào bảng nào, theo đúng thứ tự bài học thay vì theo độ khó chữ Kanji ngẫu nhiên.

## Lưu ý về nguồn trước khi seed

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

## Việc cần người biết tiếng Nhật duyệt trước khi lên bảng chính thức

- Toàn bộ cách đọc/âm biến đổi (đã liệt kê ở trên) — vì đây là chỗ agent trích xuất tự động dễ sai nhất nếu không hiểu ngữ cảnh.
- Nghĩa Hán Việt và cách đọc onyomi/kunyomi của từng kanji theo bài.
- Đúng theo quy trình đã nêu trong `agent-guidelines.md`: agent chỉ đưa vào bảng staging, không tự động lên bảng production.
