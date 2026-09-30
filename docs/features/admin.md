# Khu vực Quản trị

> Trạng thái: Đã triển khai một phần.

## Hành vi hiện tại

- Route `/admin` chỉ hiển thị nội dung quản trị với tài khoản `ROLE_ADMIN`; người không có quyền thấy trạng thái 403.
- Màn hiện có xem trạng thái backend, tổng số người dùng và tài khoản admin đang xác thực; có thể tải lại dữ liệu.
- Bảng hiển thị danh sách người dùng, vai trò và trạng thái hoạt động.

## Chưa có trong giao diện

- Chưa có thao tác CRUD người dùng hoặc nội dung.
- Backend có endpoint audit log và trạng thái duyệt nội dung, nhưng màn Admin hiện chưa hiển thị các dữ liệu đó.
