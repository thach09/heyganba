# AI Agent Working Guidelines — Japanese Learning Platform

Tài liệu này dùng để brief cho agent code (Claude Code hoặc tương đương) trước khi bắt tay vào bất kỳ phase nào trong `roadmap.md`.

## Vai trò tổng hợp

Agent phải tự đóng đồng thời các vai trò sau trong mọi tác vụ, không chỉ viết code theo yêu cầu:

**Senior Developer** — viết code đúng chuẩn đã chốt trong `decisions-and-learnings` (versioning `/api/v1/`, JWT qua Spring Security, Flyway migration, `ApiResponse` wrapper, BCrypt), không tự ý đổi convention giữa chừng.

**Tech Lead** — trước khi implement, kiểm tra tính nhất quán với kiến trúc đã có (schema, luồng auth, cấu trúc thư mục); nếu yêu cầu mới xung đột với quyết định cũ, phải nêu rõ và hỏi lại thay vì tự quyết.

**Business Analyst** — đối chiếu yêu cầu với roadmap, phát hiện phần mô tả chưa rõ hoặc thiếu (vd: rule chấm điểm ngữ pháp chưa nói case đặc biệt nào), chủ động hỏi trước khi code thay vì tự đoán.

**QA / Tester** — với mỗi tính năng, viết test cho luồng chính và ít nhất 1 edge case; test riêng cho phân quyền (user thường không gọi được API admin).

**Giáo viên tiếng Nhật** — với nội dung học thuật (kana / kanji / từ vựng / ngữ pháp / ví dụ / mnemonic), agent tự soạn nội dung
thay vì chờ người duyệt từng câu, nhưng phải: bám đúng ngữ pháp tiếng Nhật, viết lại bằng lời của mình (không copy nguyên văn
nguồn có bản quyền), gắn cảnh báo `DRAFT — chờ duyệt` ở đầu mỗi file seed, và **tự tra cứu nguồn ngoài khi không chắc chắn**
(cách đọc hiếm, số nét, license dữ liệu bên thứ ba...) rồi ghi lại kết quả kiểm chứng trong báo cáo tiến độ.

## Quyền hạn

**Được phép:**
- Tạo/sửa file trong phạm vi phase đang làm.
- Viết và chạy Flyway migration mới.
- Seed dữ liệu đã được duyệt (không tự bịa nội dung tiếng Nhật).
- Viết test, cập nhật `docs/` và `CHANGELOG`.

**Không được phép:**
- Đổi kiến trúc lõi đã chốt (stack, schema bảng lõi, cơ chế auth) mà không xin xác nhận trước.
- Xoá hoặc sửa dữ liệu production ngoài phạm vi migration đã duyệt.
- Tự seed nội dung tiếng Nhật (kana/kanji/từ vựng/ngữ pháp) vào bảng chính thức khi chưa có xác nhận đã qua người biết tiếng Nhật duyệt — chỉ được đưa vào bảng nháp/staging.
- Thêm dependency mới ngoài phạm vi phase mà không nêu lý do.
- Tự chuyển sang phase tiếp theo khi phase hiện tại chưa được xác nhận hoàn thành.

## Nguyên tắc làm việc

- Báo cáo/giải thích súc tích, đi thẳng vào vấn đề chính, không lặp lại cùng một ý.
- Không dán code hoặc snippet minh hoạ trong báo cáo tiến độ — mô tả bằng lời, code xem trực tiếp trong file.
- Mọi tính năng mới ở frontend phải nhất quán thao tác với các trạm đã có (phím tắt, cách submit, cách hiển thị đúng/sai) — không tạo pattern UX riêng cho từng trạm.
- Mọi endpoint mới phải qua kiểm tra phân quyền trước khi coi là hoàn thành.

## Báo cáo tiến độ theo phase

Sau mỗi phase, agent báo cáo ngắn gọn gồm 3 phần:
1. Đã hoàn thành gì (đối chiếu với mục "Hoàn thành khi" trong roadmap).
2. Còn thiếu/chưa làm gì.
3. Rủi ro hoặc quyết định cần Thach xác nhận trước khi qua phase tiếp theo.

## Kinh nghiệm bắt buộc nhớ khi viết seed SQL (Flyway)

Đã từng làm vỡ migration 2 lần, các điểm sau phải tự kiểm trước khi commit:

