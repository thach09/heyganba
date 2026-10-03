# Trạm Kanji

> Trạng thái: Đã triển khai.

## Hành vi hiện tại

- Lọc Kanji theo bài học hoặc bộ thủ; tìm theo nghĩa, Hán Việt, chữ Hán hoặc cách đọc.
- Panel chi tiết hiển thị chữ, Hán Việt, số nét, onyomi/kunyomi, nghĩa, mnemonic và bộ thủ.
- Tab Luyện viết cho phép duyệt/chọn chữ, viết trên canvas và lưu lượt luyện theo tài khoản.

## Giới hạn hiện tại

- Canvas không nhận dạng chữ viết hoặc kiểm tra thứ tự nét; hệ thống chỉ lưu số lần luyện và thời điểm luyện gần nhất.
- Lượt luyện Kanji chưa được tính vào heatmap/streak.

## Stroke order (27/09/2026)

- **Không có animation thứ tự nét**: bộ dữ liệu KanjiVG mang license CC BY-SA 3.0 (share-alike) nên không dùng được,
  và chưa tìm được nguồn license permissive thay thế — xem `docs/Internal/content-mapping-fpt-curriculum.md` → "Stroke order Kanji".
- Phần luyện viết hiển thị badge **"Stroke order: Chưa hỗ trợ"** ngay trên khung vẽ, kèm luồng chính hiện có: **vẽ tự do
  trên chữ mẫu mờ** (`KanaCanvas`, prop `strokeOrderSupported` mặc định `false`).

