# Trạm Từ vựng & Ôn tập SRS (`/vocabulary`)

> **Trạng thái**: **Milestone M5 — Hoàn tất & Phê duyệt toàn diện (`APPROVED`)**  
> **Phạm vi M5**: Đã đối chiếu và mở khóa toàn bộ giáo trình HSK 1 (150 từ vựng tiêu chuẩn) và HSK 2 Standard Course (68 từ vựng mở rộng qua 4 bài học chuyên đề V8). Toàn bộ nội dung đạt `review_status = 'APPROVED'` (`needs_human_check = false`), mở tự do cho mọi học viên ôn tập SRS.

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
1. **Môi trường cơ sở dữ liệu kiểm thử**: Bộ 43 backend API integration tests ở trên thực thi trên **H2 in-memory test database (v2.3.232)**; việc áp dụng Flyway staging migration `V4__sample_lesson_greetings.sql` và xác thực Hibernate schema đã được **kiểm chứng thực tế thành công trên PostgreSQL 16.15 qua Docker rehearsal cô lập**. Tuy nhiên, đây là kiểm chứng migration/schema; toàn bộ bộ API tests vẫn chạy trên H2 trong CI/CD, chưa chuyển đổi sang PostgreSQL suite đầy đủ.
2. **Thẩm định học thuật**: Toàn bộ 10 từ vựng và câu ví dụ của bài mẫu M2.1 vẫn ở trạng thái **`PENDING_REVIEW`** (cờ `needs_human_check = true`), chưa có xác minh đối chiếu trên bản in vật lý và chưa có phê duyệt độc lập từ chuyên gia ngôn ngữ; không tuyên bố đạt chuẩn HSK.
3. **Chất lượng Audio**: Hệ thống hiện tại sử dụng Web Speech API client-side làm âm thanh tạm thời; chưa có file ghi âm phòng thu từ người bản xứ (native studio recordings).
4. **Quy định phát hành**: File di trú `V4` chỉ tồn tại ở `db/migration-staging`. Khi phát hành chính thức sau này, bắt buộc tạo migration mới trong `db/migration` với version riêng và quyết định duyệt riêng, không chuyển nguyên file V4 từ staging sang.

---

## 6. Biên bản M2.1.1 — Sửa lỗi tích hợp & Kiểm chứng PostgreSQL Rehearsal

### A. Các vấn đề tích hợp đã sửa:
1. **Xoá sổ từ giả còn sót (FlashcardView.tsx)**:
   - Gỡ bỏ hoàn toàn nhánh tạo sổ giả `id: 99`, `title: "Sổ từ mẫu (Admin Preview)"`, `itemCount: 3`.
   - Khi API danh sách sổ rỗng: hiển thị lựa chọn tạo sổ mới tường minh.
   - Khi API lỗi: hiển thị thông báo lỗi mạng/máy chủ kèm nút **"Tải lại danh sách"**; không thay thế lỗi bằng dữ liệu giả.
   - Khi tạo sổ mới thành công nhưng lưu từ thất bại: giữ nguyên ID sổ vừa tạo (`selectedNotebookId = targetId`) để lượt bấm Thử lại không tạo thêm sổ trùng.
2. **Tách biệt vòng đời Bài học & Phiên SRS**:
   - `loadLessons` không còn phụ thuộc `selectedLesson` (dùng functional state updater).
   - Đổi bài chỉ nạp từ vựng của bài đó (`loadSelectedLessonWords`), hoàn toàn không chạm tới hoặc reset phiên SRS đang diễn ra.
   - Khách vãng lai xem catalog bình thường; khi chuyển sang tab SRS sẽ thấy màn hình nhắc đăng nhập, không gửi request 401 không cần thiết.
   - Tách biệt hoàn toàn loading/error states: `catalogLoading`/`catalogError`, `lessonWordsLoading`/`lessonWordsError`, `srsLoading`/`srsError`, `notebookListLoading`/`notebookListError`.
   - Khi đăng nhập/đổi tài khoản: huỷ toàn bộ kênh request cũ (`useRequestScope`), xoá state riêng tư của người trước và tải lại đúng dữ liệu của tài khoản mới.
   - Sau khi chấm điểm SRS thành công, gọi `refreshStats()` để cập nhật số liệu mà không reset vị trí thẻ đang ôn.
   - Nút **Admin Preview** có tác dụng thật: khi Admin tắt xem trước, giao diện lọc sang góc nhìn học viên (chỉ thấy bài/từ đã `APPROVED`); khi bật, Admin thấy đầy đủ bản nháp `PENDING_REVIEW`.
