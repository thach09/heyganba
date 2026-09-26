# Phase 5 — Thi thử, Streak, Leaderboard, Admin Panel, Polish

> **Mục tiêu:** Hoàn thiện toàn bộ platform. Thi thử mô phỏng đề thật. Streak + leaderboard tạo động lực. Admin panel quản lý nội dung không cần deploy. UX nhất quán trên tất cả trạm.

## Điều kiện hoàn thành (Definition of Done)

- [ ] Thi thử mô phỏng format đề JPD113/JPD123.
- [ ] Streak hoạt động: tính đúng, reset đúng, hiện heatmap.
- [ ] Leaderboard hiển thị đúng, theo mã lớp.
- [ ] Admin panel CRUD nội dung hoạt động (kana/kanji/vocab/grammar).
- [ ] Audit log ghi lại thay đổi nội dung.
- [ ] UX nhất quán trên 5 trạm (phím tắt, submit, feedback).
- [ ] Load test pass.

---

## Nhiệm vụ chi tiết

### 5.1 — Trạm Thi thử (Backend)

| Hạng mục | Chi tiết |
|---|---|
| **Endpoint** | `POST /api/v1/exam/generate` — tạo đề thi: chọn random câu hỏi từ pool theo bài học + loại (kana/vocab/grammar), trả `examId` + danh sách câu hỏi. |
| **Endpoint** | `POST /api/v1/exam/:examId/submit` — nộp bài: nhận toàn bộ đáp án, chấm điểm tổng, trả chi tiết đúng/sai từng câu. |
| **Endpoint** | `GET /api/v1/exam/history` — lịch sử thi của user. |
| **Endpoint** | `GET /api/v1/exam/:examId/result` — kết quả chi tiết 1 lần thi. |
| **Logic** | Format đề mô phỏng thật: phần nghe (nếu có audio), phần đọc hiểu, phần ngữ pháp, phần từ vựng. Giới hạn thời gian (tuỳ chỉnh). |
| **Database** | Migration cho bảng `mock_exams`, `exam_results`. |

### 5.2 — Trạm Thi thử (Frontend)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Giao diện thi thử dạng đề thi thật: đếm ngược thời gian, navigate giữa các câu, đánh dấu câu chưa chắc, nộp bài. |
| **Kết quả** | Sau nộp: hiện điểm tổng + chi tiết từng câu (đúng/sai/đáp án đúng/giải thích). |
| **UX** | Nút "Quay lại câu X", progress bar số câu đã trả lời, cảnh báo khi gần hết giờ. |
| **Responsive** | Phải dùng được trên mobile (đề thi dài → scroll mượt). |

### 5.3 — Streak System (Backend)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Logic tính streak: user học đủ điều kiện trong ngày (ôn ≥ X từ, hoặc làm ≥ Y bài tập) → streak +1. Không học → streak reset về 0. |
| **Endpoint** | `GET /api/v1/streak` — streak hiện tại + lịch sử (cho heatmap). |
| **Job** | `@Scheduled` job chạy đầu ngày: kiểm tra active users hôm qua, reset streak nếu không đạt điều kiện. |
| **Database** | Bảng `streaks`: `user_id`, `current_streak`, `longest_streak`, `last_active_date`. Bảng `daily_activity` (log chi tiết từng ngày cho heatmap). |

### 5.4 — Streak Heatmap (Frontend)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Hiển thị streak dạng heatmap kiểu GitHub contribution graph. Màu sắc theo mức độ hoạt động (nhạt → đậm). |
| **Thêm** | Hiện current streak + longest streak. Animation khi đạt milestone (7 ngày, 30 ngày, 100 ngày). |

### 5.5 — Mascot / Nhân vật tiến hoá

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Nhân vật (mascot) thay đổi hình dạng/trạng thái theo streak hoặc level. Ví dụ: trứng → chim non → chim lớn. |
| **Assets** | Cần thiết kế/tìm asset cho ít nhất 3–5 cấp độ. |
| **Hiển thị** | Trên dashboard chính + profile user. Animation chuyển đổi khi level up. |

