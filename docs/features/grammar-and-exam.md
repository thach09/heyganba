# Ngữ pháp, đọc ngữ cảnh và thi thử HSK 1–6

## Ngữ pháp

42 điểm ngữ pháp: 12 ở HSK 1, mỗi cấp 2–6 có 6. Có cấu trúc, giải thích, lỗi người Việt thường gặp, ví dụ/Pinyin/TTS zh-CN. Danh sách lọc cấp/chủ đề và tìm kiếm tiếng Việt không dấu.

84 câu trắc nghiệm và 6 câu sắp xếp mẫu (V10, một mỗi cấp). Sắp câu bằng nút từ, bỏ chọn, xếp lại và Chấm câu; token trùng vẫn có danh tính riêng. Đáp án chỉ được trả sau khi máy chủ chấm. Câu sắp xếp yêu cầu đúng câu mẫu đã học vì ngôn ngữ có thể có nhiều trật tự hợp lệ. Retry dùng cùng attemptId; không đổi đáp án trong lần gửi lại và không cộng EXP hai lần.

## Đọc ngữ cảnh và sổ từ

Chín bài: 3/2/1/1/1/1 theo HSK 1–6. Bật/tắt Pinyin và bản dịch, đọc cả đoạn bằng Quan thoại, trả lời câu hỏi hiểu nội dung. Sổ từ có ghi chú lúc thêm và sửa sau khi lưu, tìm kiếm, luyện nhanh với kết quả server ghi nhận. Người khác không được sửa hoặc xoá mục riêng.

## Thi thử nội bộ

| Cấp | Các phần của ứng dụng | Tổng | Ngưỡng đạt |
| --- | --- | ---: | ---: |
| 1–2 | Nghe 100 + Đọc 100 | 200 | 120 |
| 3–6 | Nghe 100 + Đọc 100 + Ngữ pháp 100 | 300 | 180 |

Thang điểm tham chiếu [nguồn](../m6-curriculum-sources.md). Phần Ngữ pháp không thay thế bài Viết chính thức, không phát hành chứng chỉ. Điểm là tổng tỷ lệ đúng từng phần ×100, không lấy phần trăm tổng số câu nhân 300 khi số câu giữa phần không bằng nhau.

Đề có timer, bảng câu hỏi, lưu checkpoint, kết quả dấu 合格/未过 và lịch sử riêng. Phần Nghe không in câu Hanzi cần nghe trong đề, âm thanh dùng zh-CN. Đáp án không trả trước khi nộp. Server chỉ chọn APPROVED, không cho admin đưa pending vào đề tự động. Cùng đề nộp lại trả kết quả cũ; khoá theo user tránh hai lần nộp đồng thời.

Sáu preset nằm ở bảng cấu hình riêng, không tạo người dùng hay bài làm giả. Ngân hàng câu đại diện có giới hạn: yêu cầu nhiều hơn số câu phân biệt sẵn có trả 400 và hướng dẫn chọn ít câu hơn. Không gọi ngân hàng này là toàn bộ đề HSK chính thức.

## Kiểm chứng

`HskCurriculumExamApiTest`, `LearningInsightsApiTest`, các unit test HSK/phiên thi và rehearsal PostgreSQL kiểm tra cả sáu cấp, điểm thành phần, quyền sở hữu, câu nháp, retry và schema thật.
