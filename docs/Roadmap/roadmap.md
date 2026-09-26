# Japanese Learning Platform — Kế hoạch Phát triển (Development Roadmap)

## Tổng quan

**Mục tiêu:** Xây dựng web học tiếng Nhật theo giáo trình Dekiru (JPD113/JPD123 – FPT University), gồm 5 trạm chức năng, có streak, có phân quyền Admin/User, thiết kế để scale cho lượng user thực tế lớn.

**Nguyên tắc xuyên suốt mọi phase:**
- UX/UI phải thân thiện — user quen thao tác sau 1-2 lần dùng, không phải mò mẫm.
- Thao tác nhất quán giữa các trạm (phím tắt, nút submit, cách phản hồi đúng/sai giống nhau).
- Nội dung tiếng Nhật (kana/kanji/từ vựng/ngữ pháp) phải được người biết tiếng Nhật duyệt trước khi đưa vào dữ liệu chính thức.

**Tech stack:**

| Layer | Lựa chọn |
|---|---|
| Backend | Spring Boot (Java), REST API `/api/v1/`, JWT qua Spring Security |
| Frontend | React + Vite + TypeScript |
| Database | PostgreSQL (managed) + Flyway migration |
| Cache/Queue nhẹ | Redis (SRS due-queue, leaderboard streak) |
| Lưu trữ media | Cloudflare R2 (audio phát âm) + CDN |
| CI/CD | Docker + GitHub Actions |
| Hosting | Render (backend) + Vercel (frontend) |

**Phân quyền:** `role` = `ADMIN` | `USER`, kiểm soát theo route ở tầng Spring Security.

---

## Phase 0 — Nền tảng & Hạ tầng

**Backend**
- Khởi tạo project Spring Boot, cấu hình `/api/v1/`, Spring Profiles theo môi trường.
- Thiết lập JWT auth, entity `User` có sẵn field `role` (ADMIN/USER) ngay từ đầu.
- `ApiResponse` wrapper chuẩn hoá response.

**Frontend**
- Khởi tạo React + Vite + TS, cấu trúc thư mục theo từng trạm (routes riêng biệt).
- Layout khung: Dashboard chính + điều hướng 5 trạm + khu vực Admin (ẩn với user thường).
- Component dùng chung: nút submit, hệ thống thông báo đúng/sai, tooltip onboarding.

**Database**
- Schema lõi: `users`, `roles`, `kana`, `kanji`, `vocabulary`, `grammar_rules`, `srs_reviews`, `streaks`, `lessons` (map theo bài Dekiru).
- Flyway migration cho toàn bộ schema lõi.
- Index `srs_reviews(user_id, due_date)` ngay từ đầu để tránh full scan khi tính "từ cần ôn hôm nay".

**Security**
- CORS chặt theo domain frontend.
- HikariCP tuning cho hosting free/starter tier.
- BCrypt cho mật khẩu, seed data admin ban đầu qua migration (không hardcode trong code).
- Route `/api/v1/admin/**` chỉ ADMIN truy cập được, test riêng cho việc phân quyền sai.

**Hoàn thành khi:** Đăng ký/đăng nhập chạy được, phân quyền Admin/User hoạt động đúng, CI/CD deploy tự động lên staging.

---

## Phase 1 — Trạm Kana (Hiragana/Katakana)

**Backend**
- Endpoint lấy danh sách kana theo nhóm (gojuon, dakuten, youon...).
- Endpoint chấm điểm quiz nhận diện.

**Frontend**
- Bảng kana tương tác (âm thanh khi bấm vào từng chữ).
- Canvas viết tay (HTML5 canvas) để luyện viết, không chỉ nhận diện trắc nghiệm.
- Onboarding tooltip lần đầu vào trạm.

**Database**
- Bảng `kana` (chữ, romaji, nhóm, thứ tự nét viết nếu có).

**Security**
- Rate limit endpoint chấm điểm để tránh spam request.

**Hoàn thành khi:** User luyện được cả nhận diện lẫn viết tay cho Hiragana và Katakana.

---

## Phase 2 — Trạm Flashcard Từ vựng + SRS Engine

**Backend**
- Engine SRS (SM-2 rút gọn): tính lại `due_date` mỗi lần user trả lời đúng/sai.
- Endpoint "từ cần ôn hôm nay" — đọc từ Redis cache trước, fallback Postgres.
- Job định kỳ (`@Scheduled`) đồng bộ cache Redis với DB.

