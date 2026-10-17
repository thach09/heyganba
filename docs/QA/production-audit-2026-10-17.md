# Audit sản phẩm, giao diện và bảo mật — 17/10/2026

## Kết quả và phạm vi

Triển khai yêu cầu M6 và prompt audit tiếp theo trên nền commit M6 hiện có. Prompt audit ghi “7 phases” nhưng chỉ cung cấp Phase 1–5; báo cáo đối chiếu cả năm phần thực sự được cung cấp. Lượt audit này không deploy và các thay đổi vẫn chưa commit; không sửa DB production, không đổi giới hạn ghi admin 30/phút và không tạo migration `language_code`.

Đã bổ sung theme sáng/tối, sửa bố cục/đèn lồng, mở đủ bộ lọc sáu cấp, sắp xếp câu, tiến độ theo cấp, nhiệm vụ có nhận thưởng thật, ví măng theo tài khoản, sửa ghi chú và các kiểm soát bảo mật bên dưới. Dữ liệu đại diện sáu cấp không đồng nghĩa toàn bộ giáo trình hoặc đề chính thức. [Nguồn và số lượng thực tế](../m6-curriculum-sources.md).

## Phase 1 — vệ sinh và chuyển đổi

| Yêu cầu | Thực hiện / bằng chứng |
| --- | --- |
| Dọn file tạm | Bỏ năm script refactor M6 dùng một lần; xoá helper `clean.mjs` và `restore-fixtures.mjs` không được sử dụng ở frontend. Giữ builder giáo trình, nguồn TSV, script rehearsal và test có thể chạy lại. Artifact/log/dump nằm trong `backups/`, không vào Git. |
| Chuẩn hoá env | Root và `backend/.env.example` không chứa JWT/mật khẩu mẫu; `.gitignore` loại mọi `.env.*` trừ template, dump và log. Compose yêu cầu secret; profile mặc định prod, dev phải chọn tường minh. Role migration được tách khỏi role runtime. |
| UI tiếng Trung / Việt | Sửa form quản trị Pinyin/phồn thể, tên chữ Hán, toast, placeholder, ví dụ mẫu và tiêu đề. DTO chữ Hán bỏ hai trường cách đọc cũ; API từ điển trả `hanzis`. Frontend dùng endpoint `/hanzi`, backend giữ alias lịch sử. Loại hai dịch vụ speech frontend không dùng; TTS server chuyển sang zh-CN và cache key có ngôn ngữ. |
| Nội dung cũ | API phát âm cũ và catalog nhập cũ tắt mặc định; tạo đề không chỉ rõ cấp mặc định HSK 1. Các test tương thích bật riêng cờ legacy. 19 tài liệu cũ được đưa vào `docs/archive/pre-conversion/`, vị trí cũ trỏ tới tài liệu hiện hành. Không coi hồ sơ cũ là hướng dẫn sản phẩm. |
| Encoding | File mới/sửa UTF-8; Java không BOM, script PowerShell rehearsal giữ BOM cho PS5. Tự xem tiếng Việt và chữ Hán trên ảnh desktop/mobile. |

**Giới hạn chuyển đổi có chủ đích:** chưa xoá tên lớp Java, tên bảng/cột hay alias URL lịch sử. V1–V9 giữ checksum; hồ sơ lịch sử và giấy phép bên thứ ba vẫn giữ nguyên văn. Vì vậy không tuyên bố repo hoàn toàn không còn mọi chuỗi tên cũ. Đây là tương thích kỹ thuật và truy vết, không phải trạm học đang phát hành. Không tự suy ra rằng đã có migration tách ngôn ngữ được founder duyệt.

## Phase 2 — giao diện

