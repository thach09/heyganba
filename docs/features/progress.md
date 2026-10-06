# Tiến độ học tập & Điểm kinh nghiệm (EXP)

> Trạng thái: Đã triển khai đầy đủ. Đây là chức năng dùng chung, xuất hiện trên Trang tổng quan và Thi thử.

## Hành vi hiện tại

- **Streak**: được tính theo ngày đủ điều kiện (múi giờ `Asia/Ho_Chi_Minh`): ít nhất 10 lượt ôn SRS, hoặc nộp một đề thi thử, hoặc trả lời ít nhất 10 câu ngữ pháp.
- **Heatmap**: truy vấn số lượt học theo ngày qua `GET /api/v1/study-activities/heatmap`; Dashboard dùng 168 ngày (24 tuần), màn Thi thử dùng 91 ngày (13 tuần).
- **Điểm kinh nghiệm (EXP) & Cấp độ**:
  - Backend quản lý qua `ExpService`, lưu trữ và cung cấp thông tin cấp độ qua endpoint `GET /api/v1/users/me/exp`.
  - Quy tắc tích luỹ EXP: 10 EXP / câu ngữ pháp hoặc sổ từ đúng, 50 EXP / mỗi 10 lượt ôn SRS tích luỹ, 100 EXP * tỷ lệ điểm / lượt thi thử. Không cấp 50 EXP chỉ vì ôn một thẻ. Phiên sổ từ có UUID để retry không cộng điểm hai lần.
  - Cấp độ (Level) được tính từ tổng EXP tích luỹ và đồng bộ giữa Backend và Dashboard UI.
- **Bảng xếp hạng (Leaderboard)**: hiển thị số từ đã thuộc, streak dài nhất, điểm thi cao nhất và điểm xếp hạng qua `GET /api/v1/leaderboard`; hỗ trợ lọc theo phạm vi toàn hệ thống hoặc theo mã lớp (`classCode`).
- **Mã lớp**: lưu trong hồ sơ tài khoản, có thể cập nhật linh hoạt.

## Giới hạn hiện tại

- Luyện viết Kana/Kanji tự do chưa tính trực tiếp vào streak ngày (chỉ tính phiên quiz/test).

## Luồng liên quan

- UI: Trang tổng quan (`/`), Màn Thi thử (`/exam`).
- API:
  - Streak: `GET /api/v1/streak`
  - Hoạt động & Heatmap: `GET /api/v1/study-activities/heatmap`
  - Điểm kinh nghiệm: `GET /api/v1/users/me/exp`
  - Bảng xếp hạng: `GET /api/v1/leaderboard`

