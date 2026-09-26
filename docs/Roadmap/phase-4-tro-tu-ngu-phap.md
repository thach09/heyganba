# Phase 4 — Trạm Trợ từ & Ngữ pháp

> **Mục tiêu:** Có bộ bài tập điền khuyết cho ngữ pháp, đặc biệt ưu tiên nhóm lỗi phổ biến nhất (bẫy は/へ/を, số đếm biến âm, phân biệt trợ từ). Chấm điểm server-side, không tin client.

## Điều kiện hoàn thành (Definition of Done)

- [ ] Có bộ bài tập riêng cho nhóm lỗi phổ biến nhất theo `content-mapping-fpt-curriculum.md`.
- [ ] Bài tập điền khuyết hoạt động + chấm điểm đúng.
- [ ] Module bẫy は/へ/を hoạt động riêng.
- [ ] Audio nghe trước khi chọn đáp án (nếu bài tập liên quan listening).
- [ ] Server validate input — không tin kết quả từ client.

---

## Nhiệm vụ chi tiết

### 4.1 — Seed dữ liệu Ngữ pháp + Bài tập

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Tạo Flyway migration seed: bảng `grammar_rules` (17 điểm ngữ pháp JPD113 + các mục JPD123), bảng `grammar_exercises` (câu điền khuyết, đáp án đúng, đáp án sai, giải thích). |
| **Numbering** | Giữ nguyên numbering gốc tài liệu (nhảy từ 5 sang 7, không có mục 6) trong metadata — để dễ đối chiếu nguồn. |
| **Bẫy thường gặp** | Tạo bảng/flag `common_mistakes` liên kết với `grammar_rules`/`kana`. Nhóm bẫy ưu tiên (xem mục 4.4). |
| **Cần duyệt** | Toàn bộ câu ví dụ, đáp án, giải thích — staging trước, duyệt rồi mới production. |

### 4.2 — API Ngữ pháp + Bài tập

| Hạng mục | Chi tiết |
|---|---|
| **Endpoint** | `GET /api/v1/grammar?lesson={lessonId}` — danh sách điểm ngữ pháp theo bài. |
| **Endpoint** | `GET /api/v1/grammar/:id` — chi tiết 1 điểm ngữ pháp (công thức, ví dụ, ghi chú). |
| **Endpoint** | `GET /api/v1/grammar/exercises?lesson={lessonId}&type={trap|all}` — lấy bài tập. `type=trap` = chỉ nhóm bẫy. |
| **Endpoint** | `POST /api/v1/grammar/exercises/check` — chấm điểm: `{ exerciseId, userAnswer }`. Server so sánh với đáp án đúng, trả `{ correct, correctAnswer, explanation }`. |
| **Security** | Validate input phía server. Đáp án đúng KHÔNG gửi về client trước khi user trả lời. Rate limit endpoint chấm điểm. |

### 4.3 — Chấm điểm Server-side

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Logic chấm điểm trong service layer. Hỗ trợ nhiều loại câu hỏi: chọn trợ từ đúng, điền từ, chọn dạng chia động từ đúng. |
| **Normalize** | Trước khi so sánh: trim whitespace, normalize Unicode (NFC), bỏ qua full-width/half-width difference. |
| **Partial match** | Cân nhắc chấp nhận đáp án gần đúng (thiếu dấu chấm, thừa space) — tuỳ loại bài. |

### 4.4 — Module Bẫy thường gặp

| Hạng mục | Chi tiết |
|---|---|
| **Nhóm bẫy** | Theo `content-mapping-fpt-curriculum.md`: |
| | • 3 trợ từ đọc khác (は → wa, へ → e, を → o) |
| | • Số đếm biến âm: ngày 14/20/24 (đổi hẳn từ), ngày 17/19/27/29 (đổi cách đọc), giờ 4/7/9, phút ふん/ぷん, tuổi っさい + ngoại lệ 20 tuổi, tầng biến âm |
| | • Phân biệt trợ từ liệt kê đầy đủ vs liệt kê ví dụ |
| **Việc cần làm** | Tạo bài tập riêng cho từng nhóm bẫy. Gắn flag `is_common_mistake` trên exercise. Có thể truy cập riêng qua filter `type=trap`. |
| **UX đề xuất** | Hiện icon cảnh báo bên cạnh bài tập thuộc nhóm bẫy. Giải thích chi tiết tại sao đây là bẫy sau khi user trả lời. |

### 4.5 — Giao diện Bài tập (Frontend)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Giao diện điền khuyết câu: hiện câu tiếng Nhật với chỗ trống (____), user chọn/điền đáp án. |
| **Audio** | Nút nghe audio câu hỏi trước khi chọn đáp án (nếu bài liên quan listening). Audio lưu R2 + CDN. |
| **Feedback** | Đúng → xanh + giải thích ngắn. Sai → đỏ + hiện đáp án đúng + giải thích tại sao. |
| **Phím tắt** | 1/2/3/4 chọn đáp án, Enter tiếp tục. Nhất quán với các trạm khác. |
| **Filter** | Chọn bài học, chọn loại (tất cả / chỉ bẫy), chọn số câu muốn luyện. |

### 4.6 — Trang tổng hợp Ngữ pháp (Frontend)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Danh sách điểm ngữ pháp theo bài. Bấm vào → chi tiết: công thức, ví dụ, ghi chú, bài tập liên quan. |
| **UX** | Dạng accordion hoặc card list. Highlight điểm ngữ pháp có bẫy. Link nhanh "Luyện bài tập cho điểm ngữ pháp này". |

---

## Thứ tự thực hiện đề xuất

```
4.1 (Seed grammar + exercises)
  └─→ 4.2 (API endpoints) + 4.3 (Chấm điểm logic)
        └─→ 4.4 (Module bẫy thường gặp)
              └─→ 4.5 (Bài tập UI) + 4.6 (Tổng hợp ngữ pháp UI)
```

## Rủi ro / Cần xác nhận

1. **Bài tập:** Ai viết câu hỏi + đáp án? Agent tạo draft → người biết tiếng Nhật duyệt? Hay Thach tự viết?
2. **Số lượng bài tập:** Cần bao nhiêu câu mỗi điểm ngữ pháp? Đề xuất: tối thiểu 5 câu/điểm, nhóm bẫy cần 10+ câu.
3. **Audio cho bài tập:** Nguồn audio? TTS hay thu riêng?