3. **Khóa cố định Payload của lượt đánh giá SRS chờ gửi**:
   - Sử dụng cấu trúc `PendingSrsAttempt` bất biến gồm: `accountId`, `vocabularyId`, `rating`, `attemptId`.
   - Khi có lượt đánh giá đang chờ kết quả hoặc chờ retry, 4 nút rating bị khóa không cho đổi rating khác cho cùng thẻ.
   - Nút Thử lại gửi đúng toàn bộ payload ban đầu (cùng `attemptId` và `rating`) để backend replay chống ghi trùng.
   - Bọc submission trong `try/finally` đảm bảo cờ submitting được giải phóng; chặn gửi đồng thời.
   - Xác thực phiên/tài khoản khi response trả về; response từ phiên/tài khoản cũ không được chuyển thẻ của phiên mới.
   - Giữ thẻ khi lưu thất bại; màn hình kết thúc và phần thưởng companion chỉ kích hoạt đúng một lần. Không gọi `/progress/practice` tránh nhân đôi phần thưởng.
4. **Hiệu chỉnh Migration Staging V4 (`V4__sample_lesson_greetings.sql`)**:
   - Xoá bỏ câu lệnh `UPDATE vocabulary SET review_status = 'PENDING_REVIEW' WHERE review_status = 'APPROVED';` gây nguy cơ demote toàn bộ từ vựng đã duyệt của hệ thống.
   - Bổ sung đồng bộ sequence cho bảng `lessons` và `vocabulary` (`SELECT setval(pg_get_serial_sequence(...), ...)`).
   - Thêm mệnh đề `WHERE NOT EXISTS (SELECT 1 FROM vocabulary ex WHERE ex.word = v.word AND ex.lesson_id = l.id)` để thực sự ngăn trùng dữ liệu khi chạy lại V4.

### B. Kết quả Kiểm thử & Kiểm chứng Thực tế:
1. **Frontend**:
   - `npm run lint`: **0 errors**, 15 warnings (toàn bộ là warning có sẵn ở codebase cũ).
   - `npm run build`: **SUCCESS** (`✓ built in 1.63s`).
   - Bộ test `frontend/tests/unit/flashcard-lifecycle.test.tsx`: **6/6 tests PASSED** (modal sổ từ, chống tạo sổ trùng, khóa payload SRS, đổi bài không reset SRS, khách xem SRS).
   - Bộ test `frontend/tests/unit/pinyin.test.ts`: **13/13 tests PASSED**.