| Yêu cầu | Thực hiện / bằng chứng |
| --- | --- |
| Đèn lồng | Nằm trong trần tối đa 68px, main chừa 80px. Ẩn khi scrollY >20, hiện lại ở đầu. Lắc ±2,5°/4,5 giây, reduced motion. Unit test kiểm tra đúng ranh giới 20/21px và cleanup listener; browser so bounding box với tiêu đề. |
| Theme | `useTheme` khởi tạo trước render, đồng bộ html/localStorage/tab, vẫn đổi được khi storage bị chặn. Sidebar và mobile đều có công tắc. Màu nền/thẻ/viền/mực/nhấn theo palette trong prompt, được ghi ở DESIGN.md. |
| Tương phản | Tách màu chữ nhỏ `*-ink` khỏi màu nền nhấn và chọn on-accent theo theme. Test tính độ tương phản từ CSS thật, yêu cầu ≥4,5:1 cho chữ chính/phụ, màu nhấn trên nền/thẻ/tint 10% và chữ trên nút. Không dùng trắng cố định trên đỏ theme tối. |
| Motif và overlap | OrientalCard dùng tag trong flow, góc hồi văn và watermark dọc không bắt sự kiện. Sửa lớp nền để không phủ thẻ; thẻ lật co giãn theo nội dung. Bảng admin có chiều rộng tối thiểu và cuộn trong vùng riêng trên mobile. Không phát hiện tràn ngang/badge-title collision trong ma trận browser. |
| Tài nguyên viết | Hanzi Writer 3.5.0 và nét của 75 chữ chuyển về cùng origin; giữ giấy phép, pin SHA-512 nguồn và SHA-256 từng tệp. Tránh lỗi CDN bị CSP chặn. |

Ma trận ảnh: 8 màn (dashboard, vocabulary, grammar, hanzi, pinyin, reading, exam, admin) ×2 theme ×3 chiều rộng 1440/1024/390 =48 trường hợp. Có thêm ảnh dashboard sau cuộn, roadmap và sắp xếp câu. Chạy trên build production với cùng bộ header của `vercel.json`, không chỉ trên dev server. Xem ảnh ở `backups/audit-ui/`; kết quả DOM/API ở `layout-results.json`. Impeccable detector thoát 0, không xuất báo cáo văn bản; kết luận hình ảnh dựa trên ảnh đã xem và kiểm tra browser.

Tổng cộng lưu 66 ảnh: 48 màn hình chính và 18 ảnh bổ sung (dashboard cuộn, roadmap, câu đã chấm ở mỗi theme/kích thước). Không có tràn ngang, lỗi API ngoài 403 ở màn admin hoặc va chạm tag/tiêu đề trong kết quả.

## Phase 3 — tính năng và dữ liệu

| Trạm / yêu cầu | Hành vi đã kiểm tra |
| --- | --- |
| Dashboard | Heatmap/biểu đồ từ nhật ký thật, tuần tính từ thứ Hai theo ngày học VN. HSK 1–6 đếm từ riêng đã ôn nhớ và điểm ngữ pháp đã làm đúng, loại bản nháp. Không tính trùng từ giữa bài học. |
| Nhiệm vụ | 10 SRS →30 EXP/2 măng; 3 lượt viết đúng →25/2; đúng 5 ngữ pháp hoặc nộp một đề →50/3. Server kiểm tra điều kiện/ngày/tài khoản, khoá user và unique claim; retry không cộng hai lần. EXP nhận thưởng vào tổng EXP. |
| Linh thú | Ví khởi tạo 6 măng một lần/tài khoản, cho ăn giảm 1 và tăng 25 điểm thân thiết. Không lấy số dư/điểm từ localStorage; hoạt ảnh không tự phát tiền. Tách điểm thân thiết khỏi EXP học tập. |
| Pinyin | Giữ bảng 21+2 /36, đường nét thanh điệu, nửa thanh 3, 3+3→2+3, lộ trình sáu bước và quiz. TTS Quan thoại, không chọn giọng ngôn ngữ khác để đọc chữ Hán. Giọng thực tế phụ thuộc gói giọng của trình duyệt/OS. |
| Chữ Hán | Lọc sáu cấp, 20 nút bộ thủ, tìm bốn cách, chiết tự/từ ghép/TTS, xem và luyện nét 米字格. EXP hiển thị sau khi máy chủ xác nhận; lượt sai không có EXP, không tin scoreDelta/expEarned do client gửi. |
| Từ vựng | Bộ lọc/URL/back sáu cấp, bài theo chủ đề, thẻ lật, SRS SM-2, gõ Pinyin dấu/số/ü-v và lưu vào sổ. |
| Ngữ pháp | Công thức/lưu ý/ví dụ/Pinyin/TTS, trắc nghiệm và sắp câu từng cấp. Token trùng có ID riêng, bỏ chọn/xếp lại, chấm ở server. Đáp án không gửi trước, retry cùng attemptId. Sắp câu không bị lọt vào đề trắc nghiệm. |
| Từ điển / sổ từ | Tra chữ/Pinyin/Hán Việt/nghĩa, đọc chín bài qua sáu cấp với toggle và quiz. Thêm/sửa ghi chú văn bản thuần, search và quick drill. PUT/DELETE của user khác bị 404, dữ liệu chủ sổ còn nguyên. |
| Thi thử | 200/120 cấp 1–2, 300/180 cấp 3–6, trọng số 100 mỗi phần. Nghe không in câu cần nghe, timer/palette/kết quả/nhật ký, câu APPROVED, chủ sở hữu và nộp lại có kiểm soát. Đây là bài luyện nội bộ; Ngữ pháp không thay thế phần Viết chính thức. |
| Curriculum / migration | V9 thêm 337 từ và bộ nội dung nâng cao đại diện; V10 thêm 6 câu sắp xếp từ ví dụ đã duyệt và hai bảng thưởng. Rehearsal chạy V1–V10, chạy seed lại hai lần, kiểm tra sequence và Hibernate validate. Không tạo user/lịch sử thi giả trong seed. |

