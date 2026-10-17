# Trạm Chữ Hán & Bộ Thủ HSK (Hanzi & Radicals Station)

> Trạng thái: **Milestone M4 - Nâng cấp toàn diện Trạm Chữ Hán & Bộ Thủ HSK 1.**

## 1. Giới thiệu tổng quan
Trạm Chữ Hán (`HanziStationView.tsx`) là trung tâm rèn luyện chữ Hán tương tác cao cấp dành cho người Việt học tiếng Trung. Hệ thống kết hợp khung luyện viết thư pháp Mễ Tự Cách (米字格), phân tích chiết tự và bộ thủ, từ ghép HSK ứng dụng, cùng vòng lặp gắn kết với linh thú đồng hành (Companion Pet).

---

## 2. Các tính năng cốt lõi (Milestone M4)

### 2.1. Thanh lọc Bộ thủ & Cấp độ HSK
- **Thanh công cụ Bộ thủ nền tảng (`FOUNDATIONAL_RADICALS`)**: Lọc nhanh theo 20 bộ thủ thông dụng nhất trong tiếng Trung (`亻, 口, 女, 氵, 讠, 忄, 扌, 木, 日, 月, 宀, 辶, 钅, 纟, 火, 土, 心, 门, 彳, 阝`) với tên Hán Việt chuẩn xác.
- **Bộ lọc cấp độ HSK**: Lọc tức thì theo `Tất cả`, `HSK 1`, `HSK 2`, `HSK 3`.
- **Tìm kiếm đa năng thời gian thực**: Tìm kiếm linh hoạt theo chữ Hán, phiên âm Pinyin, âm Hán Việt (Sino-Vietnamese) hoặc định nghĩa tiếng Việt.
- **Huy hiệu thẩm định học thuật**: Hiển thị nhãn `Chờ duyệt` (amber badge) minh bạch cho các ký tự đang trong luồng kiểm duyệt `PENDING_REVIEW` (`needs_human_check = true`).

### 2.2. Chiết tự & Từ ghép HSK ứng dụng
- **Khối Chiết tự & Cấu trúc chữ Hán**: Phân rã cấu trúc chữ Hán (Hội ý, Hình thanh, Chỉ sự, Độc thể), giải thích các bộ phận hợp thành (ví dụ: `好 = 女 (Nữ) + 子 (Tử)` - mẹ và con sum vầy là điều tốt lành).
- **Từ ghép HSK ứng dụng (`example_words_json`)**: Bảng từ ghép thực tế trong ngữ cảnh HSK 1 kèm phiên âm Bính âm chuẩn và nghĩa tiếng Việt.
- **Phát âm tiếng Quan Thoại (Mandarin TTS)**: Tích hợp công nghệ tổng hợp giọng nói `speakChinese(word)` cho cả chữ Hán đơn lẻ lẫn từng từ ghép ứng dụng.

### 2.3. Luyện viết tay trên khung 米字格 & Vòng lặp Linh thú đồng hành
- **Hai chế độ linh hoạt**:
  1. **Xem nét viết (Animate)**: Diễn họa từng nét bút thuận chuẩn xác với nét Chu sa đỏ (`#E11D48`) và bộ thủ nổi bật màu vàng Hoàng gia (`#F59E0B`).
  2. **Luyện viết tay (Interactive Quiz)**: Học viên trực tiếp rê chuột hoặc chạm màn hình để tô từng nét theo đúng thứ tự và hướng viết.
- **Vòng lặp phần thưởng trung thực (Honest Reward Loop)**:
  - Gửi dữ liệu về backend qua `/progress/practice` (`targetType = 'HANZI'`, `masteryScore = 100`, `expEarned = 15`).
  - Thưởng `+2 Măng Trúc 🎋` và điểm thân thiết cho linh thú thông qua `useCompanionStore`.
  - Kích hoạt biểu cảm vui mừng (`happy`) của linh thú 3D.
  - Đóng dấu triện đỏ thư pháp `<RedSealStamp text="通" />` ngay trên khung 米字格 xác nhận vượt ải thành công.

---

## 3. Kiến trúc Database & API Backend

- **Bảng `radicals`**: Quản lý 20 bộ thủ nền tảng (`radical`, `name_vi`, `han_viet`, `pinyin`, `stroke_count`, `meaning_vi`, `review_status`).
- **Bảng `hanzi`**: Lưu trữ chữ Hán, số nét, cấp độ HSK, chuỗi chiết tự (`decomposition`) và JSON các từ ghép ứng dụng (`example_words_json`).
- **Bảng liên kết `kanji_radicals`**: Ánh xạ quan hệ nhiều-nhiều giữa chữ Hán và các bộ thủ cấu thành.
- **DTO `KanjiResponse.java`**: Bổ sung `reviewStatus` và `needsHumanCheck` để đồng bộ trạng thái kiểm duyệt lên client.
