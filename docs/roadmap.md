# Roadmap tính năng — Nền tảng Học tiếng Trung

> Định hướng lộ trình sản phẩm nền tảng học tiếng Trung chuẩn HSK cho người học Việt Nam.

## 1. Nền tảng Đã hoàn thành (Core Stations)

- [x] **Trạm Pinyin (Bính âm & 4 Thanh điệu)**: Bảng mẫu âm, sóng cao độ trực quan, âm thanh mẫu và bài tập phân biệt thanh điệu.
- [x] **Trạm Hanzi (Chữ Hán & Bút thuận)**: Bảng chữ Hán HSK 1–6, lưới Mễ Tự Cách (米字格), hướng dẫn từng nét với HanziWriter.
- [x] **Trạm Từ vựng & Flashcards HSK**: Thẻ lật 3D (Âm Hán Việt, Giản thể, Phồn thể, Ví dụ), ôn tập SRS và tính điểm EXP.
- [x] **Tra cứu & Sổ tay Từ điển**: Tìm kiếm đa chiều (Chữ Hán, Pinyin, Âm Hán Việt, Nghĩa), lưu từ vựng vào sổ tay học tập.
- [x] **Hạ tầng Backend**: PostgreSQL schema chuẩn HSK (`V1`–`V3`), Hibernate validation 100%, bảo mật JWT và API Exp/CharacterMastery.
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

- **HSK Đề thi thử (Mock Exams)**: Sinh đề thi thử chuẩn HSK 1–4, bấm giờ làm bài, tự động chấm điểm và phân tích lỗi sai.
- **Luyện ngữ điệu bằng AI**: Nhận diện âm thanh giọng đọc của người học và so sánh độ khớp với người bản xứ.
- **Sàn chia sẻ sổ từ cộng đồng**: Người dùng có thể chia sẻ và tải về các bộ flashcard từ vựng theo chuyên đề.
