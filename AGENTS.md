# AGENTS.md — HeyGanba

Nền tảng học tiếng Nhật: frontend React 19 + Vite (`frontend/`), backend Spring Boot (`backend/`).

Đọc trước khi làm: `PRODUCT.md` (sản phẩm) · `DESIGN.md` (luật thị giác — nguồn duy nhất cho UI) · `docs/Internal/AGENTS.md` (bài học vận hành/backend).

Làm UI:

- Không tự chế màu, font, component ngoài `DESIGN.md`; mục "Còn để ngỏ" của nó — hỏi trước khi quyết.
- So mock trong `docs/Design/` trước khi đổi bố cục.
- Style dùng Tailwind v4 + token trong `@theme` (xem `DESIGN.md` mục 6); `index.css` là CSS cũ đang teo dần — màn nào chuyển xong thì xoá CSS cũ của màn đó.
- Sửa xong: `npm run lint` + `npm run build`, chụp desktop 1440 + mobile 390, tự xem ảnh rồi mới báo hoàn thành.

Không bịa dữ liệu/số liệu/nội dung học thuật; nội dung Nhật mới phải ở luồng chờ duyệt; không commit secret.
Rate limit admin: giữ nguyên 30/phút/admin; nhập nội dung số lượng lớn bắt buộc qua Flyway migration, không qua Admin UI.
