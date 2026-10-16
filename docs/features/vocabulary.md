# Trạm Từ vựng & Ôn tập SRS (`/vocabulary`)

> **Trạng thái**: **Milestone M2.1 — Technical Preview / Bản thảo chờ thẩm định (`PENDING_REVIEW`)**  
> **Phạm vi M2.1**: Đúng **1 bài mẫu** ("Chào hỏi và giới thiệu bản thân", 10 từ vựng cốt lõi), chưa triển khai toàn bộ M2 hoặc HSK 1-6. Không tự gán chuẩn HSK khi chưa có ánh xạ học thuật chính thức; sử dụng nhãn cấp độ **"Nhập môn"**.

---

## 1. Mục tiêu và Kiến trúc

Trạm Từ vựng hoàn thiện luồng học tập khép kín:
$$\text{Chọn bài} \longrightarrow \text{Xem danh sách từ} \longrightarrow \text{Học ngữ cảnh} \longrightarrow \text{Lưu sổ cá nhân} \longrightarrow \text{Ôn SRS đến hạn} \longrightarrow \text{Ghi nhận tiến độ}$$

Hệ thống phân tách rạch ròi 2 chế độ học tập:
1. **Học theo bài (Giáo trình)**:
   - Danh sách bài học tải từ `/vocabulary/lessons`.
   - Xem toàn bộ từ vựng được phép xem của bài đó (không phụ thuộc vào việc từ có đến hạn ôn hay không).
   - Hiển thị mục tiêu bài, cấp độ "Nhập môn", số từ thực tế và bảng từ vựng chi tiết.
   - Thẻ nhớ 3D học từ trong ngữ cảnh: mặt trước chỉ hiện chữ Hán lớn, lật mặt sau mới hiện Pinyin, Âm Hán Việt, từ loại, nghĩa tiếng Việt và câu ví dụ song ngữ.
   - Luyện phản xạ (Quiz): câu hỏi gõ Pinyin tuyệt đối không để lộ đáp án trước khi trả lời; hệ thống chuẩn hóa Pinyin (`canonicalizeChineseWordPinyin`) bảo toàn thanh điệu, phân biệt nghiêm ngặt `u` vs `ü`, và từ chối chữ Hán làm đáp án Pinyin.
2. **Ôn đến hạn (SRS SM-2)**:
   - Dùng API SRS backend (`/flashcard/due-today` và `POST /flashcard/review`).
   - Phân biệt rõ từ đến hạn ôn (`dueToday`) và từ mới được đưa vào phiên (`isNew`).
   - Mặt trước thẻ ôn SRS chỉ hiển thị chữ Hán; lật thẻ để kiểm tra trí nhớ.
   - Đánh giá độ nhớ bằng 4 nút chuẩn backend: **Quên (`FORGOT`)**, **Khó (`HARD`)**, **Thuộc (`GOOD`)**, **Rất dễ (`EASY`)**.
   - Khi hoàn thành tất cả thẻ trong phiên, hiển thị màn hình kết thúc rõ ràng; không tự quay vòng lặp thẻ vô tận.

---

## 2. Chi tiết Bài mẫu M2.1 ("Chào hỏi và giới thiệu bản thân")

- **Slug**: `intro-greetings`
- **Cấp độ**: Nhập môn (không tự gắn nhãn HSK khi chưa thẩm định)
- **Nguồn tài liệu dự kiến cần xác minh**:
  - *Tên giáo trình dự kiến*: *Giáo trình Hán ngữ (Hanyu Jiaocheng - 汉语教程)*, Tập 1 Quyển Thượng.
  - *Tác giả / Biên soạn*: Dương Ký Châu (Yang Jizhou / 杨寄洲), Đại học Ngôn ngữ và Văn hóa Bắc Kinh (BLCUP).
  - *Phạm vi bài học dự kiến phân bổ từ vựng*:
    - Bài 1 (你好 - Xin chào): **你**, **好**.
    - Bài 2 (汉语不太难 - Tiếng Hán không khó lắm): **谢谢**.
    - Bài 3 (明天见 - Ngày mai gặp lại): **再见**.
    - Bài 5 (这是王老师 - Đây là thầy giáo Vương): **是**, **我**, **人**.
    - Bài 6 (我学汉语 - Tôi học tiếng Hán): **叫**, **什么**, **名字**.
