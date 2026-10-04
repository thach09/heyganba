# Phiên ôn từ vựng & Tra cứu từ điển

> Trạng thái: Đã triển khai đầy đủ — bao gồm phiên Flashcard/SRS, Tra cứu từ điển tiếng Nhật và Sổ tay từ vựng cá nhân (Issue #11).

## Hành vi hiện tại

### 1. Phiên Flashcard / SRS
- Phiên ôn lấy từ đến hạn và từ mới qua `GET /api/v1/flashcard/due-today`.
- Câu hỏi trắc nghiệm hỏi nghĩa tiếng Việt hoặc cách đọc; từ thuần Kana luôn hỏi nghĩa.
- Nếu phiên không đủ đáp án nhiễu phù hợp, giao diện chuyển sang tự đánh giá.
- Trả lời đúng gửi `GOOD`, sai gửi `FORGOT` qua `POST /api/v1/flashcard/review`; phần kết quả hiển thị từ, cách đọc, nghĩa và một ví dụ.
- Thống kê phiên lấy từ `GET /api/v1/flashcard/stats`.
- Dữ liệu từ vựng hiện có 116 từ (Dekiru Nihongo Bài 1–7), chia theo các bài `jpd113-b1` đến `jpd123-b7`.

### 2. Tra cứu Từ điển (`/dictionary` - Issue #11)
- Endpoint: `GET /api/v1/dictionary/search?query=...` hỗ trợ tìm kiếm theo Kanji, Hiragana, Katakana, Romaji hoặc nghĩa tiếng Việt.
- Tra cứu chi tiết từ vựng: `GET /api/v1/dictionary/lookup/{id}` trả về từ, cách đọc, âm Hán Việt, câu ví dụ, âm thanh phát âm và danh sách Kanji thành phần.
- Tra cứu theo bộ thủ Kanji: `GET /api/v1/dictionary/kanji-radicals`.

### 3. Sổ tay từ vựng cá nhân (Personal Vocab Notebooks - Issue #11)
- Người học có thể tạo các sổ tay từ vựng riêng để phân loại từ: `GET /api/v1/vocab/notebooks`, `POST /api/v1/vocab/notebooks`.
- Thêm từ vào sổ tay trực tiếp từ màn Từ điển hoặc Flashcard: `POST /api/v1/vocab/notebooks/{id}/items`.
- Quản lý và xoá từ khỏi sổ tay: `DELETE /api/v1/vocab/notebooks/{id}/items/{itemId}`.

## Luồng liên quan

- UI: Trạm Flashcard (`/vocabulary`), Trạm Từ điển (`/dictionary`), Modal Thêm vào sổ tay cá nhân.
- API:
  - Flashcard: `/api/v1/flashcard/due-today`, `/api/v1/flashcard/review`, `/api/v1/flashcard/stats`
  - Từ điển: `/api/v1/dictionary/search`, `/api/v1/dictionary/lookup/{id}`, `/api/v1/dictionary/kanji-radicals`
  - Sổ tay cá nhân: `/api/v1/vocab/notebooks`

