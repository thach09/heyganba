# Hệ sinh thái Giáo trình HSK Chuẩn (HSK Standard Course Ecosystem)

> **Trạng thái**: **Technical Preview & Migration Staging (`V6`) — Nội dung chờ thẩm định học thuật (`PENDING_REVIEW`)**  
> **Phạm vi triển khai**: Nâng cấp toàn diện 3 trạm học tập: Trạm Ngữ Pháp HSK (`/grammar`), Phòng Thi Thử HSK (`/exam`), và Thư Viện HSK / Sổ Từ vựng (`/dictionary`), kết nối đồng bộ với Giáo trình Từ vựng HSK 1.

---

## 1. Tổng quan Kiến trúc

Hệ sinh thái Giáo trình Chuẩn HSK (HSK Standard Course - HSK标准教程) thiết lập vòng tròn khép kín 4 góc học tập:

```
┌────────────────────────────────────────────────────────┐
│             GIÁO TRÌNH CHUẨN HSK (HSK 1)              │
├───────────────────┬───────────────────┬────────────────┤
│ 1. Trạm Từ vựng   │ 2. Trạm Ngữ pháp  │ 3. Thư viện    │
│    (/vocabulary)  │    (/grammar)     │    (/dictionary)
│  - 6 Bài học HSK 1│  - Cấu trúc HSK 1 │  - Tra cứu HSK │
│  - Thẻ 3D & SRS   │  - Góc nhìn người │  - Đọc đối thoại│
│  - Quiz Pinyin    │    Việt / Lỗi sai │    ngữ cảnh    │
│  - Ghi nhớ mặt chữ│  - Đóng dấu 通    │  - Lọc sổ từ   │
└───────────────────┴───────────────────┴────────────────┘
                           │
                           ▼
             ┌───────────────────────────┐
             │ 4. Phòng Thi Thử HSK      │
             │    (/exam)                │
             │  - Chuẩn thang điểm 200   │
             │  - Nghe hiểu + Đọc hiểu   │
             │  - Đóng triện 「合格」/「未过」│
             │  - Chẩn đoán câu sai      │
             └───────────────────────────┘
```

---

## 2. Trạm Ngữ Pháp HSK (`/grammar` — `GrammarView.tsx`)

### A. Cấu trúc Dữ liệu & Migration Staging `V6`
Hệ thống bổ sung 6 cấu trúc ngữ pháp HSK 1 cốt lõi thông qua file di trú `backend/src/main/resources/db/migration-staging/V6__hsk1_standard_course_grammar_and_exams.sql`:
1. **Đại từ nghi vấn (疑问代词)**: `什么 / 谁 / 哪 / 几 / 多少` — Hỏi thông tin sự vật, người, địa điểm, số lượng.
2. **Động từ năng nguyện (能愿动词)**: `会 / 能 / 想` — Diễn đạt năng lực học tập, khả năng khách quan và nguyện vọng chủ quan.
3. **Liên từ và Giới từ (连词与介词)**: `和 / 在` — Kết nối danh từ và biểu thị nơi chốn diễn ra hành động.
4. **Trợ từ ngữ khí (语气助词)**: `吧 / 了` — Đề nghị, thương lượng hoặc biểu thị sự thay đổi trạng thái.
5. **Câu vị ngữ tính từ với 很 (形容词谓语句)**: Cấu trúc tính từ làm vị ngữ không dùng `是`.
6. **Câu nhấn mạnh 是...的 (强调句)**: Nhấn mạnh thời gian, địa điểm, phương thức của hành động đã xảy ra.

