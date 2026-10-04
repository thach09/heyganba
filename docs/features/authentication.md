# Xác thực và tài khoản

> Trạng thái: Đã triển khai đầy đủ. Tài liệu này ghi hành vi hiện tại trong code.

## Hành vi hiện tại

- Tạo tài khoản bằng họ tên, email, mật khẩu; mã lớp không bắt buộc.
- Đăng nhập và đăng xuất (có thu hồi token server-side vào bảng `revoked_tokens`).
- Access token (TTL 30 phút) và refresh token (TTL 7 ngày) được lưu ở trình duyệt; API client tự động thử refresh token khi gặp `401`.
- Một số màn cần đăng nhập. Vai trò `ROLE_ADMIN` mở quyền vào khu vực Quản trị.
- Xác thực 2 lớp (2FA) bảo vệ tài khoản quản trị viên: khi đăng nhập tài khoản ADMIN, hệ thống sinh mã OTP qua `POST /api/v1/auth/admin/verify-otp` trước khi cấp full quyền.
- Mã lớp có thể sửa trong khu vực Thi thử (`PATCH /api/v1/users/me/class-code`).

## Giới hạn hiện tại

- Chưa có luồng quên/đặt lại mật khẩu qua email SMTP.
- Refresh token hiện lưu trong `localStorage` thay vì cookie `HttpOnly` (xem lý do kỹ thuật trong `security-plan.md`).

## Luồng liên quan

- UI: modal Đăng nhập / Đăng ký dùng chung trong app (`AuthModal.tsx`), Modal OTP xác thực 2FA cho Admin.
- API:
  - Xác thực: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`.
  - Quản trị 2FA: `POST /api/v1/auth/admin/verify-otp`.

