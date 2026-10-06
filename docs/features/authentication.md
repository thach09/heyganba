# Xác thực và tài khoản

> Trạng thái: Đã triển khai đầy đủ. Tài liệu này ghi hành vi hiện tại trong code.

## Hành vi hiện tại

- Tạo tài khoản bằng họ tên, email, mật khẩu; mã lớp không bắt buộc.
- Đăng nhập và đăng xuất (có thu hồi token server-side vào bảng `revoked_tokens`).
- Đổi mật khẩu qua `PUT /api/v1/auth/password`: kiểm tra BCrypt mật khẩu cũ, xác nhận mật khẩu mới ở UI, thu hồi JTI hiện tại và tăng `users.token_version` để vô hiệu mọi access/refresh token cũ trên tất cả thiết bị, kể cả token cấp trong cùng giây. UI gửi cả refresh token hiện tại và quay về đăng nhập.
- Access token (TTL 30 phút) và refresh token (TTL 7 ngày) được lưu ở trình duyệt; API client tự động thử refresh token khi gặp `401`.
- Một số màn cần đăng nhập. Vai trò `ROLE_ADMIN` mở quyền vào khu vực Quản trị.
- Khi tài khoản bật 2FA, đăng nhập yêu cầu mã TOTP Authenticator qua trường `twoFactorCode` của `/auth/login` trước khi cấp token. Không tự sinh/gửi OTP qua email; không có endpoint `/auth/admin/verify-otp`.
- Mã lớp có thể sửa trong khu vực Thi thử (`PUT /api/v1/users/me/class-code`).

## Giới hạn hiện tại

- Chưa có luồng quên/đặt lại mật khẩu qua email SMTP.
- Refresh token hiện lưu trong `localStorage` thay vì cookie `HttpOnly` (xem lý do kỹ thuật trong `security-plan.md`).

## Luồng liên quan

- UI: modal Đăng nhập / Đăng ký dùng chung trong app (`AuthModal.tsx`), Modal OTP xác thực 2FA cho Admin.
- API:
  - Xác thực: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`.
  - Đổi mật khẩu: `PUT /api/v1/auth/password`.