### 5.6 — Leaderboard (Backend)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Redis sorted set: key `leaderboard:streak:{classCode}` hoặc `leaderboard:global`. Score = streak hoặc điểm tổng. |
| **Endpoint** | `GET /api/v1/leaderboard?class={classCode}&type={streak|score}` — top N users. |
| **Endpoint** | `GET /api/v1/leaderboard/me` — vị trí hiện tại của user trên bảng xếp hạng. |
| **Snapshot** | Nếu cần lưu lịch sử leaderboard → bảng `leaderboard_snapshot` (tuần/tháng). |

### 5.7 — Leaderboard (Frontend)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Bảng xếp hạng: top 10/20/50, highlight vị trí của user. Filter theo mã lớp. |
| **UX** | Animation khi user leo hạng. Medal/badge cho top 3. |

### 5.8 — Admin Panel (Backend)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | CRUD API cho tất cả nội dung: kana, kanji, vocabulary, grammar_rules, grammar_exercises. |
| **Endpoints** | `POST/PUT/DELETE /api/v1/admin/kana/:id`, tương tự cho kanji, vocab, grammar. |
| **Audit log** | Mỗi thao tác CRUD → ghi log: `who` (admin user_id), `what` (table + record_id), `action` (create/update/delete), `before` (JSON snapshot trước khi sửa), `after` (JSON snapshot sau), `when` (timestamp). |
| **Security** | Tất cả route `/api/v1/admin/**` chỉ ADMIN. Test riêng: user thường gọi → 403. |

### 5.9 — Admin Panel (Frontend)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Giao diện CRUD đơn giản: bảng danh sách + form thêm/sửa + nút xoá (có confirm). |
| **Ẩn/hiện** | Chỉ hiện menu Admin cho user có role ADMIN. User thường không thấy route này. |
| **UX** | Search + filter trong danh sách. Pagination. Bulk import (CSV upload) cho seed data mới. |

### 5.10 — UX Polish toàn bộ 5 trạm

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Rà soát lại UX consistency: |
| | • Phím tắt giống nhau giữa các trạm (1/2/3/4 chọn đáp án, Space lật card, Enter tiếp tục). |
| | • Cách hiển thị đúng/sai giống nhau (màu sắc, animation, vị trí). |
| | • Submit button cùng vị trí, cùng style. |
| | • Tooltip onboarding không lặp lại sau lần đầu — kiểm tra flag ở tất cả trạm. |
| | • Loading state nhất quán (skeleton, spinner). |
| | • Error state nhất quán (toast, inline message). |

### 5.11 — Load Test

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Viết load test script (k6, Artillery, hoặc JMeter). Mô phỏng: 50–100 concurrent users, mỗi user thực hiện flow đăng nhập → ôn flashcard → làm quiz → xem leaderboard. |
| **Mục tiêu** | Response time p95 < 500ms. Không lỗi 5xx. HikariCP không hết connection. Redis không timeout. |
| **Output** | Báo cáo load test + khuyến nghị tuning nếu cần. |

---

## Thứ tự thực hiện đề xuất

```
5.1 (Exam backend) + 5.3 (Streak backend) + 5.6 (Leaderboard backend) + 5.8 (Admin backend)
  ← 4 module backend có thể làm song song

5.2 (Exam UI) ← phụ thuộc 5.1
5.4 (Heatmap) + 5.5 (Mascot) ← phụ thuộc 5.3
5.7 (Leaderboard UI) ← phụ thuộc 5.6
5.9 (Admin UI) ← phụ thuộc 5.8

5.10 (UX Polish) ← làm sau khi tất cả UI xong
5.11 (Load test) ← làm cuối cùng trước khi public
```

## Rủi ro / Cần xác nhận

1. **Streak điều kiện:** Học đủ bao nhiêu mới tính 1 ngày? Đề xuất: ôn ≥ 10 từ HOẶC làm ≥ 5 bài tập HOẶC hoàn thành 1 bài thi thử.
2. **Leaderboard theo lớp:** User nhập mã lớp khi đăng ký? Hay admin gán? Cần thiết kế flow rõ.
3. **Mascot assets:** Ai thiết kế? Tự vẽ? Commission? AI generate?
4. **Load test target:** 50–100 concurrent users đủ cho giai đoạn đầu? Hosting free tier có chịu được không?
5. **Audit log retention:** Giữ bao lâu? Bao nhiêu storage?
