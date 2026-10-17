# Product — Frontend Briefing

Canonical product scope and approved roadmap: [../PRODUCT.md](../PRODUCT.md).
Chi tiết lộ trình các cột mốc M1–M3: [../docs/curriculum-roadmap-m1-m3.md](../docs/curriculum-roadmap-m1-m3.md).

<!-- impeccable:product-schema 1 -->

## Platform

web (ưu tiên responsive bình đẳng trên cả laptop desktop và điện thoại mobile).

## Users

Người Việt mới bắt đầu học tiếng Trung (HSK 1–3), tự học hoặc học có bổ trợ. Môi trường sử dụng thật: luân phiên laptop và điện thoại.

## Product Purpose

Giúp việc học tiếng Trung cho người Việt trở nên **dễ dàng, chuẩn xác và có phương pháp khoa học**:
1. **Nền tảng phát âm Pinyin chuẩn** (Đề án Pinyin Hán ngữ 1958: 21 thanh mẫu, 36 vận mẫu, 4 thanh điệu, quy tắc chính tả, biến điệu).
2. **Từ vựng & Chữ Hán đa giác quan**: Ghi nhớ mặt chữ qua ô Mễ tự cách, câu ví dụ thực tế và lặp lại ngắt quãng SM-2.
3. **Ngữ pháp ứng dụng**: So sánh đối chiếu ngữ pháp Việt - Trung để tránh lỗi tư duy dịch thô (word-by-word).

## Operating Context

- Web app, dùng thật trên cả điện thoại (390px) và laptop (1440px) — responsive là yêu cầu cốt lõi.
- Giao diện bằng tiếng Việt; nội dung chữ Hán dùng phông `Noto Serif SC`, Pinyin dùng `Noto Sans SC`.
- Nội dung mới phải ở trạng thái `PENDING_REVIEW`; chỉ hiện cho người học sau khi admin duyệt (`APPROVED`).
- "Một ngày học" tính theo múi giờ `Asia/Ho_Chi_Minh`.
- Nhãn thương hiệu trung tính: "Học tiếng Trung".
- M1 (Pinyin & phát âm), M2.1 / M2.1.1 (Bài mẫu Từ vựng & SRS), M2.2 (Kho từ vựng Chủ đề HSK 1), HSK Standard Course Ecosystem (Staging V6), M4 (Chuẩn 150 từ HSK 1 & Trạm Chữ Hán) và M5 (Tự động Phê duyệt toàn bộ Giáo trình APPROVED, Mở rộng HSK 2 Standard Course V8, Bản đồ Lộ trình Chinh phục HSK & Nhiệm vụ Hằng ngày trên Dashboard, 1-Click Bulk Approve trên Admin Console) đã hoàn thiện và được đánh dấu APPROVED toàn diện để người học trải nghiệm không bị chặn cổng duyệt.

## Capabilities and Constraints

Đã có (đã xác nhận):

- 5 trạm: Kana (canvas viết tay) · Từ vựng & SRS (`/vocabulary`, SM-2, cache Redis/memory) · Kanji & bộ thủ · Trợ từ/ngữ pháp · Thi thử + Đấu trường (streak heatmap, leaderboard).
- Phân quyền RBAC `ROLE_ADMIN` / `ROLE_USER`; đăng nhập JWT.
- Quy trình duyệt nội dung + endpoint `content/review-status` và `ContentAccess`.
- Hệ cấp độ + EXP: EXP chỉ cộng từ hoạt động học thật (thẻ ôn, chữ viết, câu trả lời đúng); hiển thị bằng thanh EXP màu đai.
- Thông thạo từng chữ: mức độ trải nghiệm + độ chính xác theo từng chữ, suy từ dữ liệu học tập hiện có (SRS cho từ vựng, số lần luyện cho kanji; kana bổ sung sau). Về sau dùng để điều chỉnh interval SRS và gợi ý phương pháp nâng cao theo mức thông thạo.
- Phiên ôn từ vựng SRS theo SM-2 chuẩn 4 mức: `FORGOT`, `HARD`, `GOOD`, `EASY`; gửi `attemptId` kháng lặp; tách biệt rõ ràng với Sổ từ vựng cá nhân. Chuyển thẻ chỉ khi máy chủ xác nhận thành công. Gõ Pinyin bảo toàn thanh điệu và phân biệt `u`/`ü`.

Chưa quyết (không được tự suy diễn):

- Cơ chế mở rộng đa giáo trình / ra ngoài phạm vi FPT (thêm khóa học thế nào, ai soạn nội dung) — chưa chốt.
- Mô hình người dùng tương lai (mở đăng ký công khai? pricing?) — chưa bàn tới.

## Brand Commitments

- **Tên sản phẩm: HeyGanba — bắt buộc giữ.**
- Brand chốt 27/09/2026: **logo cổng Torii là biểu tượng thương hiệu chính thức**; **mascot chính thức** là chuỗi emoji
  tiến hoá theo streak (🥚 → 🐣 → 🐤 → 🐥 → 🦅 → 🐉, xem `docs/roadmap.md`) — không làm thêm mascot nào khác.

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