Chỉ báo luyện tập không phải chứng nhận năng lực. Viết tay và quiz phát âm phía trình duyệt vẫn là tín hiệu do client báo, không phải cơ chế giám sát chống gian lận. Nội dung V9 APPROVED theo yêu cầu M6; chưa có bằng chứng hội đồng độc lập đã duyệt toàn bộ. Nội dung mới ngoài ngoại lệ này vẫn PENDING_REVIEW.

## Phase 4 — kiểm soát bảo mật

| Mục prompt | Kết quả trong repo / kiểm chứng |
| --- | --- |
| #4 Debug | Không tìm thấy console.log/debug, System.out hoặc printStackTrace trong source first-party đang chạy. Vite 8 dùng Rolldown dropConsole/dropDebugger tương đương esbuild.drop cũ; sourcemap false, không có file .map trong dist, bỏ directive map thừa ở vendor. |
| #5 Frontend secrets | VITE chỉ dùng URL API, lựa chọn cookie và DSN Sentry public. JWT/password DB không vào frontend. Template secret trống, env riêng bị ignore. |
| #6 Lỗi | server.error never cho stack/message/binding, tắt whitelabel. SQL/DataAccess/generic chỉ trả thông báo chung + X-Correlation-ID, log chi tiết ở server. Test cố tình ném lỗi SQL xác nhận không có tên lớp/SQL/trường DB trong JSON. |
| #7–8 Payload/upload | Multipart và Tomcat 2MB, JSON 64KB giữ nguyên. Không có endpoint upload nên kiểm định extension/magic bytes chưa áp dụng; phải thêm nếu mở upload. |
| #9 Validation | Controller dùng Validated/Valid, ID dương nơi phù hợp, giới hạn query/page/size/HSK, chuỗi DTO có trần. Ghi chú từ chối HTML/control chars; React render văn bản, không chèn HTML. ID dictionary âm chỉ dành tương thích catalog đã tắt mặc định. |
| #10 IDOR | Dùng authenticated principal; sổ từ/thi/SRS/tiến độ gắn user. Pen test user B PUT/DELETE mục của A →404 và kiểm DB nguyên vẹn. Mastery trả DTO riêng; User còn có JsonIgnore cho passwordHash, secret 2FA, tokenVersion. |
| #11 RBAC | Anonymous admin →401, USER đọc queue/approve-all →403. Giới hạn ghi vẫn 30/phút/admin. |
| #12 SQLi | JPA/named parameters/JdbcTemplate binding; pagination/sort theo trường cố định. Test hai payload SQLi qua dictionary/vocabulary, sau đó đếm bảng không đổi. |
| #13–14 Header | HTTPS HSTS 31536000/includeSubDomains/preload, CSP, nosniff, DENY, referrer và Permissions-Policy. API JSON CSP nghiêm hơn gợi ý trong prompt; frontend không thêm unsafe-inline cho script. |
| #15 Cookie | HttpOnly, Secure prod, SameSite=Lax; giữ Origin/custom transport header cho refresh/logout cookie. Profile dev chỉ dùng localhost khi bật tường minh. |
| #16 CORS | Chỉ origin HTTP(S) tường minh, từ chối wildcard/cấu hình trống. Preflight evil origin bị 403, không có ACAO cho origin đó. |
| #17–18 DB/Redis | Compose bind loopback. Script tạo role runtime tách role migration. Thử trên DB restore: CRUD=true, sequence=true, CREATE schema=false. Không tự áp role vào production. |
| #19–20 Proxy/ops | Framework forwarded filter chạy sau trust filter. IP/scheme chỉ nhận từ peer được tin, CF header phải có hop Cloudflare xác minh, bỏ forwarded host. Unit test spoofing. Có backup PS/sh, retention và runbook WAF/monitoring/phục hồi. Blueprint Render yêu cầu khai báo proxy CIDR và thông tin DB/Flyway trong Dashboard; cần dùng dải peer thật của nhà cung cấp và origin đang triển khai trước khi public. |

