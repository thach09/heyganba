# Tiến độ học tập

> Trạng thái: Đã triển khai. Đây là chức năng dùng chung, xuất hiện trên Trang tổng quan và Thi thử.

## Hành vi hiện tại

- Streak được tính theo ngày đủ điều kiện: ít nhất 10 lượt ôn SRS, hoặc nộp một đề thi thử, hoặc trả lời ít nhất 10 câu ngữ pháp.
- Heatmap có thể truy vấn theo số ngày; Dashboard dùng 168 ngày, màn Thi thử dùng 91 ngày.
- Bảng xếp hạng hiển thị số từ đã thuộc, streak dài nhất, điểm thi cao nhất và điểm xếp hạng; có thể lọc theo mã lớp.
- Mã lớp là text tự do, lưu trong hồ sơ tài khoản.

## Giới hạn hiện tại

- Kana/Kanji practice count chưa góp vào heatmap/streak.
- EXP/cấp hiển thị trên Dashboard tính phía client từ heatmap, không phải cấp đã lưu trong hồ sơ backend.
