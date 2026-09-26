# Deployment Plan — Japanese Learning Platform (DevOps)

## Môi trường

| Môi trường | Mục đích | Ghi chú |
|---|---|---|
| Local | Dev hàng ngày | Docker Compose: backend + Postgres + Redis chạy local, không phụ thuộc cloud |
| Staging | Test trước khi lên production | Deploy tự động mỗi khi merge vào `develop`, dữ liệu là bản sao/dữ liệu giả, nơi duyệt nội dung tiếng Nhật trước khi đẩy chính thức |
| Production | Phục vụ user thật | Deploy khi merge vào `main`, có thêm bước duyệt thủ công (manual approval) trước khi chạy migration DB |

## Hạ tầng

- **Backend:** Spring Boot đóng gói Docker image, deploy trên Render (Web Service).
- **Frontend:** React + Vite build tĩnh, deploy trên Vercel, hưởng CDN edge sẵn có.
- **Database:** PostgreSQL managed (Render Postgres hoặc Neon) — bật daily backup tự động, retention tối thiểu 7 ngày.
- **Cache:** Redis managed (Render Redis hoặc Upstash) cho hàng đợi SRS và leaderboard.
- **Media:** Audio phát âm lưu Cloudflare R2, phục vụ qua CDN, không đi qua backend.
- **DNS/HTTPS:** Domain trỏ qua Cloudflare, TLS tự động (Let's Encrypt qua Render/Vercel), bật HSTS.

## CI/CD (GitHub Actions)

Pipeline theo 4 bước, chạy cho mọi PR và mọi lần merge:
1. **Build & lint** — biên dịch backend, build frontend, chạy linter, fail sớm nếu lỗi cú pháp/style.
2. **Test tự động** — unit test backend (đặc biệt logic SRS, tính điểm, phân quyền), test frontend cho component dùng chung.
3. **Migration check** — chạy Flyway ở môi trường test để đảm bảo migration mới không phá schema cũ; không cho merge nếu migration lỗi.
4. **Deploy** — staging tự động sau khi merge `develop`; production cần duyệt thủ công (GitHub Environment protection rule) trước khi chạy, đặc biệt cho migration ảnh hưởng bảng có dữ liệu user thật.

## Quản lý secrets & cấu hình

- Không commit secrets vào repo dưới bất kỳ hình thức nào (kể cả file `.env` mẫu chứa giá trị thật).
- Dùng biến môi trường qua secret manager của Render/Vercel/GitHub Actions, phân biệt rõ theo từng môi trường (staging khác production).
- Xoay vòng (rotate) JWT signing key và các API key định kỳ, đặc biệt sau khi có nhân sự rời dự án hoặc nghi ngờ rò rỉ.

## Giám sát & vận hành

- **Uptime & error tracking:** bật health-check endpoint cho backend, tích hợp công cụ theo dõi lỗi (vd Sentry) để bắt exception ở production sớm.
- **Log tập trung:** log request lỗi (4xx/5xx) và các thao tác admin (audit log) — không log thông tin nhạy cảm như mật khẩu hay token.
- **Backup & restore:** kiểm tra định kỳ (không chỉ tin tưởng backup tự động) — thử restore thử trên staging ít nhất 1 lần trước khi public chính thức.

## Kế hoạch scale khi user tăng

1. Giai đoạn đầu: connection pooling (HikariCP tuning) + cache Redis đã đủ giảm tải Postgres.
2. Khi tải tăng: nâng plan Render (nhiều CPU/RAM hơn) trước khi nghĩ tới kiến trúc phức tạp hơn.
3. Khi cần scale ngang thật sự: chạy nhiều instance backend sau load balancer (Render hỗ trợ sẵn), đảm bảo backend stateless (session/token không lưu local memory) để scale ngang không vỡ.
4. Bổ sung read replica cho Postgres chỉ khi có bằng chứng rõ là bottleneck đọc, tránh over-engineer sớm.

## Rollback

- Mỗi lần deploy production gắn với 1 Git tag; nếu lỗi nghiêm trọng, rollback về image trước đó qua Render trong vài phút.
- Với migration DB: ưu tiên viết migration theo hướng backward-compatible (thêm cột nullable trước, không xoá cột ngay) để rollback code không kéo theo lỗi schema.

## Trước khi public rộng (cuối Phase 5)

- Load test cơ bản (giả lập số lượng user đồng thời dự kiến) để xác nhận cấu hình Hikari/Redis/Render plan đủ đáp ứng.
- Diễn tập restore backup ít nhất 1 lần.
- Xác nhận staging đã chạy ổn định ít nhất vài ngày trước khi đẩy production.