- **Trạng thái học thuật**: **Bản nháp chưa xác minh nguồn trên tài liệu vật lý**, giữ nguyên **`PENDING_REVIEW`** (cờ `needs_human_check = true`). Tuyệt đối **không tự nhận đã đối chiếu bản in chính thức**, **chưa nhận được chuyên gia duyệt** và **không tuyên bố đạt chuẩn HSK**.
- **Dữ liệu di trú**: Flyway Staging Migration `backend/src/main/resources/db/migration-staging/V4__sample_lesson_greetings.sql` (cô lập tại staging, không đưa vào production migration).

### Danh mục 10 từ vựng mẫu:
| # | Chữ Hán | Pinyin | Âm Hán Việt | Từ loại | Nghĩa tiếng Việt | Câu ví dụ ngữ cảnh (Chữ Hán / Pinyin / Tiếng Việt) |
|---|---|---|---|---|---|---|
| 1 | **你** | nǐ | nhĩ | đại từ | bạn, anh, chị (ngôi 2 số ít) | 你好！ / Nǐ hǎo! / Chào bạn! |
| 2 | **好** | hǎo | hảo | tính từ | tốt, khỏe, đẹp, ổn | 你好吗？ / Nǐ hǎo ma? / Bạn khỏe không? |
| 3 | **我** | wǒ | ngã | đại từ | tôi, mình, tớ (ngôi 1) | 我是学生。 / Wǒ shì xuésheng. / Tôi là học sinh. |
| 4 | **叫** | jiào | khiếu | động từ | tên là, gọi là, bảo | 我叫李明。 / Wǒ jiào Lǐ Míng. / Tôi tên là Lý Minh. |
| 5 | **什么** | shénme | thậm ma | đại từ | cái gì, gì | 你叫什么名字？ / Nǐ jiào shénme míngzi? / Bạn tên là gì? |
| 6 | **名字** | míngzi | danh tự | danh từ | tên, họ tên | 这是我的名字。 / Zhè shì wǒ de míngzi. / Đây là tên của tôi. |
| 7 | **是** | shì | thị | động từ | là, phải, đúng | 他是老师。 / Tā shì lǎoshī. / Thầy ấy là giáo viên. |
| 8 | **人** | rén | nhân | danh từ | người | 我是越南人。 / Wǒ shì Yuènán rén. / Tôi là người Việt Nam. |
| 9 | **谢谢** | xièxie | tạ tạ | động từ | cảm ơn | 谢谢你！ / Xièxie nǐ! / Cảm ơn bạn! |
| 10 | **再见** | zàijiàn | tái kiến | động từ | tạm biệt, hẹn gặp lại | 明天再见！ / Míngtiān zàijiàn! / Ngày mai gặp lại! |

---

## 3. Quy tắc Kết nối Sổ từ cá nhân & SRS

1. **Phân lập hoàn toàn giữa Sổ từ và Lịch SRS**:
   - Lưu từ vào Sổ từ cá nhân (`VocabNotebook`) phục vụ mục đích tự gom nhóm, ghi chú riêng của học viên.
   - Hành động lưu từ vào sổ **không tạo ra lịch SRS thứ hai** và **không thay đổi khoảng cách ôn tập SRS** của từ trong giáo trình.
   - Luyện tập trong sổ từ là hoạt động tự do ngoài phiên SRS giáo trình.
2. **Kháng lặp và Idempotency khi cập nhật SRS**:
   - Mỗi lần đánh giá SRS gửi kèm một UUID `attemptId`.
   - Nếu gặp sự cố mạng, giao diện giữ nguyên thẻ hiện tại và nút Thử lại (`Retry`), tái sử dụng chính xác `attemptId` ban đầu để backend loại trừ ghi nhận trùng lặp.
   - Thẻ chỉ được chuyển sang thẻ kế tiếp sau khi máy chủ phản hồi xác nhận thành công.
   - Không gọi thêm `/progress/practice` để tránh thưởng kinh nghiệm kép cho cùng một phiên SRS.

---

## 4. Kiểm soát Bản quyền & Thẩm định Nội dung (`ContentAccess`)