- **Không được để dấu `;` bên trong chuỗi** (kể cả tiếng Việt/Nhật): Flyway tách statement theo `;` nên file sẽ vỡ với lỗi
  `syntax error at or near ")"`. Dùng dấu phẩy hoặc chữ "và".
- **Dòng cuối trong danh sách `VALUES` không có dấu phẩy thừa** trước `)`.
- **Thứ tự cột phải khớp giữa danh sách giá trị và alias** `AS x(col1, col2, ...)` — hay sai khi vừa thêm cột `slug` vừa thêm
  `order_index`.
- Luôn tạo unique index + `ON CONFLICT ... DO NOTHING` để seed chạy lại không sinh dữ liệu trùng.
- **Nối thêm row vào file `VALUES` đã có (viết theo từng chunk) rất dễ sai dấu phẩy**: dòng cuối của chunk đã ghi phải có `,`
  thì chunk mới mới nối được, và dòng cuối cùng của cả danh sách thì KHÔNG được có `,`. Lỗi này chỉ lộ khi chạy migration
  (`syntax error at or near "("` hoặc `")"`) — không thấy khi chỉ đọc code.
- Verify bằng cách chạy migration thật trên PostgreSQL local + **đếm số bản ghi** sau khi apply (không chỉ tin "migration chạy không lỗi").
  Cách nhanh, không cần restart app:
  ```powershell
  docker cp backend/src/main/resources/db/migration/V12__*.sql heyganba-postgres:/tmp/v12.sql
  docker exec heyganba-postgres psql -U postgres -d heyganba -v ON_ERROR_STOP=1 -c 'BEGIN' -f /tmp/v12.sql `
    -c 'SELECT count(*) FROM grammar_exercises' -c 'ROLLBACK'
  ```
  (BEGIN + ROLLBACK để thử cú pháp/dữ liệu trước rồi mới để Flyway apply thật khi restart backend.)

## Kinh nghiệm khi smoke test trên PostgreSQL thật (H2 trong test KHÔNG bắt được)

- **`@Transactional(readOnly = true)` + ghi dữ liệu = 500 trên PostgreSQL**: `GrammarService.checkAnswer` từng được chấm điểm
  trong transaction readOnly nên INSERT `study_activities` bị PostgreSQL chặn (`cannot execute INSERT in a read-only transaction`).
  Test H2 không phát hiện. Vì vậy: sau khi **thêm ghi dữ liệu vào một method đang readOnly**, phải đổi annotation thành `@Transactional`
  (mặc định) và **gọi thử endpoint thật**. Hiện có guard test `checkAnswerMustStayWritableTransaction` cho case này.
- **Biến môi trường `SPRING_*` rò rỉ giữa các lệnh trong cùng terminal**: nếu trước đó đã chạy `SPRING_DATASOURCE_URL=...migrationcheck mvn test`
  thì mọi lệnh sau (kể cả `mvn spring-boot:run`) sẽ dùng DB đó → app fail với `FATAL: database "..." does not exist`, hoặc
  **toàn bộ test đỏ 68 case** vì mất context. Luôn `Remove-Item Env:SPRING_DATASOURCE_URL,...` ở **cùng lệnh** trước khi chạy lại.
- **Trên Windows, `mvn clean` fail khi app đang chạy** (`Failed to delete ...\target\classes\...`) vì file bị khoá.
  Dừng tiến trình đang giữ cổng 8080 trước khi build/clean, rồi mới `spring-boot:run`.

## Quy tắc nội dung chờ duyệt & múi giờ (quyết định của Thach — bắt buộc tuân thủ)

- **Nội dung CHƯA được duyệt tiếng Nhật phải nằm ở `backend/src/main/resources/db/migration-staging`**, không được
  đặt vào `db/migration` (thư mục đó chạy ở CẢ production). `application-prod.yml` chỉ trỏ `classpath:db/migration`;
  local/staging trỏ cả 2 thư mục. Guard test: `FlywayLocationsConfigTest` (kiểm tra cả version trùng giữa 2 thư mục).
  Promote = chuyển file sang `db/migration` + `UPDATE review_status='APPROVED'` sau khi có người duyệt.
- **Mọi bản ghi nội dung mới phải để `review_status = 'PENDING_REVIEW'`** (mặc định từ V13). Khi thêm bảng/bảng mới có
  nội dung học thuật, thêm cột `review_status` + index và khai báo trong `ContentReviewStatusService` để
  `GET /content/review-status` phản ánh đúng (đừng để nội dung nháp bị coi là đã sẵn sàng).
- **Múi giờ "ngày học" là `Asia/Ho_Chi_Minh` ở mọi môi trường** (`app.streak.zone`, mặc định trong `StreakService.DEFAULT_ZONE`).
  Mọi logic "một ngày" (streak, heatmap, TTL cache SRS, cron job) phải lấy theo zone này, KHÔNG hardcode UTC
  (trước đây heatmap/cache dùng UTC nên user học 0h–7h sáng giờ VN bị tính sang ngày hôm trước).
- **Redis chưa bật** (chưa có managed instance): giữ `APP_SRS_CACHE=memory`. Code `RedisSrsDueCache` đã viết sẵn,
  không xoá; khi có Redis managed chỉ đổi biến môi trường.

## Kinh nghiệm vận hành Render (đã gặp thật khi deploy lần đầu)

- **`PUT /v1/services/{id}/env-vars` của Render API THAY THẾ toàn bộ env vars** (không phải upsert): gọi API với 2 biến
  đã làm mất `SPRING_DATASOURCE_URL`, `CORS_ALLOWED_ORIGINS`, `APP_*`. Luôn gửi **đủ bộ** trong 1 lần gọi.
- **`SPRING_DATASOURCE_URL` phải là JDBC URL** (`jdbc:postgresql://host:5432/db`). Map `fromDatabase.property: connectionString`
  sẽ ra `postgresql://...` → app chết với `Driver org.postgresql.Driver claims to not accept jdbcUrl`. Đúng cách: map
  `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` để `application.yml` tự ghép JDBC URL.
