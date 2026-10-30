# AGENTS.md — Học tiếng Trung (fork từ HeyGanba)

Nền tảng học tiếng Trung cho người Việt: frontend React 19 + Vite (`frontend/`), backend Spring Boot (`backend/`).
Nền kỹ thuật tái sử dụng từ HeyGanba tiếng Nhật; HeyGanba tiếng Nhật tiếp tục ở repo riêng.

Đọc trước khi làm: `PRODUCT.md` (sản phẩm) · `frontend/DESIGN.md` (luật thị giác — nguồn duy nhất cho UI) · `docs/Internal/AGENTS.md` (bài học vận hành/backend).

Làm UI:

- Không tự chế màu, font, component ngoài `frontend/DESIGN.md`; mục "Còn để ngỏ" của nó — hỏi trước khi quyết.
- So mock trong `docs/Design/` trước khi đổi bố cục.
- Style dùng Tailwind v4 + token trong `@theme` (xem `frontend/DESIGN.md` mục 6); `index.css` là CSS cũ đang teo dần — màn nào chuyển xong thì xoá CSS cũ của màn đó.
- Font: `Noto Serif SC` cho chữ Hán (thay thế `Noto Serif JP`); `Be Vietnam Pro` cho tiếng Việt; `Noto Sans SC` fallback.
- Sửa xong: `npm run lint` + `npm run build`, chụp desktop 1440 + mobile 390, tự xem ảnh rồi mới báo hoàn thành.

Nội dung tiếng Trung:

- Không bịa dữ liệu/số liệu/nội dung học thuật; nội dung tiếng Trung mới phải ở luồng chờ duyệt (`PENDING_REVIEW`).
- Không tuyên bố chuẩn HSK mà không có nguồn xác thực.
- Không commit secret.

Rate limit admin: giữ nguyên 30/phút/admin; nhập nội dung số lượng lớn bắt buộc qua Flyway migration, không qua Admin UI.

Owner đã chọn tên Jiayou cho repository và ứng dụng; Ganbarou là sản phẩm riêng, không thay thế.
Chưa chốt: migration `language_code` để tách dữ liệu JP/ZH — chờ xác nhận founder.
