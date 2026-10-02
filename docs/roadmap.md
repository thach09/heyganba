# Roadmap tính năng

> Roadmap sản phẩm theo các ý đã được nêu/chốt. Mỗi liên kết ghi hành vi đang có trong app. Phần chưa triển khai được đánh dấu riêng; Advanced là định hướng tương lai, chưa phải cam kết về thời điểm.

## MVP — Đã triển khai

- [x] **Xác thực và tài khoản** — [chi tiết](features/authentication.md)
- [x] **Trang tổng quan** — [chi tiết](features/dashboard.md)
- [x] **Tiến độ học tập** (heatmap, streak, EXP và bảng xếp hạng) — [chi tiết](features/progress.md)
- [x] **Kana** (tra cứu, luyện gõ, luyện viết tay) — [chi tiết](features/kana.md)
- [x] **Phiên ôn từ vựng/SRS** — [chi tiết](features/vocabulary.md). Chưa có từ điển hoặc Kho học tập.
- [x] **Kanji** (tra cứu, bộ thủ, luyện viết tay) — [chi tiết](features/kanji.md)
- [x] **Ngữ pháp** (tra cứu, trang chi tiết, luyện trắc nghiệm) — [chi tiết](features/grammar.md)
- [x] **Thi thử** (đề sinh tự động theo công thức hiện có, chấm server, lịch sử) — [chi tiết](features/exam.md)
- [x] **Quản trị cơ bản** (trạng thái hệ thống và danh sách người dùng, chỉ ADMIN) — [chi tiết](features/admin.md)

## MVP — Còn cần làm

- [ ] **Từ điển + Kho học tập**: tìm từ, thêm từ vào kho, tạo nhóm cá nhân và chọn từ vào nhóm.
- [ ] **Nhóm mẫu cơ bản**: học viên nhận bộ mẫu vào kho rồi học nhóm bằng trắc nghiệm nghĩa/âm đọc.
- [ ] **Chỉ số luyện tập theo từ** để nhận ra từ cần ôn; phiên nhóm không đẩy lịch SRS ra xa.
- [ ] **Đổi mật khẩu người dùng (Phase 5 Polish)**: endpoint `PUT /api/v1/auth/password` + UI đổi mật khẩu. Khi đổi mật khẩu thành công, nối vào cơ chế `revoked_tokens` để thu hồi toàn bộ token cũ của user trên tất cả các thiết bị.

Phạm vi này được theo dõi ở [issue #11](https://github.com/thach09/heyganba/issues/11). Câu hỏi cloze/ngữ cảnh chưa thuộc MVP.

## Advanced Features

- **Market bộ học tập**: giáo viên tạo bộ; học viên tìm và nhận bộ vào Kho. Định hướng chi tiết ở issue #11.
- **Đề thi thử do người dùng tạo**: tự định nghĩa phạm vi đề, lưu và sử dụng lại; theo dõi ở [issue #12](https://github.com/thach09/heyganba/issues/12).
- **Học qua câu chuyện**: tạo môi trường học có câu chuyện và cốt truyện, khiến người học có hứng thú quay lại.
- **AI conversation partner**: một đối tác trò chuyện như người bạn để người học luyện tiếng Nhật.
