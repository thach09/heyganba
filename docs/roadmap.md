# Roadmap tính năng — Nền tảng Học tiếng Trung

> Định hướng nền tảng học tiếng Trung cho người học Việt Nam; học liệu được nhóm theo HSK nhưng độ phủ chính thức đang được đối chiếu và bổ sung từng mục.

> Cập nhật 20/10/2026: checkbox mô tả phạm vi tính năng, không khẳng định nội dung mỗi cấp đã đầy đủ. Audit bảo thủ ghép 483/5.400 ID từ/cách đọc CTI HSK 3.0 2025-11; HSK 1 còn 56 ID, HSK 2–6 còn 114/441/957/1.562/1.787. Số này loại 15 ID mơ hồ qua 8 trường hợp cùng chữ/Pinyin khác cấp; nhóm bài học vẫn là tuyển chọn nội bộ, không phải phân loại CTI. Thi thử ở `/exam` là ngân hàng câu hỏi nội bộ. Xem [bản đồ route/API/table, kết quả test và phần còn thiếu](QA/selfhost-readiness-2026-10-19.md).

## 1. Nền tảng Đã hoàn thành (Core Stations)

- [x] **Trạm Pinyin (Bính âm & 4 Thanh điệu)**: Bảng mẫu âm, sóng cao độ trực quan, âm thanh mẫu và bài tập phân biệt thanh điệu.
- [x] **Trạm Hanzi (Chữ Hán & Bút thuận)**: Bộ chữ Hán chọn lọc theo nhóm cấp 1–6, lưới Mễ Tự Cách (米字格), hướng dẫn từng nét với HanziWriter.
- [x] **Trạm Từ vựng & Flashcards HSK**: Thẻ lật (Hán Việt/ví dụ chỉ hiện khi trường đã được xác minh; Giản thể, Phồn thể), ôn tập SRS và tính điểm EXP.
- [x] **Tra cứu & Sổ tay Từ điển**: Tìm kiếm đa chiều (Chữ Hán, Pinyin, Âm Hán Việt, Nghĩa), lưu từ vựng vào sổ tay học tập.
- [x] **Hạ tầng Backend**: PostgreSQL schema cho học liệu tiếng Trung (`V1`–`V3`, bổ sung phát hành qua allowlist `V4`–`V21`), Hibernate validation, bảo mật JWT và API Exp/CharacterMastery.
- [x] **Giao diện Văn Phòng Tứ Bảo (Modern Guochao)**: Tông màu Giấy Tuyên & Nghiên Mực, con dấu chu sa đỏ `<RedSealStamp />`, thẻ `<OrientalCard>` viền họa tiết truyền thống.

## 2. Hệ thống Linh Thú Đồng Hành (Companion Pets) — [NEW]

- [x] **4 Linh thú văn hóa Á Đông**:
  - `panda` (Đoàn Đoàn - 团团)
  - `red_panda` (Đào Đào - 淘淘)
  - `golden_monkey` (Tiểu Ngộ Không - 小悟空)
  - `imperial_cat` (Ngự Miêu - 御猫)
- [x] **5 Trạng thái cảm xúc tương tác**: `idle`, `studying`, `happy`, `sad`, `eating` với bong bóng thoại song ngữ Trung-Việt.
- [x] **Vòng lặp chăm sóc & gắn kết**: Thưởng Măng Trúc 🎋 sau mỗi bài học, tương tác cho ăn và nâng cấp độ thân mật.
- [x] **Study Companion Dock**: Đồng hành mini theo dõi và khích lệ người học trực tiếp trong các trạm Pinyin, Hanzi, Từ vựng.

## 3. Lộ trình Mở rộng Tiếp theo

- **HSK Đề thi thử (Mock Exams)**: Sinh đề thi thử nội bộ theo nhóm cấp 1–4, bấm giờ làm bài, tự động chấm điểm và phân tích lỗi sai.
- **Luyện ngữ điệu bằng AI**: Nhận diện âm thanh giọng đọc của người học và so sánh độ khớp với người bản xứ.
- **Sàn chia sẻ sổ từ cộng đồng**: Người dùng có thể chia sẻ và tải về các bộ flashcard từ vựng theo chuyên đề.
