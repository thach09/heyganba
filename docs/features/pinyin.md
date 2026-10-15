# Trạm Bính Âm (Pinyin Station)

> Trạng thái dữ liệu học thuật: **PENDING_REVIEW** (Bản thảo kỹ thuật M1 đối chiếu Đề án Pinyin Hán ngữ 1958; đang chờ thẩm định học thuật chính thức).
> Trạng thái kỹ thuật: **Technical Preview & Internal Verification Ready** (Giao diện, bộ lọc giọng Quan thoại, chuẩn hóa input và kết nối backend đã sẵn sàng).

## 1. Nguồn học thuật tham chiếu
- **Văn bản chuẩn**: *Đề án Phương án Pinyin Hán ngữ (汉语拼音方案)* do Quốc hội Trung Quốc phê chuẩn 11/02/1958.
- **Hệ thống thanh mẫu**: 21 thanh mẫu phụ âm chính thức (`b, p, m, f, d, t, n, l, g, k, h, j, q, x, zh, ch, sh, r, z, c, s`) + 2 dạng ký tự chính tả mở đầu (`y`, `w` / 零声母).
- **Hệ thống vận mẫu (36 vận)**: 
  - 6 vận mẫu đơn (`a, o, e, i, u, ü`).
  - 13 vận mẫu phức/kép (`ai, ei, ao, ou, ia, ie, iao, iou/iu, ua, uo, uai, uei/ui, üe`).
  - 16 vận mẫu mũi (8 mũi trước: `an, en, in, ün, ian, uan, uen/un, üan`; 8 mũi sau: `ang, eng, ing, ong, iang, iong, uang, ueng`).
  - 1 vận mẫu đặc biệt cuộn lưỡi (`er`).
- **Thanh điệu & Ngữ cảnh**:
  - 4 thanh cơ bản: Thanh 1 (55), Thanh 2 (35), Thanh 3 (214 hình thức từ điển / 211 Bán thượng trong lời nói liền trước các thanh 1, 2, 4 và thanh nhẹ), Thanh 4 (51).
  - Thanh nhẹ (Khinh thanh / 轻声).
  - Quy tắc biến điệu: Hai thanh 3 (`3+3 -> 2+3`), Biến điệu 一 (`yī`) và 不 (`bù`).

## 2. Tính năng kỹ thuật
- **Lộ trình nhập môn 6 chặng**: Hướng dẫn tuần tự từ cấu tạo âm tiết, 4 thanh điệu, thanh mẫu, vận mẫu, quy tắc chính tả đến biến điệu ngữ lưu.
- **Bảng tra cứu âm tương tác**: Phân tách rõ ràng giữa **"Nghe âm tiết quy ước (呼读音)"** và **"Nghe từ/âm tiết ví dụ"** (tránh hiểu lầm chữ Hán ví dụ là âm thanh cô lập của phụ âm).
- **Biểu đồ sóng cao độ tương tác (Tone Contour Interactive Wave)**: Minh họa đường cao độ 5 bậc Ngũ độ chế, hiển thị rõ cả dạng từ điển (214) lẫn dạng ngữ cảnh (211 Bán Thượng / 35 biến điệu).
- **Bài luyện nhận biết (Pinyin Quiz)**:
  - Bộ chuẩn hóa Pinyin (`canonicalizePinyin`): Hỗ trợ cả gõ có dấu (`hǎo`) và số thanh (`hao3`), chuẩn hóa khoảng trắng/chữ hoa/NFC/NFD, giữ nguyên phân biệt dấu thanh và không làm mất khác biệt giữa `u` và `ü` (`lù` khác `lǜ`).
  - Đề bài nghe không tiết lộ đường cong thanh điệu trong tiêu đề trước khi học viên trả lời.
  - Tích hợp ghi nhận tiến độ qua API `/progress/practice`, xử lý lỗi kết nối an toàn (không cộng ảo EXP khi offline/thất bại).
- **Bộ lọc giọng Quan thoại (Mandarin Voice Filter)**: Chỉ chấp nhận giọng chuẩn Quan thoại (`zh-CN`, `zh-Hans-CN`, `cmn-*`, `zh-SG`), loại trừ hoàn toàn tiếng Quảng Đông (`zh-HK`, `zh-MO`, `yue`) và các phương ngữ khác.
- **Cơ chế kiểm duyệt (Academic Review Gating)**: Màn hình cảnh báo kiểm duyệt dành cho người học thông thường; chế độ Admin Preview (`?preview=1` hoặc toggle) dành cho quản trị viên và giáo viên thẩm định.
