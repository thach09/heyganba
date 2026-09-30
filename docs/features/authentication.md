# Xác thực và tài khoản

> Trạng thái: Đã triển khai. Tài liệu này ghi hành vi hiện tại trong code.

## Hành vi hiện tại

- Tạo tài khoản bằng họ tên, email, mật khẩu; mã lớp không bắt buộc.
- Đăng nhập và đăng xuất.
- Access token và refresh token được lưu ở trình duyệt; API client thử refresh token khi gặp `401`.
- Một số màn cần đăng nhập. Vai trò `ROLE_ADMIN` mở quyền vào khu vực Quản trị.
- Mã lớp có thể sửa trong khu vực Thi thử.

## Giới hạn hiện tại

- Chưa có luồng quên/đặt lại mật khẩu.
- Đăng xuất xoá token phía client; hiện không gọi endpoint thu hồi token phía server.

## Luồng liên quan

- UI: modal Đăng nhập / Đăng ký dùng chung trong app.
- API: `POST /api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/refresh`.
