# Phase 2 — Trạm Flashcard Từ vựng + SRS Engine

> **Mục tiêu:** User ôn từ vựng theo thuật toán SRS (giãn cách lặp lại). Hệ thống tự tính "hôm nay cần ôn bao nhiêu từ" và chỉ hiện đúng số đó. Redis cache giảm tải cho Postgres.

## Điều kiện hoàn thành (Definition of Done)

- [ ] SRS engine chạy đúng logic SM-2 rút gọn (giãn cách tăng dần khi trả lời đúng, reset khi sai).
- [ ] Endpoint "từ cần ôn hôm nay" trả đúng danh sách.
- [ ] Redis cache hoạt động — đọc từ cache trước, fallback Postgres.
- [ ] Job đồng bộ cache chạy đúng lịch.
- [ ] Giao diện flashcard lật thẻ hoạt động.
- [ ] User chỉ truy cập được review của chính mình.

---

## Nhiệm vụ chi tiết

### 2.1 — Seed dữ liệu Từ vựng

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Tạo Flyway migration seed bảng `vocabulary`, gán theo `lesson_id` (jpd113-b1 → jpd123-b7). |
| **Nguồn** | Tham khảo `content-mapping-fpt-curriculum.md`. KHÔNG copy nguyên văn — viết lại ví dụ, tự chọn cách trình bày. Ghi rõ nguồn tham khảo trong migration script. |
| **Cần duyệt** | Đưa vào bảng staging trước. Người biết tiếng Nhật duyệt xong mới chuyển production. |

### 2.2 — SRS Engine (SM-2 rút gọn)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Implement thuật toán SM-2 rút gọn trong service layer. Input: `quality` (0–5, hoặc đơn giản hoá thành đúng/sai/khó). Output: `next_due_date`, `interval`, `ease_factor`. |
| **Bảng liên quan** | `srs_reviews`: `user_id`, `vocabulary_id`, `ease_factor`, `interval`, `repetitions`, `due_date`, `last_reviewed_at`. |
| **Test bắt buộc** | Unit test các case: trả lời đúng liên tiếp → interval tăng dần. Trả lời sai → reset interval. Edge case: ease_factor không giảm dưới 1.3. |

### 2.3 — API Flashcard + SRS

| Hạng mục | Chi tiết |
|---|---|
| **Endpoint** | `GET /api/v1/flashcard/due-today` — danh sách từ cần ôn hôm nay cho user đang login. |
| **Endpoint** | `POST /api/v1/flashcard/review` — submit kết quả ôn: `{ vocabularyId, quality }`. Trả về thông tin SRS mới (next due date). |
| **Endpoint** | `GET /api/v1/flashcard/stats` — thống kê: tổng từ đã học, từ cần ôn hôm nay, streak ôn tập. |
| **Security** | Service layer kiểm tra `user_id` từ JWT — user KHÔNG thể xem/sửa review của người khác. Test riêng cho case này. |

### 2.4 — Redis Cache Layer

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Cache danh sách "từ cần ôn hôm nay" cho mỗi user trên Redis. Key: `srs:due:{userId}`. TTL: hết ngày hiện tại. |
| **Flow** | `GET /due-today` → đọc Redis trước. Cache miss → query Postgres → ghi vào Redis → trả response. `POST /review` → update Postgres + invalidate cache key. |
| **Ghi chú** | Redis instance dùng chung với leaderboard (Phase 5). Cấu hình connection pool phù hợp free tier. |

### 2.5 — Job đồng bộ Cache

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | `@Scheduled` job chạy mỗi 00:05 (5 phút sau nửa đêm) — rebuild cache "due today" cho tất cả active users. |
| **Lý do** | SRS due date tính theo ngày. Qua ngày mới → cache cũ không còn chính xác. |
| **Fallback** | Nếu job fail → endpoint vẫn hoạt động bình thường (fallback Postgres). Log error để monitor. |

### 2.6 — Giao diện Flashcard (Frontend)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Card lật (flip animation): mặt trước hiện từ tiếng Nhật, mặt sau hiện nghĩa + phiên âm + ví dụ. |
| **UX** | Hiện "X từ cần ôn hôm nay" ở đầu trang. Ẩn hoàn toàn logic SRS — user chỉ thấy card và nút đánh giá. |
| **Nút đánh giá** | Sau khi lật: "Dễ" / "Được" / "Khó" / "Quên" — map sang quality score gửi lên API. |
| **Feedback** | Màu sắc + animation nhẹ khi chọn đánh giá. Âm thanh nhẹ (tuỳ chọn bật/tắt). |
| **Phím tắt** | Space = lật card, 1/2/3/4 = chọn mức đánh giá. Nhất quán với pattern các trạm khác. |

### 2.7 — Empty State & Progress

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Khi không có từ cần ôn → hiện thông báo "Bạn đã ôn xong hôm nay! 🎉" + gợi ý học từ mới hoặc luyện trạm khác. |
| **Progress bar** | Hiện tiến độ ôn: "12/20 từ đã ôn hôm nay". |

---

## Thứ tự thực hiện đề xuất

```
2.1 (Seed vocabulary data)
  └─→ 2.2 (SRS Engine logic)
        └─→ 2.3 (API endpoints)
              ├─→ 2.4 (Redis cache) + 2.5 (Scheduled job)
              └─→ 2.6 (Flashcard UI) + 2.7 (Empty state)
```

## Rủi ro / Cần xác nhận

1. **SM-2 variant:** Dùng SM-2 nguyên bản hay rút gọn (3–4 mức thay vì 6)? Đề xuất: 4 mức (Dễ/Được/Khó/Quên).
2. **Redis hosting:** Free tier Redis có đủ memory cho giai đoạn đầu không? Render Redis starter = 25MB — đủ cho vài trăm user.
3. **Vocabulary data:** Cần người biết tiếng Nhật duyệt trước khi lên production.