Các hướng dẫn và nguồn chính thức ở [security-and-ops.md](../security-and-ops.md). Chưa xác minh firewall/DNS/TLS/WAF/preload registry/secret rotation/scheduler/cảnh báo trên hạ tầng public. Limiter in-memory cần lớp giới hạn chia sẻ nếu chạy nhiều replica. Không tuyên bố “100% production-ready” hoặc an toàn trước mọi tấn công.

## Phase 5 — kết quả kiểm chứng

| Bộ kiểm tra | Kết quả |
| --- | --- |
| Maven clean test | 254 ca: 250 chạy, 0 failure, 0 error, 4 skip opt-in. Có 6 ca SecurityHardeningPenTest, 3 ca proxy, 5 ca insights/reward/order/privacy. |
| PostgreSQL 16.15 | Ba ca rehearsal A/B/C chạy riêng: 3 pass, 0 skip. V1–V10, seed twice-idempotent, sequence, Hibernate validate. Một test pilot catalog lịch sử còn skip, không thuộc catalog tiếng Trung đang phát hành. |
| Frontend unit | 18 suite, 134 ca pass, gồm theme/persistence/tab/storage bị chặn, lantern20/21, duplicate token, sáu cấp và tương phản màu từ CSS. |
| Frontend legacy harness | 8 pass. |
| Lint / build | 0 lỗi; còn các warning lint về effect/regex và một số import test cũ. Build còn cảnh báo chunk 3D companion khoảng 545kB, chưa được coi là lỗi build. |
| Browser | 48 trường hợp route/theme/width, 66 ảnh đã lưu; không tràn ngang, không badge-title collision, không lỗi API bất ngờ. Sắp câu HSK 6 được gửi và chấm đúng bằng API thật. |
| Backup / restore | PS và sh tạo dump đã kiểm tra. Phục hồi sang DB mới được 560 vocabulary /90 grammar_exercises; quyền role runtime kiểm tra riêng. Retention chỉ nhắm dump đúng mẫu trong thư mục đã xác định. |
| Git | `git diff --check` không có lỗi whitespace. Không sửa checksum migration đã áp dụng, không tạo commit hay deploy. |

Log và ảnh nằm trong `backups/audit-*` (được ignore), không chứa bằng chứng đã triển khai public. Maven dùng output riêng tránh IDE ghi đè bytecode trong target; đây là lý do có `build.output.root` trong pom và script rehearsal.

## Lệnh tái kiểm và commit đề xuất

Chạy frontend từ `frontend/`:

```powershell
npm run lint
npm run test:unit
npm run test:legacy
npm run build
```

Chạy backend từ `backend/` (output cô lập tuỳ chọn):

```powershell
mvn clean test -Dbuild.output.root=D:/GitHub/heyganba/backups/audit-target
```

Từ root, tạo rehearsal riêng trên cổng còn trống:

```powershell
& "$env:SystemRoot/System32/WindowsPowerShell/v1.0/powershell.exe" -ExecutionPolicy Bypass -File scripts/verify-postgres-m21.ps1 -Port 15443
```

Browser: khởi động backend rehearsal và `npm run preview -- --host 127.0.0.1 --port 15174` với `DEV_API_TARGET=http://127.0.0.1:18089`; chạy `node tests/audit-layout.mjs` từ frontend. Chỉ dùng DB thử riêng. Biến M6_ADMIN_EMAIL/PASSWORD là tài khoản thử cục bộ nếu muốn chụp form admin; không dùng credential production. Script mặc định chỉ chấp nhận API localhost.

Các lệnh Git sau chỉ là đề xuất để người dùng xem diff rồi thực hiện; chưa được chạy:

```powershell
git diff --check
git add -- .env.example backend/.env.example .gitignore README.md PRODUCT.md render.yaml docker-compose.yml backend/pom.xml backend/src frontend/DESIGN.md frontend/PRODUCT.md frontend/index.html frontend/vercel.json frontend/vite.config.ts frontend/src frontend/tests frontend/public/vendor frontend/public/hanzi-data docs scripts
git diff --cached --stat
git commit -m "feat: complete Chinese learning flows, themes, and security audit"
```
