# Học tiếng Trung

Nền tảng học tiếng Trung cho người Việt: React 19 + Vite 8 + Tailwind 4, Spring Boot 3 và PostgreSQL 16. Tên thương hiệu mới đang chờ quyết định.

## Tính năng

- Pinyin: 21 thanh mẫu + y/w, 36 vận mẫu, thanh điệu, biến điệu, lộ trình sáu chặng và quiz nghe.
- Từ vựng HSK 1–6, thẻ lật, gõ Pinyin và SRS SM-2.
- Chữ Hán, bộ thủ, chiết tự, bút thuận và luyện viết trên ô 米字格.
- Ngữ pháp: cấu trúc, ví dụ, lỗi thường gặp, trắc nghiệm và sắp xếp câu.
- Từ điển, sổ từ riêng, ghi chú có thể sửa, luyện nhanh và đọc ngữ cảnh.
- Thi thử nội bộ, lịch sử và chấm điểm máy chủ theo cấp; không cấp chứng chỉ.
- Tiến độ theo tài khoản, heatmap, EXP, nhiệm vụ và măng trúc lưu ở máy chủ.
- Giao diện giấy Tuyên sáng / nghiên mực tối, responsive desktop và mobile.

Phạm vi và số lượng nội dung: [PRODUCT.md](PRODUCT.md), [nguồn giáo trình](docs/m6-curriculum-sources.md). Có dữ liệu ở sáu cấp, chưa phải toàn bộ từ vựng HSK nâng cao.

## Chạy cục bộ

1. Cài Java 21, Maven, Node phù hợp lockfile và PostgreSQL 16. Đọc [quy trình bảo mật/vận hành](docs/security-and-ops.md) trước khi triển khai.
2. Sao chép `.env.example` sang cấu hình riêng bị gitignore; điền secret và mật khẩu qua môi trường tiến trình. Spring không tự tải file `.env` ở root. Profile mặc định là `prod`; chỉ bật `SPRING_PROFILES_ACTIVE=dev` khi phát triển localhost.
3. Chuẩn bị DB, role migration và role ứng dụng. `docker compose` yêu cầu các biến mật khẩu; không dùng tài khoản owner cho tiến trình ứng dụng production.
4. Trong `backend/`: `mvn spring-boot:run`. Flyway chạy V1–V10 khi nạp cả hai locations đã cấu hình. Không sửa migration đã áp dụng.
5. Trong `frontend/`: `npm ci`, `npm run dev`. Proxy mặc định đến localhost:8080; có thể đặt `DEV_API_TARGET`. `VITE_API_BASE_URL` là URL public, không phải secret.

## Kiểm chứng

Backend: `mvn clean test`. Frontend: `npm run lint`, `npm run test:unit`, `npm run build`. Kiểm chứng PostgreSQL thật: `powershell -File scripts/verify-postgres-m21.ps1 -Port 15440`. Script tạo container và DB rehearsal riêng, không xoá DB đang dùng. UI thực: `node tests/audit-layout.mjs` từ `frontend/` khi đã chạy backend rehearsal và Vite, cấu hình `M6_WEB_URL`, `M6_API_URL` nếu đổi cổng.

[Luật thị giác](frontend/DESIGN.md) · [Báo cáo audit](docs/QA/production-audit-2026-10-17.md) · [Từ vựng](docs/features/vocabulary.md) · [Ngữ pháp và thi thử](docs/features/grammar-and-exam.md)