### B. Điểm nhấn Học thuật: "Góc nhìn người Việt" (Common Mistakes for Vietnamese)
Mỗi cấu trúc ngữ pháp đều có mục phân tích lỗi sai điển hình mà người Việt thường mắc do thói quen dịch từng từ (word-by-word):
- **Lạm dụng "是" trước tính từ**: Người Việt hay nói *"Tôi là rất bận"* -> dịch sai thành `*我是很忙` (đúng phải là `我很忙`).
- **Nhầm lẫn vị trí đại từ nghi vấn**: Người Việt hay đưa từ hỏi lên đầu câu ("Cái gì đây?") -> dịch sai thành `*什么这是？` (đúng phải là `这是什么？`).
- **Phân biệt 会 vs 能 vs 想**: Tránh nhầm lẫn giữa kỹ năng do học mà biết (`会`), khả năng trong điều kiện cho phép (`能`), và mong muốn chủ quan (`想`).

### C. Trải nghiệm Tương tác & Mỹ thuật Cổ điển (OrientalCard)
- **Khối Cấu trúc cốt lõi (Core Formula Callout)**: Đóng khung đỏ chu sa / lam ngọc nổi bật công thức ngữ pháp trực quan.
- **Bật / Tắt Pinyin**: Nút toggle Pinyin cho phép người học linh hoạt ẩn phiên âm để rèn đọc mặt chữ Hán.
- **Phát âm Quan thoại (Mandarin TTS)**: Tích hợp `speakChinese` chuẩn giọng `zh-CN` trên từng câu ví dụ song ngữ.
- **Vòng lặp Luyện tập & Thưởng EXP**:
  - Trắc nghiệm điền từ và sắp xếp câu phản ánh cấu trúc vừa học.
  - Chấm điểm an toàn qua API backend, trao thưởng **+15 EXP** và **+2 Măng trúc (`🎋`)** cho linh vật đồng hành.
  - Đóng dấu mộc đỏ **`<RedSealStamp text="通" />`** xác nhận thông thạo.

---

## 3. Phòng Thi Thử HSK (`/exam` — `ExamView.tsx`)

### A. Chuẩn Thang điểm HSK 200
- Đánh giá theo chuẩn đề thi HSK cấp 1–2: **Thang điểm 0 – 200 điểm**.
- **Điểm đạt chuẩn (Passing Threshold)**: **120 / 200 điểm** (tương đương 60% tổng điểm).
- Quy đổi tự động từ số câu làm đúng:
  $$\text{Điểm HSK} = \text{round}\left(\frac{\text{Số câu đúng}}{\text{Tổng số câu}} \times 200\right)$$

### B. Quy trình Thi Đa phân mục (Multi-Section Runner)
1. **Phần 1: Nghe hiểu (听力 - Listening Section)**:
   - Phát âm Quan thoại tự động hoặc bấm nghe qua `speakChinese`.
   - **Tuyệt đối không để lộ chữ Hán đáp án trong văn bản câu hỏi** nhằm kiểm tra trung thực năng lực thính giác của thí sinh.
2. **Phần 2: Đọc hiểu & Ngữ pháp (阅读 - Reading Section)**:
   - Đọc câu văn ngữ cảnh, chọn từ ngữ/trợ từ thích hợp điền vào chỗ trống.
3. **Thanh Điều hướng Đề thi (Question Palette)**:
   - Hiển thị toàn bộ câu hỏi (1..N); màu sắc phân biệt câu đã làm (`border-seal bg-seal/10 text-seal`) và câu chưa làm.
   - Nhảy nhanh đến câu bất kỳ; đồng hồ đếm ngược báo giờ thi theo thời gian thực.

### C. Báo cáo Kết quả & Triện Chu Sa Chẩn đoán
- **Đóng triện kết quả**:
  - Đạt chuẩn ($\ge 120$ điểm): Đóng dấu triện đỏ **`「合格」 Đạt chuẩn`**.
  - Chưa đạt ($< 120$ điểm): Đóng dấu triện **`「未过」 Cần ôn luyện thêm`**.
