# Phase 3 — Trạm Kanji

> **Mục tiêu:** Kanji hiển thị đúng thứ tự theo từng bài JPD113/JPD123 (không theo độ khó ngẫu nhiên). User tra cứu theo bộ thủ, xem mnemonic + Hán Việt, và luyện viết.

## Điều kiện hoàn thành (Definition of Done)

- [ ] Kanji hiển thị theo đúng bài học (jpd113-b1 → jpd123-b7).
- [ ] Tra cứu theo bộ thủ hoạt động.
- [ ] Hiển thị đầy đủ: bộ thủ + mnemonic + Hán Việt + nghĩa + onyomi/kunyomi.
- [ ] Canvas luyện viết kanji hoạt động (tái dùng từ Phase 1).
- [ ] Tiến độ luyện viết lưu đúng user.

---

## Nhiệm vụ chi tiết

### 3.1 — Seed dữ liệu Kanji + Bộ thủ

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Tạo Flyway migration seed: bảng `kanji` (chữ, onyomi, kunyomi, Hán Việt, nghĩa, mnemonic, `lesson_id`), bảng `radicals` (bộ thủ, tên, nghĩa), bảng liên kết `kanji_radicals`. |
| **Ghi chú** | Chỉ seed kanji theo bài JPD113/JPD123 — KHÔNG tải nguyên bộ Jōyō 2136 chữ. Giữ cả 2 cách đọc onyomi/kunyomi, ghi chú cách đọc nào dùng khi đứng riêng / khi ghép từ. |
| **Cần duyệt** | Nghĩa Hán Việt và cách đọc onyomi/kunyomi — đưa vào staging trước, người biết tiếng Nhật duyệt. |

### 3.2 — API Kanji

| Hạng mục | Chi tiết |
|---|---|
| **Endpoint** | `GET /api/v1/kanji?lesson={lessonId}` — lấy kanji theo bài học. |
| **Endpoint** | `GET /api/v1/kanji?radical={radicalId}` — lấy kanji theo bộ thủ. |
| **Endpoint** | `GET /api/v1/kanji/:id` — chi tiết 1 kanji (kèm bộ thủ, từ vựng liên quan). |
| **Endpoint** | `GET /api/v1/radicals` — danh sách tất cả bộ thủ. |
| **Endpoint** | `POST /api/v1/kanji/:id/progress` — lưu tiến độ luyện viết: `{ userId, practiceCount, lastPracticedAt }`. |
| **Security** | Kiểm tra `user_id` ở tầng service cho endpoint lưu tiến độ — user chỉ ghi được progress của chính mình. |

### 3.3 — Trang tra cứu Kanji (Frontend)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Danh sách kanji theo bài học (tab/dropdown chọn bài). Bấm vào kanji → hiện chi tiết: bộ thủ, mnemonic, Hán Việt, nghĩa, onyomi/kunyomi, ghi chú cách đọc, từ vựng liên quan. |
| **Filter** | Theo bài học, theo bộ thủ, thanh search (tìm theo nghĩa hoặc Hán Việt). |
| **UX** | Card kanji dạng grid. Hover → preview nhanh. Click → modal/page chi tiết. |

### 3.4 — Canvas luyện viết Kanji (Frontend)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Tái dùng component Canvas từ Phase 1. Truyền props: `referenceChar` = kanji cần viết, `strokeOrder` = thứ tự nét (nếu có data), `canvasSize` = lớn hơn kana. |
| **Thêm** | Hiện thứ tự nét (stroke order animation) trước khi user viết — dùng SVG animation hoặc gif. |
| **Ghi tiến độ** | Sau khi luyện → gọi API lưu progress. Hiện số lần đã luyện cho mỗi kanji. |

### 3.5 — Stroke Order Data

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Tìm nguồn stroke order data cho kanji trong phạm vi bài học. Đề xuất: [KanjiVG](https://kanjivg.tagaini.net/) (Creative Commons). |
| **Format** | SVG path cho từng nét, đánh số thứ tự. Lưu trong DB hoặc file tĩnh trên CDN. |
| **Ghi chú** | Nếu chưa có data stroke order → cho phép user luyện viết tự do (không có animation hướng dẫn). Thêm stroke order sau. |

---

## Thứ tự thực hiện đề xuất

```
3.1 (Seed kanji + radicals)
  └─→ 3.2 (API endpoints)
        ├─→ 3.3 (Tra cứu UI)
        └─→ 3.5 (Stroke order data)
              └─→ 3.4 (Canvas viết kanji)
```

## Rủi ro / Cần xác nhận

1. **Stroke order data:** Nguồn nào? KanjiVG miễn phí nhưng cần verify license cho commercial use.
2. **Mnemonic:** Ai viết mnemonic? Tự sáng tạo hay dùng nguồn có sẵn? Mnemonic tốt là yếu tố then chốt để user nhớ kanji.
3. **Kanji data:** Cần người biết tiếng Nhật duyệt cách đọc + Hán Việt trước khi lên production.
