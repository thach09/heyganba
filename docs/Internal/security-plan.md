# Security Plan — Japanese Learning Platform

## Xác thực & phân quyền

- JWT qua Spring Security, thời gian sống ngắn cho access token, dùng refresh token riêng để giảm rủi ro khi token bị lộ.
- Mật khẩu hash bằng BCrypt, không lưu plaintext dưới bất kỳ hình thức nào kể cả log.
- RBAC (ADMIN/USER) enforce ở tầng backend (service layer), không chỉ ẩn UI ở frontend — mọi endpoint admin phải tự kiểm tra role, không tin frontend đã ẩn nút.
- Đăng nhập sai nhiều lần liên tiếp: giới hạn số lần thử (rate limit theo tài khoản/IP) để chặn brute-force.

## Bảo vệ API

- Strict CORS: chỉ domain frontend chính thức được gọi API, không mở wildcard.
- Rate limiting cho các endpoint dễ bị spam: chấm điểm flashcard/quiz, cập nhật streak, nộp bài thi thử — tránh user (hoặc script) gian lận bằng cách gọi API liên tục.
- Validate toàn bộ input phía server, không tin bất kỳ giá trị nào tính sẵn từ client (đặc biệt điểm số, kết quả đúng/sai, streak) — mọi kết quả phải được backend tính lại hoặc đối chiếu, tránh user sửa request để gian lận leaderboard.
- Giới hạn kích thước payload (đặc biệt ảnh/canvas viết tay nếu có upload) để tránh DoS qua request nặng.

## Dữ liệu & lưu trữ

- Postgres: user ứng dụng chỉ có quyền tối thiểu cần thiết (không dùng superuser cho kết nối app).
- Backup tự động hàng ngày, mã hoá at-rest (mặc định của nhà cung cấp managed DB).
- Audit log riêng cho hành động của Admin (sửa/xoá nội dung, đổi role user khác) — ghi ai, khi nào, sửa gì, không chỉ log chung chung.
- Dữ liệu cá nhân thu thập tối thiểu: chỉ cần thiết cho việc học (tên/email, tiến độ học) — tránh thu thập thông tin không cần thiết về sinh viên.

## Frontend & bảo vệ người dùng

- Chống XSS: mọi nội dung do user nhập (nếu có phần bình luận/tên hiển thị leaderboard) phải được escape/sanitize trước khi render, không render HTML thô từ input user.
- HTTPS bắt buộc toàn bộ, HSTS bật để chặn downgrade về HTTP.
- Cookie/token phía frontend: ưu tiên `httpOnly` cho refresh token để giảm rủi ro bị đánh cắp qua XSS.

## Admin panel — rủi ro cao nhất cần siết chặt riêng

- Route admin tách biệt hoàn toàn về path và middleware kiểm tra quyền, test riêng case "user thường cố gọi API admin".
- Cân nhắc thêm xác thực 2 lớp (2FA) cho tài khoản admin vì đây là nơi có quyền sửa nội dung/tài khoản người khác.
- Không cho phép admin xoá cứng (hard delete) dữ liệu người dùng trực tiếp — ưu tiên soft delete để có thể khôi phục nếu thao tác nhầm hoặc bị lạm dụng.

## Quản lý dependency & lỗ hổng

- Bật cảnh báo tự động cho dependency có lỗ hổng (GitHub Dependabot hoặc tương đương) cho cả backend (Maven) và frontend (npm).
- Review và cập nhật dependency định kỳ, không để version cũ tồn đọng quá lâu, đặc biệt các thư viện liên quan auth/security.

## Trước khi public rộng

- Chạy quét bảo mật cơ bản (vd OWASP ZAP) nhắm vào các endpoint public trước khi launch chính thức, đặc biệt luồng đăng ký/đăng nhập và các API chấm điểm.
- Kiểm tra lại toàn bộ endpoint admin một lượt cuối để chắc chắn không có endpoint nào lọt ra ngoài kiểm soát RBAC.
- Diễn tập kịch bản lộ secret (vd JWT key) một lần: xác nhận có thể xoay key khẩn cấp không gây gián đoạn quá lâu cho user.

## Trách nhiệm liên tục sau launch

- Theo dõi log lỗi/đăng nhập bất thường định kỳ, không chỉ setup một lần rồi bỏ.
- Mỗi tính năng mới trước khi merge: tự hỏi "endpoint này có bị lạm dụng để gian lận điểm/streak không, có bị gọi bởi user không đúng role không" — đưa câu hỏi này vào checklist review của agent trong `agent-guidelines.md`.
