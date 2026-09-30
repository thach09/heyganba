# Trạm Kana

> Trạng thái: Đã triển khai. Dữ liệu Kana hiện là dữ liệu nháp phía frontend.

## Hành vi hiện tại

- Xem bảng Hiragana và Katakana, chọn ký tự để xem chi tiết và nghe phát âm.
- Luyện gõ romaji: chọn nhóm/hàng/từng ký tự, gõ lần lượt trong một dãy; Enter xác nhận, Backspace sửa buffer. Gõ sai thì ký tự đỏ, hiện cách đọc và được đưa lại cuối hàng đợi.
- Luyện viết trên canvas, có chữ mẫu và ô căn chỉnh.

## Giới hạn hiện tại

- Luyện viết không nhận dạng nét; người học tự đối chiếu với chữ mẫu.
- Tiến độ Luyện gõ lưu trong `localStorage`, không đồng bộ tài khoản.
- Trạm hiện dùng `kanaData.ts` phía frontend; backend Kana API chưa được màn này gọi.