**Frontend**
- Giao diện flashcard lật thẻ, chỉ hiện "X từ cần ôn hôm nay" — ẩn hoàn toàn logic thuật toán.
- Feedback tức thì (màu sắc/âm thanh nhẹ) khi trả lời.

**Database**
- Bảng `vocabulary` (map theo `lesson_id` của Dekiru), `srs_reviews` (trạng thái SRS từng user-từ).

**Security**
- Đảm bảo user chỉ đọc/ghi được review của chính mình (kiểm tra `user_id` ở tầng service, không chỉ dựa vào frontend).

**Hoàn thành khi:** SRS chạy đúng logic giãn cách, Redis cache giảm tải rõ rệt cho Postgres.

---

## Phase 3 — Trạm Kanji

**Backend**
- Endpoint tra kanji theo bài học, theo bộ thủ.
- Endpoint lưu tiến độ luyện viết kanji.

**Frontend**
- Hiển thị bộ thủ + mnemonic + Hán Việt + nghĩa.
- Canvas luyện viết kanji (tái dùng component từ Phase 1).

**Database**
- Bảng `kanji`, `radicals`, quan hệ `kanji_radicals`, map `kanji` với `lesson_id`.

**Security**
- Không có yêu cầu đặc thù ngoài kiểm tra quyền ghi tiến độ đúng user.

**Hoàn thành khi:** Kanji hiển thị đúng thứ tự theo từng bài JPD113/JPD123, không theo độ khó ngẫu nhiên.

---

## Phase 4 — Trạm Trợ từ & Ngữ pháp

**Backend**
- Endpoint bài tập điền khuyết, chấm điểm theo rule ngữ pháp.
- Module riêng cho bẫy は/へ/を (trợ từ đọc khác âm gốc).

**Frontend**
- Giao diện điền khuyết câu, có thể nghe audio trước khi chọn đáp án.

**Database**
- Bảng `grammar_rules`, `grammar_exercises`, bảng riêng đánh dấu exercise thuộc nhóm "bẫy thường gặp".

**Security**
- Validate input phía server (không tin kết quả chấm điểm từ client).

**Hoàn thành khi:** Có bộ bài tập riêng cho nhóm lỗi phổ biến nhất theo tài liệu tham khảo.

---

## Phase 5 — Trạm Thi thử, Streak, Leaderboard, Admin Panel, Polish

**Backend**
- Endpoint thi thử mô phỏng format đề JPD113/JPD123.
- Streak: cập nhật khi user học đủ điều kiện trong ngày, reset qua job định kỳ.
- Leaderboard: Redis sorted set theo streak/điểm, theo mã lớp.
- Admin API: CRUD nội dung (kana/kanji/vocab/grammar), không cần deploy lại khi sửa nhỏ.

**Frontend**
- Trạm thi thử dạng đề thi thật.
- Streak hiển thị dạng heatmap kiểu GitHub contribution graph.
- Mascot/nhân vật tiến hoá theo streak/level.
- Admin panel: giao diện CRUD đơn giản, chỉ hiện với role ADMIN.
- Rà soát UX toàn bộ 5 trạm: đảm bảo thao tác nhất quán, tooltip onboarding không lặp lại sau lần đầu.

**Database**
- Bảng `mock_exams`, `exam_results`, `leaderboard_snapshot` (nếu cần lưu lịch sử ngoài Redis).

**Security**
- Admin panel: audit log các thay đổi nội dung (ai sửa, sửa gì, khi nào).
- Load test trước khi public để xác nhận cấu hình HikariCP/Redis chịu được tải dự kiến.

**Hoàn thành khi:** Toàn bộ 5 trạm hoạt động nhất quán, admin sửa nội dung không cần deploy, hệ thống qua load test cơ bản, sẵn sàng public.

---

## Ghi chú vận hành sau launch

- Theo dõi tải thực tế qua Render metrics; nâng cấp plan hoặc bật autoscale trước khi cân nhắc hạ tầng phức tạp hơn (Kubernetes).
- Thêm bài học mới (Dekiru bài tiếp theo): chỉ cần migration mới, không cần sửa code logic.
- Sửa lỗi nội dung nhỏ (chính tả, nghĩa sai): dùng Admin panel, không cần qua CI/CD.