- **Free tier 512MB RAM**: JVM mặc định chỉ lấy ~25% heap → app khởi động treo/lâu, health check fail. Đặt
  `ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"`.
- **Không hardcode `ENV PORT` trong Dockerfile**: Render set `PORT` (mặc định 10000) và route vào port đó; app đọc
  `server.port: ${PORT:8080}`. Cũng không cần `HEALTHCHECK` trong Dockerfile — Render dùng `healthCheckPath`.
- **`application-prod.yml` để `root: WARN` từng làm deploy treo mà không có log nào** → giữ `INFO` cho
  `org.springframework.boot` (thấy `Tomcat started on port(s)`), `org.flywaydb` (tiến trình migration), `com.zaxxer.hikari`.
- Đọc log qua API: `GET /v1/logs?ownerId=<ownerId>&resource=<srv-id>&direction=backward` (ownerId lấy từ `/v1/owners`);
  **nhật ký API này không đọc được khi ẩn danh** (403) nên cần API key.
- Deploy đang chạy mà trigger deploy mới sẽ bị chặn → `POST /v1/services/{id}/deploys/{deployId}/cancel` trước.
- `commitId` sai trong body deploy trả **404** (không tạo deploy rác) — nhưng tốt nhất bỏ trống để dùng commit mới nhất của branch.

## Kinh nghiệm viết integration test

- Test class nào chạm bảng nội dung (kana / vocabulary / kanji / grammar) phải `extends ContentApiTestBase`
  (`src/test/java/com/heyganba/support/`) để xoá dữ liệu theo đúng thứ tự khoá ngoại — nếu không, test sẽ đỏ tuỳ theo
  thứ tự chạy của Surefire chứ không phải do code sai.
- **Mọi class test đụng bảng người dùng (users / roles / streaks / exam / study_activity) cũng phải extend base class**,
  kể cả test auth / RBAC / security hardening: đừng tự gọi `userRepository.deleteAll()` vì `mock_exams`, `exam_results`,
  `study_activities`, `srs_reviews` đều tham chiếu `users` → PostgreSQL/H2 báo
  `Referential integrity constraint violation ... mock_exams FOREIGN KEY(user_id)`. Lỗi này **chỉ lộ tuỳ thứ tự chạy**
  (thứ tự trên CI Linux khác Windows) nên local có thể xanh mà CI đỏ.
  Cách phát hiện sớm ở local (đã dùng để tìm ra lỗi CI thật):
  ```powershell
  mvn -B test '-Dsurefire.runOrder=random' '-Dsurefire.runOrder.random.seed=1'   # thử vài seed khác nhau
  ```
- Khi chạy test với biến môi trường trỏ DB khác (migration check), nhớ `Remove-Item Env:SPRING_...` sau khi chạy, nếu không
  các lần chạy test sau sẽ dùng nhầm DB và fail với lỗi driver H2.
