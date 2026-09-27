# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Hiện tại (đã xác nhận):** chính người tạo sản phẩm (Thach) — tự học tiếng Nhật, dùng luân phiên **laptop và điện thoại**. Cả hai là môi trường sử dụng thật, không có môi trường "phụ".
- **Mục tiêu sau này (định hướng):** người học tiếng Nhật nói chung — sản phẩm không giới hạn ở sinh viên FPT.

## Product Purpose

Giúp việc học tiếng Nhật trở nên **dễ dàng và có quy trình**, dựa trên các **phương pháp đã được nghiên cứu và chứng minh** (ví dụ: lặp lại ngắt quãng SM-2), kèm tips & tricks cụ thể — không phải một kho nội dung để tự bơi.

Giáo trình khởi đầu: **Dekiru Nihongo (JPD113 & JPD123)** — mượn cấu trúc từ FPT, viết lại thành giáo trình của sản phẩm. Định hướng dài hạn: mở rộng thành app học tiếng Nhật chung.

## Positioning

Kết hợp đồng thời 3 thứ sản phẩm lân cận khó sao chép cùng lúc: (1) phương pháp học có cơ sở khoa học (SRS/streak/5 trạm có cấu trúc), (2) nội dung qua quy trình kiểm duyệt, (3) kiến trúc không khóa cứng vào một giáo trình đơn lẻ.

## Operating Context

- Web app, dùng thật trên cả điện thoại và laptop — responsive là yêu cầu cốt lõi, không phải phần phụ.
- Nội dung học thuật bằng tiếng Nhật; giao diện bằng tiếng Việt.
- Nội dung mới phải ở trạng thái `PENDING_REVIEW`; chỉ hiện cho người học sau khi admin duyệt (`APPROVED`).
- "Một ngày học" tính theo múi giờ `Asia/Ho_Chi_Minh` ở mọi môi trường.
- Production đang chạy tại heyganba.site (backend Render + frontend Vercel); có môi trường staging riêng.
- Nội dung học thuật phải viết lại bằng lời của mình — không copy nguyên văn nguồn có bản quyền.

## Capabilities and Constraints

Đã có (đã xác nhận):

- 5 trạm: Kana (canvas viết tay) · Flashcard + SRS (SM-2, cache Redis/memory) · Kanji & bộ thủ · Trợ từ/ngữ pháp · Thi thử + Đấu trường (streak heatmap, leaderboard).
- Phân quyền RBAC `ROLE_ADMIN` / `ROLE_USER`; đăng nhập JWT.
- Quy trình duyệt nội dung + endpoint `content/review-status`.
- Hệ cấp độ + EXP: EXP chỉ cộng từ hoạt động học thật (thẻ ôn, chữ viết, câu trả lời đúng); hiển thị bằng thanh EXP màu đai.

Chưa quyết (không được tự suy diễn):

- Cơ chế mở rộng đa giáo trình / ra ngoài phạm vi FPT (thêm khóa học thế nào, ai soạn nội dung) — chưa chốt.
- Mô hình người dùng tương lai (mở đăng ký công khai? pricing?) — chưa bàn tới.

## Brand Commitments

- **Tên sản phẩm: HeyGanba — bắt buộc giữ.**
- Không có ràng buộc brand nào khác được xác nhận (mascot/hero asset hiện có nhưng chưa chốt là bắt buộc).

## Evidence on Hand

- Sản phẩm chạy thật trên production; người dùng thật đầu tiên là tác giả.
- Nội dung Dekiru (từ vựng Bài 1–7 đã seed; một phần nội dung đang chờ duyệt).
- **Không có** testimonials, số liệu người dùng, benchmark hay nghiên cứu đo lường — công việc sau này không được bịa ra.

## Product Principles

1. **Phương pháp trước nội dung:** mỗi tính năng phải phục vụ một phương pháp học có cơ sở, không nhồi nội dung cho có.
2. **Điện thoại và laptop ngang hàng:** mọi màn hình phải dùng tốt trên cả hai, không có bản "phụ".
3. **Nội dung phải đáng tin:** qua kiểm duyệt trước khi người học thấy; không nguyên văn nguồn có bản quyền.
4. **Không khóa cứng vào một giáo trình:** cấu trúc đủ tổng quát để thêm giáo trình/khóa khác trong tương lai.
5. **Dễ hơn hẳn so với tự học:** giảm ma sát, tăng tính đều đặn (streak).