2. **PostgreSQL Rehearsal Thực tế (Maintainer đã chạy trên PostgreSQL 16.15 qua Docker)**:
   - **Xử lý môi trường build**: Lỗi xung đột `AuditLog.class` (tồn dư từ đợt tái cấu trúc trước) đã được giải quyết dứt điểm sau khi chạy `mvn clean test-compile`.
   - **Định dạng script**: File [scripts/verify-postgres-m21.ps1](file:///d:/GitHub/heyganba/scripts/verify-postgres-m21.ps1) được lưu dưới định dạng **UTF-8 with BOM** để tương thích tối đa với Windows PowerShell 5.1 và PowerShell 7.
   - **Lệnh thực thi**:
     ```powershell
     Set-Location "D:\GitHub\heyganba\backend"
     mvn clean test-compile
     Set-Location "D:\GitHub\heyganba"
     & "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File ".\scripts\verify-postgres-m21.ps1"
     ```
   - **Kết quả xác thực Surefire XML** (`TEST-com.heyganba.PostgresSchemaStagingRehearsalTest.xml`): **Cả 3 test cases đều PASS (0 failure, 0 error, 0 skip)**:
     - **Case A (`caseA_officialSchemaOnly`) — PASS**: Nạp V1-V3 trên `heyganba_rehearsal_a`, không có V4, bài `intro-greetings` không tồn tại, 38 từ HSK 1 của bài 1–3 bảo toàn trạng thái `APPROVED`.
     - **Case B (`caseB_stagingSchemaWithV4`) — PASS**: Nạp V1-V4 trên `heyganba_rehearsal_b`, bài `intro-greetings` có đúng 10 từ `PENDING_REVIEW` (`needs_human_check = true`), 38 từ cũ không bị đổi trạng thái; sequence tự sinh ID lớn hơn `MAX(id)` thực tế; kiểm tra kép Idempotency: Flyway migrate lại nạp 0 migration mới và nạp lại toàn bộ file SQL V4 không tạo bản ghi trùng lặp.
     - **Case C (`caseC_hibernateSchemaValidation`) — PASS**: Khởi động Spring context với PostgreSQL Schema Staging, khoá datasource qua command-line arguments, `ApplicationContextInitializer` kiểm tra trước refresh, Hibernate thực hiện `ddl-auto=validate` thành công (không dùng `create` hay `create-drop`), xác nhận kết nối `DataSource` thực tế trỏ thẳng tới database B.
   - **Phạm vi & Giới hạn khẳng định**:
     - Nội dung bài học và 10 từ vựng cốt lõi tiếp tục giữ nguyên trạng thái **`PENDING_REVIEW`**.
     - Kết quả kiểm chứng này xác nhận tính toàn vẹn của **Migration DDL/DML và Hibernate Entity Schema Validation** trên PostgreSQL 16.15 thực tế; **chưa thay thế việc thẩm định học thuật** từ chuyên gia và **chưa thay thế việc kiểm thử toàn bộ API backend trên PostgreSQL** (các API tests vẫn đang chạy trên H2 test profile).

---

## 7. Milestone M2.2 — Mở rộng Kho từ vựng Chủ đề HSK 1 & Bộ lọc Cấp độ (PENDING_REVIEW)

> **Trạng thái**: **Hoàn thiện Kỹ thuật & Migration Staging (Nội dung giữ PENDING_REVIEW)**  
> **Phạm vi M2.2**: Bổ sung **3 bài học chủ đề HSK 1** với **40 từ vựng sinh hoạt thường nhật**, mở rộng hệ thống bộ lọc cấp độ (`Nhập môn` vs `HSK 1`), tìm kiếm chủ đề bài học, và nhãn đánh dấu trạng thái chờ duyệt trên từng từ vựng.

### A. Danh mục 3 Bài học Chủ đề & 40 Từ vựng HSK 1 Mới:

1. **Bài học 1: Gia đình & Xưng hô (`family-members`) — HSK 1 (13 từ vựng)**:
   - Từ vựng: `家` (nhà, gia đình), `爸爸` (bố), `妈妈` (mẹ), `哥哥` (anh trai), `姐姐` (chị gái), `弟弟` (em trai), `妹妹` (em gái), `儿子` (con trai), `女儿` (con gái), `有` (có), `没` (không có / phủ định quá khứ), `个` (lượng từ cái, người), `几` (mấy, bao nhiêu).
   - Ngữ cảnh ví dụ song ngữ: Giới thiệu các thành viên trong gia đình và cấu trúc lượng từ căn bản.
2. **Bài học 2: Thời gian & Lịch (`time-calendar`) — HSK 1 (14 từ vựng)**:
   - Từ vựng: `现在` (bây giờ), `点` (giờ), `分` (phút), `今天` (hôm nay), `明天` (ngày mai), `昨天` (hôm qua), `年` (năm), `月` (tháng), `号` (ngày, số), `星期` (tuần, thứ), `上午` (buổi sáng), `中午` (buổi trưa), `下午` (buổi chiều), `时候` (khi, lúc).
   - Ngữ cảnh ví dụ song ngữ: Hỏi giờ, ngày tháng, hẹn gặp và các mốc thời gian trong ngày.
3. **Bài học 3: Ăn uống & Mua sắm (`dining-shopping`) — HSK 1 (13 từ vựng)**:
   - Từ vựng: `吃` (ăn), `喝` (uống), `茶` (trà), `水` (nước), `米饭` (cơm trắng), `苹果` (táo), `菜` (món ăn, rau), `买` (mua), `钱` (tiền), `块` (đồng, tệ), `喜欢` (thích), `想` (muốn, nghĩ), `多少` (bao nhiêu).
   - Ngữ cảnh ví dụ song ngữ: Gọi món, mua hàng và diễn đạt sở thích sinh hoạt.

### B. Cơ chế Kỹ thuật & Bảo vệ Dữ liệu:

1. **Cách ly Staging & Quản trị Nội dung Học thuật**:
   - File di trú: `backend/src/main/resources/db/migration-staging/V5__hsk1_thematic_curriculum_expansion.sql`.
   - Toàn bộ 40 từ vựng được gán tường minh `review_status = 'PENDING_REVIEW'` và `needs_human_check = true`.
   - Tổng cộng sau M2.2: Có đúng **50 từ vựng pending** (10 từ M2.1 + 40 từ M2.2) trên 4 bài học staging.
   - **Bảo toàn 38 từ vựng gốc** của bài 1–3 (`APPROVED`) trong seed V2; tuyệt đối không can thiệp trạng thái dữ liệu cũ.
   - Idempotency & Sequence Sync: Cả `lessons` và `vocabulary` đều được bảo vệ bằng `ON CONFLICT DO UPDATE` và `WHERE NOT EXISTS`, đồng thời gọi `SELECT setval(pg_get_serial_sequence(...), COALESCE((SELECT MAX(id) FROM ...), 1))` để ngăn ngừa xung đột ID khi tạo mới bản ghi.

2. **Frontend UI/UX Nâng cao (`FlashcardView.tsx`)**:
   - **Thanh lọc Cấp độ Giáo trình**: Hỗ trợ chuyển đổi nhanh giữa `Tất cả`, `Nhập môn`, và `HSK 1` kèm số lượng bài học tương ứng.
   - **Tìm kiếm Chủ đề**: Tìm theo tiêu đề, mô tả hoặc slug bài học theo thời gian thực; có màn hình trạng thái rỗng và nút huỷ lọc thuận tiện.
   - **Phân định Cột mốc**: Hiển thị rõ `Bản thảo Nhập môn / M2.1` vs `Bản thảo HSK1 / M2.2` trên từng thẻ bài học.
   - **Huy hiệu Chờ duyệt (`Chờ duyệt`)**: Đánh dấu trực quan các từ vựng chưa qua thẩm định học thuật trên bảng từ vựng bài học.
   - **Không sinh dữ liệu giả**: Duy trì nguyên tắc không tráo đổi fake state, giữ nguyên payload khi có lỗi mạng và phản hồi trung thực kết quả từ backend.

3. **Kiểm thử Tự động & Rehearsal**:
   - **Frontend**: Bổ sung bộ test chuyên biệt `frontend/tests/unit/flashcard-m22.test.tsx` kiểm thử toàn bộ luồng lọc cấp độ, tìm kiếm, hiển thị huy hiệu `Chờ duyệt`, luyện phản xạ quiz Pinyin, và xử lý lỗi mạng trung thực.
   - **PostgreSQL Rehearsal**: Nâng cấp `PostgresSchemaStagingRehearsalTest.java` và `scripts/verify-postgres-m21.ps1` kiểm tra toàn bộ 5 version Flyway (V1–V5), kiểm chứng kép idempotency cho cả V4 và V5, xác nhận 50 từ pending, 38 từ approved, đồng bộ sequence và Hibernate `ddl-auto=validate`.

---

## 8. Milestone HSK Standard Course Ecosystem — Mở rộng Giáo trình HSK 1 (Migration V6)

> **Trạng thái**: **Hoàn thiện Kỹ thuật & Migration Staging `V6` (Nội dung giữ `PENDING_REVIEW`)**  
> **Phạm vi V6**: Bổ sung **2 bài học HSK 1 chuẩn** với **30 từ vựng cốt lõi** về Trường học, Công việc, Địa điểm, Thời tiết, Sức khỏe, nâng tổng số từ vựng staging lên **80 từ vựng pending** (bảo toàn 38 từ `APPROVED` gốc).

### A. Danh mục 2 Bài học Mới:
1. **Bài học 1: Trường học, Công việc & Địa điểm (`school-work-places`) — HSK 1 (16 từ vựng)**:
   - Từ vựng: `学校` (trường học), `学生` (học sinh), `老师` (giáo viên), `同学` (bạn học), `朋友` (bạn bè), `工作` (công việc, làm việc), `医院` (bệnh viện), `医生` (bác sĩ), `商店` (cửa hàng), `饭馆` (quán ăn), `在` (ở, tại), `哪儿` (ở đâu), `那里` (chỗ đó, đằng kia), `这儿` (ở đây), `中国` (Trung Quốc), `北京` (Bắc Kinh).
2. **Bài học 2: Thời tiết, Sức khỏe & Đời sống (`weather-health-daily`) — HSK 1 (14 từ vựng)**:
   - Từ vựng: `天气` (thời tiết), `热` (nóng), `冷` (lạnh), `下雨` (mưa), `身体` (thân thể, sức khỏe), `好` (khỏe, tốt), `水` (nước), `水果` (hoa quả), `看` (nhìn, xem, đọc), `听` (nghe), `说` (nói), `读` (đọc), `写` (viết), `字` (chữ, chữ Hán).

### B. Kiểm thử & Idempotency:
- Staging migration `backend/src/main/resources/db/migration-staging/V6__hsk1_standard_course_grammar_and_exams.sql`.
- Toàn bộ 30 từ được gán `PENDING_REVIEW` (`needs_human_check = true`).
- 100% bảo vệ chống trùng lặp `ON CONFLICT` / `WHERE NOT EXISTS` và `setval(pg_get_serial_sequence(...))` đồng bộ ID.
- Mở rộng Rehearsal Suite (`PostgresSchemaStagingRehearsalTest.java`) kiểm chứng V1–V6 và dual-run idempotency V4, V5, V6.

---

## 9. Milestone M4 — Hoàn tất Chuẩn 150 Từ vựng HSK 1 & Nâng cấp Trạm Chữ Hán (Migration V7)

> **Trạng thái**: **Hoàn thành Mục tiêu Giáo trình 150 Từ vựng HSK 1 Benchmark (Nội dung mới giữ `PENDING_REVIEW`)**  
> **Phạm vi V7**: Thêm đúng **32 từ vựng HSK 1 chuẩn** trong 2 bài học chuyên đề, nâng tổng từ vựng staging lên **112 từ vựng pending**. Khi kết hợp với 38 từ `APPROVED` gốc từ V2, hệ thống đạt mốc chính xác **150 từ vựng HSK 1 chuẩn quốc tế**.

### A. Danh mục 2 Bài học Chuyên đề Cuối (32 từ vựng):
1. **Bài học 1: Giao thông, Phương hướng & Di chuyển (`transport-directions`) — HSK 1 (16 từ vựng)**:
   - Từ vựng: `飞机` (máy bay), `出租车` (xe taxi), `火车站` (ga xe lửa), `开` (lái xe, mở), `住` (ở, cư trú), `回` (về, quay lại), `上` (trên, lên), `下` (dưới, xuống), `前面` (phía trước), `后面` (phía sau), `怎么` (thế nào, sao), `怎么样` (ra sao, thế nào), `东西` (đồ vật, đồ đạc), `杯子` (cốc, ly), `电脑` (máy tính), `电视` (ti vi).
2. **Bài học 2: Hành động, Giao tiếp & Đời sống (`actions-courtesy-daily`) — HSK 1 (16 từ vựng)**:
   - Từ vựng: `打电话` (gọi điện thoại), `睡觉` (ngủ), `看见` (nhìn thấy), `听见` (nghe thấy), `认识` (quen biết), `高兴` (vui vẻ), `漂亮` (xinh đẹp), `小` (nhỏ, bé), `少` (ít), `些` (một vài, một ít), `喂` (alo, này), `对不起` (xin lỗi), `学习` (học tập), `电影` (phim điện ảnh), `衣服` (quần áo), `猫` (con mèo).

### B. Chỉ số Đạt được & Kỹ thuật:
- **Tổng số từ vựng HSK 1**: 38 từ `APPROVED` (V2) + 112 từ `PENDING_REVIEW` (V4: 10 + V5: 40 + V6: 30 + V7: 32) = **Đúng 150 từ vựng HSK 1**.
- **Cơ sở dữ liệu Bộ thủ & Chữ Hán**: Khởi tạo 20 bộ thủ nền tảng (`radicals`) và mở rộng cấu trúc chiết tự (`decomposition`) cùng các từ ghép ứng dụng (`example_words_json`) trong bảng `hanzi`.
- **Idempotency & Sequence Sync**: Bảo đảm 100% tái chạy không lỗi qua `ON CONFLICT` và lệnh `SELECT setval(...)` cho tất cả các bảng: `lessons`, `vocabulary`, `hanzi`, `radicals`.



