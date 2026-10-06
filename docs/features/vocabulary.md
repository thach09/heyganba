# Phiên ôn từ vựng & Tra cứu từ điển

> Trạng thái: Đã triển khai đầy đủ — bao gồm phiên Flashcard/SRS, Tra cứu từ điển tiếng Nhật và Sổ tay từ vựng cá nhân (Issue #11).

## Hành vi hiện tại

### 1. Phiên Flashcard / SRS
- Phiên ôn lấy từ đến hạn và từ mới qua `GET /api/v1/flashcard/due-today`.
- Câu hỏi trắc nghiệm hỏi nghĩa tiếng Việt hoặc cách đọc; từ thuần Kana luôn hỏi nghĩa.
- Nếu phiên không đủ đáp án nhiễu phù hợp, giao diện chuyển sang tự đánh giá.
- Trả lời đúng gửi `GOOD`, sai gửi `FORGOT` qua `POST /api/v1/flashcard/review`; phần kết quả hiển thị từ, cách đọc, nghĩa và một ví dụ.
- Thống kê phiên lấy từ `GET /api/v1/flashcard/stats`.
- Giáo trình có 116 từ, được kiểm chứng và duyệt qua migration. Phát âm bằng cách đọc kana qua TTS dùng chung. Mục JMdict lưu vào sổ không đi vào pool SRS hoặc ngân hàng thi của giáo trình.

### 2. Tra cứu Từ điển (`/dictionary` - Issue #11)
- Endpoint: `GET /api/v1/dictionary/search?q=...&page=0` (alias `query`) tìm kanji, hiragana, katakana, romaji, nghĩa Việt của giáo trình và nghĩa Anh của JMdict. Catalog có 218.867 mục trong snapshot 06/10/2026, 40 kết quả/trang, `hasMore` cho tải tiếp, kết quả chính xác được ưu tiên. Ký tự `%`/`_` được tìm như văn bản.
- `GET /api/v1/dictionary/lookup/{id}` trả từ và kanji thành phần đã duyệt. ID âm là mục JMdict, ID dương là từ giáo trình. Nghĩa Anh được ghi rõ, không giả làm bản dịch Việt. Mục ngoài giáo trình không có Hán Việt hoặc ví dụ tự bịa.
- Nguồn [JMdict / EDRDG](https://www.edrdg.org/jmdict/j_jmdict.html), dữ liệu [CC BY-SA 4.0](https://www.edrdg.org/edrdg/licence.html). Snapshot có hash và repeatable Flyway refresh; workflow hằng tháng chuẩn bị bản cập nhật để review. Phát âm dùng TTS theo `reading`.
- Tra cứu theo bộ thủ Kanji: `GET /api/v1/dictionary/kanji-radicals`.

### 3. Sổ tay từ vựng cá nhân (Personal Vocab Notebooks - Issue #11)
- Người học có thể tạo các sổ tay từ vựng riêng để phân loại từ: `GET /api/v1/vocab/notebooks`, `POST /api/v1/vocab/notebooks`.
- Thêm từ từ màn Từ điển: `POST /api/v1/vocab/notebooks/{id}/items`. `/notebooks` là alias cùng chức năng. Luồng sổ đầu tiên cho phép tạo sổ rồi tiếp tục lưu từ.
- Xoá từ: `DELETE /api/v1/vocab/notebooks/{id}/items/{vocabularyId}` (ID từ vựng đã lưu, không phải ID item).
- Có 7 nhóm mẫu từ giáo trình đã duyệt; nhận bản sao qua `/notebooks/clone-sample/{id}`.
- Luyện nghĩa/cách đọc, phím 1–4/Enter. `POST /notebooks/{id}/practice-result` nhận `sessionId` UUID và đáp án từng từ (`vocabularyId`, `kind`, `answer`), chấm ở server, không nhận số câu đúng do client khai báo. Retry cùng session không cộng EXP hai lần.
- Từng từ cá nhân có số lần luyện, số lần đúng và thời điểm gần nhất. Phiên sổ từ không đổi lịch SRS. Cần ít nhất hai đáp án phân biệt để luyện trắc nghiệm; mỗi phiên tối đa 200 từ.

## Luồng liên quan

- UI: Trạm Flashcard (`/vocabulary`), Trạm Từ điển (`/dictionary`), Modal Thêm vào sổ tay cá nhân.
- API:
  - Flashcard: `/api/v1/flashcard/due-today`, `/api/v1/flashcard/review`, `/api/v1/flashcard/stats`
  - Từ điển: `/api/v1/dictionary/search`, `/api/v1/dictionary/lookup/{id}`, `/api/v1/dictionary/kanji-radicals`
  - Sổ tay cá nhân: `/api/v1/vocab/notebooks`

