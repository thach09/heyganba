# Khu vực Quản trị

> Trạng thái: Đã triển khai một phần.

## Hành vi hiện tại

- Route `/admin` chỉ hiển thị nội dung quản trị với tài khoản `ROLE_ADMIN`; người không có quyền thấy trạng thái 403.
- Màn hiện có xem trạng thái backend, tổng số người dùng và tài khoản admin đang xác thực; có thể tải lại dữ liệu.
- Bảng hiển thị danh sách người dùng, vai trò và trạng thái hoạt động.

## Chưa có trong giao diện

- Chưa có thao tác CRUD người dùng; audit log cũng chưa hiển thị trên màn (chỉ có API).
- **Đã có (27/09/2026)**: tab **"Cần kiểm"** — hàng đợi duyệt nội dung (`GET /admin/review-queue`): các item
  `needs_human_check = TRUE` (AI soạn nhưng CHƯA đối chiếu được nguồn, hoặc câu có thể có 2 đáp án theo ngữ cảnh) được
  đưa LÊN ĐẦU, kèm `sourceRef` (nguồn đã đối chiếu) và `reviewNote` (lý do cần kiểm). Có bộ lọc "chỉ hiện nhóm cần kiểm"
  (`?onlyNeedsCheck=true`). Số tổng hợp theo loại nằm ở `GET /content/review-status` (`totalNeedsHumanCheck`).
