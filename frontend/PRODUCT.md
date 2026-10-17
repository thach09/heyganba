# Product — Frontend briefing

<!-- impeccable:product-schema 1 -->

## Platform

Web responsive cho desktop 1440px, tablet 1024px và mobile 390px. Phạm vi chuẩn ở [PRODUCT.md](../PRODUCT.md), thị giác ở [DESIGN.md](DESIGN.md).

## Users

Người Việt tự học tiếng Trung, từ nhập môn đến các bài luyện đại diện HSK 1–6.

## Product Purpose

Giúp học phát âm, từ vựng, chữ Hán, ngữ pháp và đọc ngữ cảnh; ghi nhớ qua luyện tập và ôn cách quãng. Không hứa kết quả thi hoặc năng lực học thuật chưa kiểm định.

## Operating Context

Tiếng Việt cho thao tác, chữ Hán Noto Serif SC, tiếng Việt Be Vietnam Pro, Noto Sans SC dự phòng. Hai theme giấy Tuyên / nghiên mực dùng CSS tokens, lưu lựa chọn và đồng bộ tab. Đèn lồng chỉ trong dải trần, biến mất sau scrollY >20, tôn trọng reduced motion.

## Capabilities and Constraints

- Dashboard, Pinyin, chữ Hán, từ vựng/SRS, ngữ pháp, từ điển/sổ từ/đọc hiểu, thi thử và quản trị.
- Bộ lọc HSK 1–6 phản ánh dữ liệu thực. URL cấp độ từ vựng hỗ trợ refresh/back.
- Trắc nghiệm và sắp câu được chấm ở server, không gửi đáp án trước khi chấm. Thi thử là nội bộ, 200/120 hoặc 300/180 theo cấp.
- Nhiệm vụ và ví măng theo tài khoản, nhận một lần/ngày ở server; không dùng số thưởng giả trong localStorage.
- Ghi chú sổ từ là văn bản thuần, có chỉnh sửa và kiểm tra quyền sở hữu. Nội dung render qua React, không chèn HTML từ người dùng.
- Không hiển thị dữ liệu riêng của tài khoản trước khi chuyển sang tài khoản khác. Tôn trọng cancellation và idempotency khi retry.
- Giới hạn dữ liệu và nguồn: [nguồn giáo trình](../docs/m6-curriculum-sources.md). Nội dung mới mặc định PENDING_REVIEW, ngoại lệ V9 được yêu cầu rõ ở M6.

## Verification

Lint, unit tests, build; chụp và xem ảnh cả hai theme ở 1440/1024/390. Kiểm tra tràn ngang, badge/title, đèn lồng, modal, bảng và thao tác học thật. Không coi build thành công là bằng chứng UI không chồng chữ.
