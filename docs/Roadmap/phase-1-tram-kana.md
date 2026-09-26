# Phase 1 — Trạm Kana (Hiragana / Katakana)

> **Mục tiêu:** User luyện được cả nhận diện (quiz trắc nghiệm) lẫn viết tay cho Hiragana và Katakana. Có audio phát âm khi bấm vào từng chữ.

## Điều kiện hoàn thành (Definition of Done)

- [x] Bảng kana tương tác hiển thị đầy đủ (gojuon + dakuten + handakuten + youon + sokuon + chōon).
- [x] Bấm vào chữ → phát audio phát âm.
- [x] Quiz nhận diện kana hoạt động (chọn đáp án đúng).
- [x] Canvas viết tay hoạt động (vẽ được, xoá được, submit được).
- [x] Onboarding tooltip hiện đúng lần đầu, không lặp lại.
- [ ] Rate limit endpoint chấm điểm.

> Ghi chú trạng thái: audio hiện dùng Web Speech API (giọng ja-JP) vì chưa có file trên Cloudflare R2 — dữ liệu đã có sẵn field `audioUrl` để chuyển sang file thật. 促音/長音 hiện nằm ở bảng "Katakana ký tự đôi" (theo nội dung đã chốt ở `content-mapping-fpt-curriculum.md`).

---

## Nhiệm vụ chi tiết

### 1.1 — Seed dữ liệu Kana

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Tạo Flyway migration seed bảng `kana`: 46 Hiragana + 46 Katakana + biến thể dakuten/handakuten, âm ghép yōon, sokuon, chōon. Thêm field `is_particle_exception` cho は/へ/を. |
| **Output** | `SELECT count(*) FROM kana` trả đúng số lượng. 3 record có `is_particle_exception = true`. |
| **Lưu ý quan trọng** | Xem `content-mapping-fpt-curriculum.md`: は/へ/を KHÔNG phải 3 ký tự riêng biệt — chỉ là 3 ký tự đọc khác khi làm trợ từ. Ghi chú nhóm dễ nhầm シ/ツ/ソ/ン để dùng ở phần luyện tập. |
| **Cần duyệt** | Người biết tiếng Nhật duyệt trước khi chuyển từ staging sang production. |

### 1.2 — API Kana

| Hạng mục | Chi tiết |
|---|---|
| **Endpoint** | `GET /api/v1/kana` — lấy tất cả, filter theo `group` (gojuon, dakuten, youon...). |
| **Endpoint** | `GET /api/v1/kana/:id` — chi tiết 1 chữ. |
| **Endpoint** | `POST /api/v1/kana/quiz/check` — chấm điểm quiz nhận diện. Body: `{ kanaId, userAnswer }`. |
| **Output** | Response theo `ApiResponse` wrapper. Quiz trả `{ correct: true/false, correctAnswer: "..." }`. |

### 1.3 — Rate Limit cho endpoint chấm điểm

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Giới hạn request `/api/v1/kana/quiz/check` — đề xuất 60 request/phút/user. |
| **Cách implement** | Bucket4j hoặc Spring Cloud Gateway rate limiter. Nếu dùng Redis thì tận dụng luôn instance đã setup. |
| **Output** | Request thứ 61 trong 1 phút → 429 Too Many Requests. |

### 1.4 — Bảng Kana tương tác (Frontend)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Hiển thị bảng kana dạng grid, tổ chức theo nhóm (gojuon, dakuten...). Bấm vào chữ → hiện thông tin chi tiết (romaji, nhóm, ghi chú nếu có) + phát audio. |
| **UX** | Tab chuyển Hiragana ↔ Katakana. Highlight nhóm dễ nhầm (シ/ツ/ソ/ン). Responsive trên mobile (grid thu nhỏ, scroll ngang nếu cần). |
| **Audio** | Lưu trên Cloudflare R2 + CDN. File mp3/ogg, đặt tên theo romaji (`a.mp3`, `ka.mp3`...). |

### 1.5 — Quiz nhận diện Kana (Frontend)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Hiện 1 chữ kana → user chọn romaji đúng từ 4 đáp án. Feedback tức thì (đúng = xanh + hiệu ứng, sai = đỏ + hiện đáp án đúng). |
| **Chế độ** | Chọn luyện theo nhóm (chỉ gojuon, chỉ dakuten...) hoặc random tất cả. |
| **Thống kê** | Hiện score ngay trên màn hình quiz: đúng/sai/tổng. |
| **Phím tắt** | 1/2/3/4 để chọn đáp án, Enter để chuyển câu tiếp. Nhất quán với pattern các trạm sau. |

