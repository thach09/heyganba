# Trang tổng quan

> Trạng thái: Đã triển khai. Tài liệu này ghi hành vi hiện tại trong code.

## Hành vi hiện tại

- Hiển thị heatmap hoạt động trong 24 tuần (168 ngày), số hoạt động tuần gần nhất, số câu đúng và số từ đã thuộc.
- Hiển thị hai biểu đồ 30 ngày: lượt học và câu trả lời đúng.
- Hiển thị cấp tài khoản và EXP.
- Sidebar hiển thị streak hiện tại.

## Nguồn dữ liệu và giới hạn

- Heatmap lấy từ `GET /api/v1/streak/heatmap?days=168`; thống kê flashcard từ `/api/v1/flashcard/stats`; streak từ `/api/v1/streak`.
- EXP hiện tính ở frontend: 10 EXP mỗi activity item, 2.000 EXP mỗi cấp; không lưu thành level ở backend.
- Heatmap hiện gồm flashcard reviews, bài thi đã nộp và câu trả lời ngữ pháp. Lượt luyện Kana/Kanji chưa được tính vào heatmap này.
