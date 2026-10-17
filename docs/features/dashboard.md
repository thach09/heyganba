# Trang tổng quan

> Trạng thái: Đã triển khai. Tài liệu này ghi hành vi hiện tại trong code.

## Hành vi hiện tại
- **Bản đồ Lộ trình Chinh phục HSK (4 Chặng)**:
  - Chặng 1: Nhập môn Ngữ âm (Pinyin & 4 Thanh điệu) -> Trạm `/pinyin`.
  - Chặng 2: Sơ cấp HSK 1 (150 từ vựng tiêu chuẩn · 20 bộ thủ · 8 cấu trúc ngữ pháp) -> `/vocabulary?level=HSK1`, `/hanzi`, `/grammar`.
  - Chặng 3: Sơ-Trung cấp HSK 2 (300 từ vựng · câu chữ 比, cặp liên từ và bổ ngữ trình độ/kết quả) -> `/vocabulary?level=HSK2`, `/grammar`.
  - Chặng 4: Khảo thí & Cấp Ấn Chương HSK (Thang điểm 200, thời gian thực) -> `/exam` và `/dictionary`.
- **Nhiệm vụ Hằng ngày & Linh Thú Đồng hành**:
  - Tích hợp bên cạnh `<CompanionWidget />` với 3 nhiệm vụ hằng ngày: Ôn tập Flashcard (+30 EXP, +2 🎋), Luyện viết chữ Hán (+25 EXP, +2 🎋), Thực hành Ngữ pháp/Khảo thí (+50 EXP, +3 🎋).
  - Thu hoạch 🎋 Măng Trúc nuôi dưỡng Linh Thú 3D (tiến hóa baby -> junior -> master).
- **Phản chiếu Học tập & Thống kê**:
  - Heatmap hoạt động trong 24 tuần (168 ngày) đọc theo mật độ mực, số hoạt động tuần gần nhất, số câu đúng và số từ đã thuộc.
  - Hai biểu đồ cột mực 30 ngày: lượt học và câu trả lời đúng.
  - Cấp tài khoản và tiến độ tích luỹ EXP thăng cấp.
  - Sidebar hiển thị streak liên tục của người học.

## Nguồn dữ liệu và giới hạn

- Heatmap lấy từ `GET /api/v1/streak/heatmap?days=168`; thống kê flashcard từ `/api/v1/flashcard/stats`; streak từ `/api/v1/streak`.
- EXP lấy từ `GET /api/v1/exp` (alias `/users/me/exp`), tính ở backend từ hoạt động học thật, 1.000 EXP mỗi cấp. Có EXP cho đáp án đúng trong sổ từ.
- Heatmap hiện gồm flashcard reviews, bài thi đã nộp và câu trả lời ngữ pháp. Lượt luyện Kana/Kanji chưa được tính vào heatmap này.
