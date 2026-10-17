# Hệ sinh thái Giáo trình HSK Chuẩn (HSK Standard Course Ecosystem)

> **Trạng thái**: **Milestone M6 — Hoàn tất & Phê duyệt toàn diện (`APPROVED`)**  
> **Phạm vi triển khai**: Nâng cấp toàn diện các trạm học tập: Trạm Ngữ Pháp HSK (`/grammar`), Phòng Thi Thử HSK (`/exam`), và Thư Viện HSK / Đọc hiểu Ngữ cảnh (`/dictionary`), bao phủ trọn vẹn từ **HSK 1 đến HSK 6**. Toàn bộ dữ liệu đạt `review_status = 'APPROVED'` (`needs_human_check = false`).

---

## 1. Tổng quan Kiến trúc

Hệ sinh thái Giáo trình Chuẩn HSK (HSK Standard Course - HSK标准教程) thiết lập vòng tròn khép kín 4 góc học tập từ HSK 1 đến HSK 6:

```
┌────────────────────────────────────────────────────────┐
│             GIÁO TRÌNH CHUẨN HSK (HSK 1 – HSK 6)       │
├───────────────────┬───────────────────┬────────────────┤
│ 1. Trạm Từ vựng   │ 2. Trạm Ngữ pháp  │ 3. Thư viện    │
│    (/vocabulary)  │    (/grammar)     │    (/dictionary)
│  - HSK 1–6 bài học│  - Cấu trúc HSK1-6│  - Tra cứu HSK │
│  - Thẻ 3D & SRS   │  - Góc nhìn người │  - Đọc đối thoại│
│  - Quiz Pinyin    │    Việt / Lỗi sai │    HSK 1–6     │
│  - Ghi nhớ mặt chữ│  - Đóng dấu 通    │  - Lọc sổ từ   │
└───────────────────┴───────────────────┴────────────────┘
                           │
                           ▼
             ┌───────────────────────────┐
             │ 4. Phòng Thi Thử HSK      │
             │    (/exam)                │
             │  - HSK 1–2: Thang 200đ    │
             │  - HSK 3–6: Thang 300đ    │
             │  - Nghe + Đọc + Ngữ pháp  │
             │  - Đóng triện 合格/未过   │
             │  - Chẩn đoán câu sai      │
             └───────────────────────────┘
```

---

## 2. Trạm Ngữ Pháp HSK (`/grammar` — `GrammarView.tsx`)

### A. Cấu trúc Dữ liệu & Migration Staging `V9`
Hệ thống bổ sung cấu trúc ngữ pháp và bài tập tương tác chuẩn hóa từ HSK 1 đến HSK 6 thông qua file di trú `backend/src/main/resources/db/migration-staging/V9__hsk1_to_hsk6_complete_curriculum_and_grammar.sql`:
- **HSK 1**: Đại từ nghi vấn (`什么/谁/哪`), Động từ năng nguyện (`会/想/能`), Câu vị ngữ tính từ với `很`, Câu nhấn mạnh `是...的`.
- **HSK 2**: Câu so sánh chữ `比`, Cặp liên từ nhân quả/nhượng bộ (`因为...所以...`, `虽然...但是...`), Bổ ngữ trình độ với `得`, Bổ ngữ kết quả (`完/懂/见/到`), Trợ từ động thái `过` vs `着`, Câu cầu khiến `别/快要...了`.
- **HSK 3**: (1) Câu chữ `把` (`S + 把 + O + V + kết quả/vị trí`), (2) Câu bị động chữ `被`, (3) Bổ ngữ xu hướng kép (`V + 起来/下去/出来`), (4) Cấu trúc loại trừ/bổ sung `除了…以外，都/还/也…`, (5) Cấu trúc tăng tiến `越来越…` & `越 A 越 B`, (6) Liên từ `不但…而且…`.
- **HSK 4**: (1) Nhượng bộ `尽管…但是/还是…`, (2) Điều kiện bất kể `不管 / 无论…都…`, (3) Suy luận `既然…就…`, (4) Bổ ngữ khả năng (`V + 得/不 + Bổ ngữ`), (5) Phó từ ngữ khí `简直` vs `竟然`, (6) Giới từ căn cứ `按照` vs `根据`.
- **HSK 5**: (1) Chọn lựa đánh đổi `宁可…也不…` / `与其…不如…`, (2) Phó từ đánh giá `毕竟` / `未免` / `不妨`, (3) Phản vấn tăng tiến `尚且…何况…` / `何必`, (4) Kết cấu danh từ hóa `所 + Động từ`, (5) Giả định rủi ro `万一…就…`, (6) Cách dùng Thành ngữ 4 chữ (成语) làm vị ngữ/định ngữ.
- **HSK 6**: (1) Liên từ văn viết `鉴于…因此…`, (2) Giả định trang trọng `倘若 / 假使…便…`, (3) Thừa nhận - chuyển ý `固然…不过/然而…`, (4) Phủ định kép `未尝不…` / `无非是…`, (5) Câu phản vấn tu từ `岂不是…吗？`, (6) Tu từ song hành và điển cố Hán ngữ cao cấp.

---

## 3. Phòng Thi Thử HSK (`/exam` — `ExamView.tsx`)

### A. Chuẩn Thang điểm HSK Phân Cấp (200 điểm vs 300 điểm)
- **HSK 1 & HSK 2**: **Thang điểm 0 – 200 điểm** (Nghe hiểu 100 + Đọc hiểu 100).
  - **Điểm đạt chuẩn (Passing Threshold)**: **120 / 200 điểm** ($\ge 60\%$).
- **HSK 3, HSK 4, HSK 5, HSK 6**: **Thang điểm 0 – 300 điểm** (Nghe hiểu 100 + Đọc hiểu 100 + Ngữ pháp/Viết 100).
  - **Điểm đạt chuẩn (Passing Threshold)**: **180 / 300 điểm** ($\ge 60\%$).
- Quy đổi tự động từ số câu làm đúng:
  $$\text{Điểm HSK} = \text{round}\left(\frac{\text{Số câu đúng}}{\text{Tổng số câu}} \times \text{Thang điểm tối đa}\right)$$

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
