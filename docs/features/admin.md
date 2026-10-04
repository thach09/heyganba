# Khu vực Quản trị (Admin Panel)

> Trạng thái: Đã hoàn thiện toàn diện. Cho phép quản lý học liệu, duyệt nội dung và xem nhật ký hệ thống mà không cần deploy lại.

## Hành vi hiện tại

- **Phân quyền chặt chẽ**: Tuyến đường `/admin` chỉ cho phép người dùng có vai trò `ROLE_ADMIN` truy cập; người dùng chưa đăng nhập hoặc không đủ quyền sẽ nhận mã lỗi 403 Forbidden.
- **Bảo mật 2FA**: Admin đăng nhập yêu cầu xác thực OTP 2FA trước khi mở khóa toàn quyền quản trị.
- **Tổng quan hệ thống (Tab TỔNG QUAN)**: Hiển thị trạng thái backend (Health check, Memory, Uptime), tổng số tài khoản người dùng, thống kê học liệu và thông tin admin đang thao tác.
- **Hàng đợi duyệt nội dung (Tab CẦN KIỂM)**:
  - Hiển thị danh sách các mục chờ duyệt (`review-queue`): từ vựng, ngữ pháp, kanji.
  - Các mục có cờ `needs_human_check = TRUE` được ưu tiên xếp lên đầu kèm ghi chú kiểm tra (`reviewNote`) và nguồn đối chiếu (`sourceRef`).
  - Hỗ trợ thao tác duyệt nhanh: Duyệt (Approve), Từ chối (Reject).
- **Quản lý học liệu CRUD (Tab TỪ VỰNG, HÁN TỰ, BÀI TẬP)**:
  - **Từ vựng (Vocabulary)**: Danh sách từ vựng có tìm kiếm, lọc theo bài học; Form thêm mới và chỉnh sửa trực tiếp qua Modal; Xoá từ vựng.
  - **Hán tự (Kanji)**: Bảng tra cứu chữ Hán, số nét, âm On/Kun, Hán Việt; Modal thêm/sửa Kanji đầy đủ các trường; Xoá Kanji.
  - **Bài tập (Exercises)**: Quản lý câu hỏi trắc nghiệm, cấu hình đáp án đúng, options JSON, câu cờ bẫy (`isCommonMistake`); Form thêm/sửa trực tiếp; Xoá câu hỏi.
- **Nhật ký thao tác (Tab AUDIT LOG)**:
  - Hiển thị toàn bộ lịch sử chỉnh sửa dữ liệu, duyệt bài, đổi vai trò của các quản trị viên (`GET /api/v1/admin/audit-logs`).
  - Ghi rõ thời gian, email admin thực hiện, hành động (CREATE/UPDATE/DELETE/APPROVE), thực thể và chi tiết thay đổi.

## Giới hạn & Quy định vận hành

- **Rate limit admin**: Giữ nguyên giới hạn 30 request/phút/admin để ngăn chặn hành vi spam hoặc token lộ bị lạm dụng.
- **Nhập liệu số lượng lớn**: Bắt buộc thực hiện thông qua Flyway migration script, không sử dụng Admin UI để nhập hàng trăm câu cùng lúc nhằm đảm bảo tính toàn vẹn dữ liệu và kiểm soát phiên bản.

## Luồng liên quan

- UI: Màn hình Quản trị `/admin` (`AdminView.tsx`).
- API:
  - Trạng thái & Users: `GET /api/v1/admin/status`, `GET /api/v1/admin/users`, `POST /api/v1/admin/users/{id}/role`
  - Hàng đợi duyệt: `GET /api/v1/admin/review-queue`, `POST /api/v1/admin/review-queue/approve`, `POST /api/v1/admin/review-queue/reject`
  - CRUD Từ vựng: `GET`, `POST`, `PUT`, `DELETE /api/v1/admin/vocabulary`
  - CRUD Kanji: `GET`, `POST`, `PUT`, `DELETE /api/v1/admin/kanji`
  - CRUD Bài tập: `GET`, `POST`, `PUT`, `DELETE /api/v1/admin/exercises`
  - Audit log: `GET /api/v1/admin/audit-logs`