- **Người dùng thông thường / Khách**: Chỉ xem được các bài học và từ vựng đã được phê duyệt chính thức (`review_status = 'APPROVED'`). Các bài đang `PENDING_REVIEW` bị lọc hoàn toàn ở backend; nếu người dùng cố ý thêm `?preview=1`, giao diện hiển thị cảnh báo từ chối quyền truy cập.
- **Quản trị viên (`ROLE_ADMIN`)**: Được phép bật chế độ xem trước (Admin Preview) để nghiệm thu nội dung bản thảo M2.1 trước khi phát hành.

---

## 5. Kết quả Nghiệm thu Kỹ thuật & Giới hạn Thực tế (M2.1 Technical Preview)

### A. Bằng chứng Kiểm thử Thực tế
1. **Frontend Unit & Build Checks**:
   - `vitest run tests/unit/pinyin.test.ts`: **13/13 tests PASSED (100%)**, bao phủ từ đơn, từ ghép (`xièxie`, `zàijiàn`, `shénme`, `míngzi`), thanh nhẹ 5, phân biệt `u`/`ü` và từ chối chữ Hán dán vào ô nhập Pinyin.
   - `npm run lint`: **0 errors**, 14 warnings (cảnh báo `set-state-in-effect` có sẵn từ codebase cũ ở `GrammarView` và `ExamView`).
   - `npm run build` (`tsc -b && vite build`): **SUCCESS**, bundle sạch.
   - **Luồng dữ liệu**: Đã gỡ bỏ toàn bộ fallback tự tráo dữ liệu mock; query param không thể tự cấp quyền admin; lỗi mạng được hiển thị trung thực kèm nút Thử lại.
2. **Backend Test Suite (Do Maintainer chạy trực tiếp cục bộ)**:
   - Lệnh: `mvn "-Dtest=VocabularyApiTest,FlywayLocationsConfigTest,DictionaryNotebookApiTest,LearningMutationRetryTest,VocabNotebookServiceTest,FlashcardApiTest" test`
   - Kết quả: **43 tests run, 0 failures, 0 errors, 0 skipped — BUILD SUCCESS** (thời gian: 25.548s).
   - Kiểm chứng luồng:
     - `VocabularyApiTest`: Lọc bài pending cho user thường, mở bài pending cho admin, chặn user thường xem từ pending theo ID, lưu từ giáo trình M2.1 đã duyệt vào Sổ từ cá nhân, đọc lại từ trong sổ và từ chối ghi trùng lặp (4/4 tests passed).
     - `FlywayLocationsConfigTest`: Khoá profile `prod` chỉ nạp `db/migration`, cách ly hoàn toàn thư mục staging `db/migration-staging`.
     - `LearningMutationRetryTest`: Kháng lặp SRS qua `attemptId`, retry không tăng `repetitions`, không tăng EXP hai lần.
     - `DictionaryNotebookApiTest` & `VocabNotebookServiceTest`: Phân lập sổ cá nhân theo `userId`, người khác không xem/sửa được sổ riêng.

### B. Giới hạn Kỹ thuật & Nội dung Cần Xác minh Thêm (Chưa Đạt Chuẩn Production)
1. **Môi trường cơ sở dữ liệu kiểm thử**: Toàn bộ 43 backend tests ở trên thực thi trên **H2 in-memory test database (v2.3.232)**; việc áp dụng Flyway staging migration `V4__sample_lesson_greetings.sql` trên **PostgreSQL production/staging instance thực tế vẫn chưa được xác minh trực tiếp**.
2. **Thẩm định học thuật**: Toàn bộ 10 từ vựng và câu ví dụ của bài mẫu M2.1 vẫn ở trạng thái **`PENDING_REVIEW`** (cờ `needs_human_check = true`), chưa có xác minh đối chiếu trên bản in vật lý và chưa có phê duyệt độc lập từ chuyên gia ngôn ngữ; không tuyên bố đạt chuẩn HSK.
3. **Chất lượng Audio**: Hệ thống hiện tại sử dụng Web Speech API client-side làm âm thanh tạm thời; chưa có file ghi âm phòng thu từ người bản xứ (native studio recordings).
4. **Quy định phát hành**: File di trú `V4` chỉ tồn tại ở `db/migration-staging`. Khi phát hành chính thức sau này, bắt buộc tạo migration mới trong `db/migration` với version riêng và quyết định duyệt riêng, không chuyển nguyên file V4 từ staging sang.
