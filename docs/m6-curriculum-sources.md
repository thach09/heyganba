# Nguồn và phạm vi giáo trình M6

Cập nhật 17/10/2026. M6 bổ sung nội dung ở cả sáu cấp, không phải toàn bộ kho 5.000 từ của HSK sáu cấp trước đây. Cấp độ trong ứng dụng là cách tổ chức bài học; một số từ theo chủ đề có thể nằm ở cấp khác trong danh mục tham chiếu.

## Nguồn đối chiếu

- Danh mục từ: [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary), `wordlists/exclusive/old/1.json` đến `6.json`. Đây là bản tổng hợp cộng đồng, không phải chứng nhận của đơn vị tổ chức thi. Danh sách riêng từng cấp có 150, 147, 298, 598, 1.298 và 2.500 mục. Tổng 4.991 mục riêng vì cách loại trùng giữa các cấp.
- Cách đọc, số nét và bộ: [Unicode Unihan 17.0](https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip), trường `kMandarin`, `kVietnamese`, `kTotalStrokes`, `kRSUnicode`; định nghĩa ở [UAX #38](https://www.unicode.org/reports/tr38/). Chiết tự hình thể trong bài không được coi là giải thích từ nguyên.
- Pinyin và chuyển giản/phồn dùng công cụ biên soạn `pypinyin 0.55.0`, `opencc-python-reimplemented 0.1.7`; câu ví dụ và lời giải tiếng Việt được soạn riêng. Công cụ tự động không thay thế kiểm định phát âm theo ngữ cảnh.
- Thang điểm tham chiếu: [HSK 2](https://www.chinesetest.cn/HSK/2), [HSK 3](https://www.chinesetest.cn/HSK/3), [HSK 6](https://www.chinesetest.cn/HSK/6). 200/120 cho cấp 1–2 và 300/180 cho cấp 3–6. Đề của ứng dụng là bài luyện nội bộ; cấu trúc Ngữ pháp ở cấp 3–6 không mô phỏng đầy đủ phần Viết của kỳ thi chính thức.

Không sao chép câu ví dụ từ sách thương mại. Trường nghĩa, Hán Việt và ghi chú là dữ liệu biên soạn có thể cần sửa sau phản biện. Không có bằng chứng một hội đồng học thuật độc lập đã ký duyệt toàn bộ nội dung.

## Dữ liệu sau V9 trên PostgreSQL mới

| Cấp | Từ vựng (bản ghi / từ riêng) | Ngữ pháp | Bài tập trắc nghiệm | Chữ Hán | Bài đọc |
| --- | ---: | ---: | ---: | ---: | ---: |
| HSK 1 | 182 / 160 | 12 | 24 | 39 | 3 |
| HSK 2 | 154 / 154 | 6 | 12 | 20 | 2 |
| HSK 3 | 53 / 53 | 6 | 12 | 4 | 1 |
| HSK 4 | 48 / 48 | 6 | 12 | 4 | 1 |
| HSK 5 | 53 / 53 | 6 | 12 | 4 | 1 |
| HSK 6 | 60 / 60 | 6 | 12 | 4 | 1 |

Còn 10 từ nhập môn chưa gắn cấp. Tổng 560 bản ghi từ, 538 từ riêng theo nhóm cấp, 42 điểm ngữ pháp, 84 trắc nghiệm, 75 chữ Hán, 9 bài đọc, 30 bài học và 6 cấu hình thi thử. V9 thêm 337 từ: 42/81/53/48/53/60 theo cấp. Giữ nguyên các bản ghi cũ nên HSK 1 còn 22 bản ghi trùng từ giữa bài học. Dashboard mới đếm từ riêng, không cộng trùng.

V9 bù đủ các từ của hai danh mục tham chiếu cấp 1–2, cộng thêm từ theo chủ đề. Không gọi 182 hay 154 là số từ chính thức của HSK. V10 tái sử dụng một ví dụ đã duyệt ở mỗi cấp để thêm 6 bài sắp xếp câu, nâng tổng bài tập lên 90. Câu mẫu được chỉ rõ để tránh coi một thứ tự hợp ngữ pháp khác là sai tuyệt đối.

## Quy trình và tái tạo

Nguồn biên soạn được lưu tại `scripts/m6-curriculum-vocabulary.tsv`, `m6-curriculum-content.py`, `m6-hanviet.txt`. `m6-fetch.py` tải snapshot vào `backups/m6-source/`; `build-m6-curriculum.py` tạo SQL V9 và JSON bài đọc. Các snapshot có SHA-256 trong báo cáo audit. Không chạy lại builder để sửa migration đã áp dụng: hãy tạo migration mới.

V9 dùng `APPROVED`, `needs_human_check=false` theo yêu cầu M6 được gửi trực tiếp. Đây là trạng thái xuất bản kỹ thuật theo yêu cầu đó, không phải chứng nhận chuyên gia. Nội dung mới ngoài phạm vi này vẫn mặc định `PENDING_REVIEW`. V10 dùng lại đúng câu đã xuất bản, không mở đợt phê duyệt hàng loạt mới.

Flyway V1–V8 giữ nguyên checksum. Callback `beforeEachMigrate.sql` sửa sequence bị tụt và bổ sung cột trạng thái bộ thủ còn thiếu trên đường khởi tạo cũ. Seed V4–V10 được chạy lại hai lần trong rehearsal để kiểm tra không tăng số bản ghi. Không tạo người dùng hay lịch sử thi giả trong migration.

## SHA-256 snapshot đã dùng

| Tệp | SHA-256 |
| --- | --- |
| hsk1.json | `957709a39fcdddd8ef02adc438f2f47113548cf31421dbe986edae165973e295` |
| hsk2.json | `f9c5203307fa1553e48a316c9a7bf4c285962244148a3756c57390203c0d95d0` |
| hsk3.json | `7227715922a7b7c2bcaea4b904bc4e09d7683e9ff2290fb842d75dd422563e75` |
| hsk4.json | `0e4ec38a9ce0614c2a1da5bdb861e603fe1b994fe84900918a766ca13f4e1e5b` |
| hsk5.json | `5f7d7ef22efbf5da8b207874c575dff9afbe539ceb7ebf0dcedc8d5d219f32a1` |
| hsk6.json | `ad642cf9858f89f9540bb174505d17315357fbbbf9aa9c4d921a27a075517f5e` |
| Unihan_IRGSources.txt | `d1c817dd7db84295dab0643c277d97c2fa742c245f8824e6736c2a0935095325` |
| Unihan_Readings.txt | `575e69c9ad85a4737a889a4f94cbd987042a90a1a6cc16dd3f4ed995c715b17c` |
