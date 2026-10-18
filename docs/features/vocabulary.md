# Từ vựng và SRS

Cập nhật M6 và audit 17/10/2026. Bộ lọc Nhập môn + HSK 1–6 lấy cấp từ URL, giữ tham số khác và hỗ trợ back/refresh. Số bài/từ phản ánh dữ liệu hiện có; xem [nguồn và số lượng](../m6-curriculum-sources.md).

## Luồng học

Chọn bài theo cấp/chủ đề, xem từ và câu ví dụ song ngữ, lật thẻ để hiện Pinyin/Hán Việt/nghĩa. Cả hai mặt thẻ nằm trong bố cục grid có chiều cao theo nội dung để câu dài không đè phần điều khiển. Lưu vào sổ từ qua một thao tác và có phản hồi kết quả.

Gõ Pinyin dùng `checkPinyinAnswer`, chấp nhận dấu thanh hoặc số, gồm ü/v (hǎo/hao3, lǜ/lv4). Bài gõ là luyện tập phát âm qua chữ, không đánh giá giọng nói.

Hàng đợi SRS là luồng riêng, chọn Quên / Nhớ mang máng / Nhớ rõ, lịch ôn SM-2 do server lưu theo người dùng. Mutation có attemptId để retry mạng không cộng lượt hai lần. Pending không hiện cho người học thường; admin có thể xem bản nháp.

Dashboard đếm từ riêng theo cấp, ôn nhớ ít nhất một lần. Không gọi đây là mức thông thạo được chứng nhận. Mỗi 10 lượt SRS tích luỹ cộng EXP theo cấu hình; nhiệm vụ 10 lượt trong ngày có phần thưởng riêng, phải nhận ở Dashboard.

## Kiểm chứng

`curriculum-m6.test.tsx` kiểm tra sáu cấp/URL, `flashcard-m22.test.tsx` và các test phiên học kiểm tra luồng bài/SRS. Backend kiểm tra chủ sở hữu, bản nháp, SM-2 và idempotency. Rehearsal PostgreSQL kiểm tra dữ liệu, seed chạy lại và sequence.
