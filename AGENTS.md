# AGENTS.md — HeyGanba

Nền tảng học tiếng Nhật: frontend React 19 + Vite (`frontend/`), backend Spring Boot (`backend/`).

Đọc trước khi làm: `PRODUCT.md` (sản phẩm) · `DESIGN.md` (luật thị giác — nguồn duy nhất cho UI) · `docs/Internal/AGENTS.md` (bài học vận hành/backend).

Làm UI:

- Không tự chế màu, font, component ngoài `DESIGN.md`; mục "Còn để ngỏ" của nó — hỏi trước khi quyết.
- So mock trong `docs/Design/` trước khi đổi bố cục.
- `frontend/src/index.css` là 1 file lớn — luật cấu trúc ở mục "Bài học CSS frontend" trong `docs/Internal/AGENTS.md`.
- Sửa xong: `npm run lint` + `npm run build`, chụp desktop 1440 + mobile 390, tự xem ảnh rồi mới báo hoàn thành.

Không bịa dữ liệu/số liệu/nội dung học thuật; nội dung Nhật mới phải ở luồng chờ duyệt; không commit secret.