### 1.6 — Canvas viết tay (Frontend)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | HTML5 Canvas để user luyện viết kana bằng chuột/touch. Nút xoá (clear), nút undo (xoá nét cuối). Hiện chữ mẫu mờ (watermark) để user viết theo. |
| **Tuỳ chọn** | Ẩn/hiện chữ mẫu. Chọn kích thước bút. |
| **Lưu ý** | Phase này chưa cần AI nhận dạng chữ viết — chỉ cần user tự so sánh với mẫu. Nhận dạng có thể thêm sau. |
| **Tái sử dụng** | Component Canvas này sẽ được dùng lại ở Phase 3 (Kanji) — thiết kế generic, nhận props `referenceChar`, `strokeOrder`, `canvasSize`. |

### 1.7 — Onboarding Tooltip

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Lần đầu user vào Trạm Kana → hiện tooltip hướng dẫn: cách dùng bảng, cách quiz, cách viết tay. |
| **UX** | Tooltip tuần tự (step 1/3, 2/3, 3/3), có nút Skip. Sau khi hoàn thành hoặc skip → lưu flag `localStorage` hoặc user preference trên server → không hiện lại. |
| **Tái sử dụng** | Component onboarding dùng chung cho các trạm sau — chỉ khác nội dung tooltip. |

---

## Thứ tự thực hiện đề xuất

```
1.1 (Seed data)
  └─→ 1.2 (API) + 1.3 (Rate limit)
        └─→ 1.4 (Bảng kana UI)
              └─→ 1.5 (Quiz) + 1.6 (Canvas viết tay)
                    └─→ 1.7 (Onboarding)
```

## Rủi ro / Cần xác nhận

1. **Audio files:** Cần nguồn audio phát âm kana. Tự thu? Dùng API TTS? Hay source miễn phí (JapanesePod101...)?
2. **Canvas viết tay:** Có cần nhận dạng AI không, hay chỉ cần user tự so sánh mẫu? (Đề xuất: chỉ so sánh mẫu ở phase này)
3. **Dữ liệu kana:** Cần người biết tiếng Nhật duyệt seed data trước khi lên production.

---

## Trạng thái triển khai (cập nhật gần nhất)

Frontend đã có UI thật cho Trạm Kana (thay cho placeholder Phase 0):

- Tab Hiragana / Katakana; mỗi bảng chia nhóm riêng: Gojūon, Dakuten, Handakuten, Yōon. Katakana có thêm 2 bảng tách riêng: **Mở rộng — tổ hợp âm cho từ mượn** (ファ / フィ / ウィ / ツォ...) và **Ký tự đôi** (促音 ッ, 長音 ー).
- Bấm chữ → phát audio + panel chi tiết (romaji, nhóm, ghi chú, ví dụ, cảnh báo nhóm dễ nhầm / trợ từ đọc khác).
- Quiz nhận diện 4 đáp án, phím tắt 1/2/3/4 + Enter, hiện score, chọn phạm vi luyện theo nhóm.
- Canvas viết tay: chữ mẫu mờ, ô ly, cỡ bút, xoá nét cuối / xoá hết, submit (chưa nhận dạng AI — đúng phạm vi phase này).
- Dữ liệu kana hiện là bảng nháp frontend `frontend/src/features/kana/kanaData.ts` (247 ký tự), chưa seed PostgreSQL.

Còn thiếu so với phase:

- Audio file trên Cloudflare R2 (hiện fallback Web Speech API ja-JP; field `audioUrl` đã có sẵn trong dữ liệu).
- API `GET /api/v1/kana`, `GET /api/v1/kana/:id`, `POST /api/v1/kana/quiz/check` (task 1.2) và rate limit (task 1.3).
- Seed Flyway bảng `kana` + cờ `is_particle_exception` (task 1.1) — chờ duyệt nội dung.
- 促音/長音 của Hiragana (っ) chưa thêm: hiện chỉ có bảng ký tự đôi cho Katakana theo yêu cầu.
