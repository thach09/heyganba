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

---

## Trạng thái triển khai (cập nhật gần nhất)

**Đã xong:**

- Seed `V8__seed_grammar_rules.sql`: **32 điểm ngữ pháp** — 17 điểm JPD113 (bài 1–3) + 15 mục JPD123 (bài 4–7),
  **giữ đúng `original_number` của tài liệu gốc: nhảy từ 5 sang 7 (không có mục 6)** để đối chiếu ngược lại nguồn.
- Seed `V9__seed_grammar_exercises.sql`: **64 bài tập** (2 câu/điểm), trong đó **29 câu gắn `is_common_mistake = TRUE`**
  với `mistake_category` (`particle-ha`, `particle-he`, `particle-wo`, `counter-time`, `counter-date`, `adjective-i`,
  `adjective-na`, `te-form`, `comparison`, `verb-tai`, `polite-negative`, `particle-ga`, `particle-de`, `transport`).
- API: `GET /grammar/rules` (lọc `lesson`), `GET /grammar/rules/{id}`, `GET /grammar/exercises` (lọc `ruleId`, `mistakeOnly`),
  `POST /grammar/exercises/{id}/check` (chấm điểm phía server, chuẩn hoá Unicode + trim, rate limit 120/phút/user).
- **Không lộ đáp án**: DTO trả cho UI cố tình bỏ `correctAnswer`/`explanation`; đáp án chỉ về sau khi gọi endpoint check
  (có test `exercisesDoNotLeakCorrectAnswer` để chốt hành vi này).
- Seed `V12__expand_grammar_exercises.sql` (**staging-only**): **+96 bài tập**, trong đó **46 câu gắn `is_common_mistake = TRUE`**.
- Seed `V14__expand_trap_exercises.sql` (**staging-only**): **+146 câu cho nhóm bẫy** để **mọi nhóm đều ≥ 10 câu**.
  Lưu ý: taxonomy thực tế hiện có **22 nhóm bẫy** (tài liệu giai đoạn đầu ghi 14 vì lúc đó mới có 14 giá trị
  `mistake_category`); V14 nâng cả 22 nhóm lên ≥10. Tổng bài tập: **306 câu / 32 điểm**, trong đó **221 câu gắn cờ bẫy**.
- **Gate "chờ duyệt nội dung tiếng Nhật" (V13)**: cột `review_status` (mặc định `PENDING_REVIEW`) cho
  `kana`, `vocabulary`, `kanji`, `grammar_rules`, `grammar_exercises`; API `GET /content/review-status` trả số bản ghi
  chờ duyệt theo từng loại + danh sách migration**staging-only** (`V12`, `V14`); `GrammarView` hiện banner + badge
  "chờ duyệt"; DTO ngữ pháp trả `reviewStatus`.
- **Nội dung chờ duyệt KHÔNG lên production**: Flyway local/staging đọc
  `classpath:db/migration,classpath:db/migration-staging`, còn `application-prod.yml` chỉ đọc `classpath:db/migration`
  (promote = chuyển file sang `db/migration` sau khi review). Có guard test `FlywayLocationsConfigTest`.
- **Đánh số ngữ pháp liên tục (V11)**: UI hiển thị số 1..32 theo đúng thứ tự dạy; số gốc của tài liệu (có khoảng trống 5→7)
  được giữ nội bộ ở `grammar_rules.source_ref` (dạng `doc:#N`) và **không trả ra API** — có test
  `listRulesUsesContinuousNumbering` chốt việc không lộ `sourceRef`/`originalNumber`.
- Frontend `GrammarView`: chọn bài học, bật lọc "Chỉ nhóm bẫy thường gặp", danh sách điểm ngữ pháp kèm **số thứ tự liên tục**,
  luyện điền khuyết 4 lựa chọn với phím 1/2/3/4 + Enter, hiện giải thích sau khi chấm, đếm đúng/tổng.
- Mỗi câu bài tập chấm xong được ghi vào `study_activities` (nguồn `GRAMMAR`) → tính vào streak heatmap và ngưỡng streak
  (≥10 câu/ngày). ⚠️ `GrammarService.checkAnswer` là transaction **ghi** — nếu ai đổi thành `readOnly = true` thì PostgreSQL
  chặn INSERT và endpoint trả 500 (test H2 không bắt được); có guard test `checkAnswerMustStayWritableTransaction`.
- Test: `GrammarApiTest` 9 case (numbering liên tục, lọc bài, chi tiết 404, không lộ đáp án, lọc nhóm bẫy, chấm đúng/sai,
  validate, 401, guard transaction readOnly).

**Còn thiếu / cần xác nhận:**

- **Duyệt nội dung tiếng Nhật**: toàn bộ 306 câu + 32 điểm ngữ pháp vẫn ở trạng thái `PENDING_REVIEW`; **V12/V14 chỉ
  chạy ở local/staging**, chưa promote lên production. Promote khi nào duyệt xong (xem deployment-plan → "Gate nội dung chưa duyệt").
- Nhóm bẫy hiện 22 nhóm × ≥10 câu (221 câu), phân bố không đều (nhóm nhiều nhất 14 câu) — nếu muốn mỗi nhóm đúng chuẩn
  ≥10 câu cho từng chủ đề nhỏ hơn thì cần tách taxonomy chi tiết hơn.
- Audio cho bài tập chưa có (schema đã có sẵn `grammar_exercises.audio_url`).