- **Bảng phân tích chẩn đoán (Diagnostic Review)**:
  - Hiển thị từng câu làm sai kèm lời giải thích ngữ pháp chi tiết.
  - Nút chuyển hướng thông minh: "Ôn tập ngữ pháp" (mở `/grammar`) hoặc "Tra cứu từ vựng" (mở `/dictionary`) tương ứng với điểm yếu của bài thi.

---

## 4. Thư Viện HSK & Đọc hiểu Ngữ cảnh (`/dictionary` — `DictionaryNotebookView.tsx`)

### A. Nhãn Badge HSK & Tìm kiếm Đa chế độ
- Bổ sung huy hiệu **`HSK 1`**, **Từ loại** (Đại từ, Động từ, Danh từ...), và **Âm Hán Việt** trên từng thẻ kết quả tra cứu từ vựng.
- Phát âm chuẩn Quan thoại `speakChinese(v.word)` thay thế toàn bộ mã phát âm tiếng Nhật cũ.

### B. Tab Đọc hiểu Ngữ cảnh HSK (情境阅读)
Cung cấp 3 bài đối thoại và đoạn văn ngắn thực tế:
1. **Bài 1: Ở trường học (在学校)** — Ngữ cảnh giới thiệu trường lớp, bạn bè, thầy cô giáo.
2. **Bài 2: Tại quán ăn & Mua sắm (在饭馆和商店)** — Ngữ cảnh gọi món cơm nước, hỏi giá và mua táo theo cân.
3. **Bài 3: Hẹn gặp cuối tuần (周末见面)** — Ngữ cảnh hẹn gặp bạn bè, thời tiết Bắc Kinh và đi xe đạp.

**Tính năng hỗ trợ đọc hiểu**:
- **Toggle Pinyin**: Ẩn/Hiện dòng phiên âm Pinyin để rèn phản xạ nhận diện mặt chữ Hán.
- **Phát âm toàn bài**: Nghe đọc lưu loát toàn văn đoạn đối thoại.
- **Từ vựng trọng tâm**: Tổng hợp nhanh các từ khóa xuất hiện trong bài.
- **Bản dịch tiếng Việt**: Cho phép mở rộng đối chiếu bản dịch khi cần.
- **Kiểm tra hiểu bài tương tác**: 2 câu hỏi đọc hiểu kèm phản hồi chấm điểm và giải thích tức thì.

### C. Bộ lọc Sổ Từ & Luyện tập Nhanh
- Hộp tìm kiếm / lọc nhanh trong sổ tay cá nhân: lọc tức thời theo chữ Hán, Pinyin, Hán Việt hoặc nghĩa tiếng Việt.
- Nút bấm khởi chạy phiên luyện tập tự do riêng cho tập hợp các từ đã lọc.

---

## 5. Quy chuẩn Kỹ thuật & Cam kết Bảo vệ Dữ liệu

1. **Cô lập Staging & Quản trị Nội dung Học thuật**:
   - Toàn bộ nội dung mới nằm trong `backend/src/main/resources/db/migration-staging/V6__hsk1_standard_course_grammar_and_exams.sql`.
   - Trạng thái bắt buộc: `review_status = 'PENDING_REVIEW'` và `needs_human_check = true`.
   - Bảo toàn 38 từ vựng gốc `APPROVED` tại seed V2.
2. **100% SQL Idempotency & Sequence Synchronization**:
   - Mọi câu lệnh insert đều sử dụng `ON CONFLICT` hoặc `WHERE NOT EXISTS`.
   - Đồng bộ PostgreSQL sequences cho các bảng `lessons`, `vocabulary`, `grammar_rules`, `grammar_exercises`, `reading_passages`, `mock_exams` bằng `setval(pg_get_serial_sequence(...))`.
3. **Trung thực về EXP & Trạng thái Hệ thống**:
   - Không sinh dữ liệu giả (zero fake state).
   - Bảo toàn checkpoint khi mất kết nối mạng và gửi `attemptId` kháng trùng lặp.
