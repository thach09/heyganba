# Hệ Thống Linh Thú Đồng Hành (Chinese Companion Pet System)

> Trạng thái: Đã triển khai hoàn chỉnh tại `frontend/src/features/companion/`.

## 1. Mục tiêu kiến trúc & Tâm lý học học tập
Tạo điểm neo cảm xúc (emotional attachment) và vòng lặp giữ chân người học (retention loop) thông qua 4 linh thú mang đậm bản sắc văn hoá Á Đông, phản hồi trực quan theo thời gian thực trước mọi hành vi học tập.

## 2. Danh sách 4 Linh Thú Biểu Tượng (`petData.ts`)
1. **Đoàn Đoàn (团团 - Gấu Trúc Đại Hiệp)**:
   - Gấu trúc khổng lồ mặc băng đô đỏ hiệp khách, cầm nhánh măng trúc tươi mát.
2. **Đào Đào (淘淘 - Tiểu Hồng Miêu)**:
   - Gấu trúc đỏ tinh nghịch, tai viền trắng và chiếc đuôi sọc lông xù đung đưa mềm mại.
3. **Tiểu Ngộ Không (小悟空 - Kim Tầu Hầu)**:
   - Khỉ vàng mũi hếch thông minh đeo vòng kim cô vàng kim óng ánh.
4. **Ngự Miêu (御猫 - Mèo Hoàng Thượng Cố Cung)**:
   - Mèo hoàng gia Tử Cấm Thành lông trắng tuyền điểm vàng, đeo vòng cổ chuông đồng đỏ son.

## 3. Hoạt họa Vector Đa Lớp & 5 Trạng Thái Cảm Xúc (`mood`)
- `idle`: Nhịp thở phập phồng tự nhiên, chớp mắt chu kỳ 3.5s, bóng đổ co giãn theo nhịp thở. Chạm/click vào linh thú kích hoạt hiệu ứng nhảy nảy mầm (squish bounce) và bóng thoại song ngữ Trung - Việt.
- `studying`: Mắt tập trung cao độ, cầm bút lông thư pháp nghiên cứu văn tự.
- `happy`: Nhảy cẫng chúc mừng, mắt cười vòng cung (`^ ^`), bóng thoại reo mừng khi làm đúng.
- `sad`: Cụp tai nhẹ nhàng, bóng thoại vỗ về an ủi học viên thử lại.
- `eating`: Nhai măng trúc ngon lành, tim bay lơ lửng khi được cho ăn.

## 4. Vòng lặp Măng Trúc & Độ Thân Mật (`useCompanionStore.ts`)
- **Tích luỹ Măng Trúc**: Hoàn thành bài luyện tại Trạm Pinyin, Hanzi, hoặc Từ vựng tự động cộng `+2 Măng Trúc 🎋`.
- **Cho ăn & Tăng cấp thân mật**: Cho linh thú ăn măng trúc tăng `+25 EXP Thân mật`, kích hoạt trạng thái `eating`. Đạt đủ mốc EXP sẽ thăng cấp danh hiệu thân mật (Sơ tri -> Tương thức -> Tri kỷ -> Đồng tâm -> Bất ly).
- **Bộ nhớ cục bộ**: Lưu trữ an toàn trong `localStorage` (`heyganba_companion_state_v1`), không gián đoạn trải nghiệm ngoại tuyến.
