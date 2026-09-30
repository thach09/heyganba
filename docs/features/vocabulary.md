# Phiên ôn từ vựng

> Trạng thái: Đã triển khai một phần — hiện có phiên flashcard/SRS, chưa có Từ điển hoặc Kho học tập.

## Hành vi hiện tại

- Phiên ôn lấy từ đến hạn và từ mới qua `GET /api/v1/flashcard/due-today`.
- Câu hỏi trắc nghiệm hỏi nghĩa tiếng Việt hoặc cách đọc; từ thuần Kana luôn hỏi nghĩa.
- Nếu phiên không đủ đáp án nhiễu phù hợp, giao diện chuyển sang tự đánh giá.
- Trả lời đúng gửi `GOOD`, sai gửi `FORGOT` qua `POST /api/v1/flashcard/review`; phần kết quả hiển thị từ, cách đọc, nghĩa và một ví dụ.
- Thống kê phiên lấy từ `GET /api/v1/flashcard/stats`.

## Chưa có

- Từ điển tìm kiếm, chức năng thêm từ vào Kho, nhóm cá nhân và thư viện nhóm học tập. Các phần này được theo dõi ở issue #11.
- Pool từ mới hiện lấy từ toàn bộ vocabulary mà người dùng được xem, chưa giới hạn theo Kho cá nhân.
