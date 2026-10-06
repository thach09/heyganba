# Trạm Kana

> Trạng thái: Đã triển khai. Dữ liệu Kana hiện là dữ liệu nháp phía frontend.

## Hành vi hiện tại

- Xem bảng Hiragana và Katakana, chọn ký tự để xem chi tiết và nghe phát âm.
- Luyện gõ romaji: chọn nhóm/hàng/từng ký tự, gõ lần lượt trong một dãy; Enter xác nhận, Backspace sửa buffer. Gõ sai thì ký tự đỏ, hiện cách đọc và được đưa lại cuối hàng đợi.
- Luyện viết trên canvas, có chữ mẫu và ô căn chỉnh.
- Chỉ chúc mừng khi nét viết đạt ít nhất 80% cả độ phủ mẫu và tỷ lệ nét nằm đúng vùng. Chấm độc lập với cỡ bút, chữ mẫu, ô ly và DPI; có xoá nét, xoá toàn bộ và phản hồi điểm.
- Đây là đối chiếu hình chữ, chưa kiểm tra thứ tự hoặc hướng nét.

## Giới hạn hiện tại

- Luyện viết không nhận dạng nét; người học tự đối chiếu với chữ mẫu.
- Tiến độ Luyện gõ lưu trong `localStorage`, không đồng bộ tài khoản.
- Trạm hiện dùng `kanaData.ts` phía frontend; backend Kana API chưa được màn này gọi.

## Âm thanh & stroke order (27/09/2026)

- Phát âm dùng **audio TTS của server** (`GET /api/v1/audio/tts?text=<kana>`, Google Translate TTS giọng ja + cache ở
  backend); Web Speech API của trình duyệt chỉ còn là fallback. Với ッ/ー, tham số là từ mượn đầy đủ (ベッド / コーヒー).
- Luyện viết dùng chữ mẫu mờ và hiển thị badge **"Stroke order: Chưa hỗ trợ"** (lý do license: xem
  `docs/Internal/content-mapping-fpt-curriculum.md` → "Stroke order Kanji").

