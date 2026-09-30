# Trạm Thi thử

> Trạng thái: Đã triển khai; đề tự tạo theo phạm vi người dùng là hướng phát triển, chưa có.

## Hành vi hiện tại

- Chọn số câu (10/20/30) và thời gian (10/20/30 phút), sau đó sinh đề.
- Đề gồm câu ngữ pháp, Kana và từ vựng; tỷ lệ sinh hiện cố định trong backend: 40% ngữ pháp, 30% Kana, phần còn lại từ vựng. Nếu thiếu câu, backend thử bổ sung từ pool ngữ pháp.
- Chọn đáp án, có đồng hồ và tự nộp khi hết giờ; câu nghe dùng Web Speech TTS trên trình duyệt.
- Server chấm bài, lưu lịch sử và trả phần xem lại đáp án/giải thích.
- Màn Thi thử còn hiển thị heatmap streak và bảng xếp hạng toàn hệ thống/theo lớp.

## Giới hạn hiện tại

- Người dùng chỉ chọn số câu và thời gian; chưa chọn loại câu/bài học/phạm vi nội dung.
- Đề được lấy từ toàn bộ nội dung đã duyệt mà người dùng được xem, không lọc theo lịch sử học của người dùng.
- TTS là placeholder, chưa có audio thu thật. Đề người dùng tự tạo/lưu lại được theo dõi ở issue #12.
