# Master readiness review — 19/10/2026

## Kết luận

Đây là kết quả kiểm tra cục bộ trên commit `220fb2573bac470008f3eba1d57ce995351ed45d`, branch `feat/v2.1-ux-and-stability`, cùng các thay đổi đang có trong working tree. **Chưa đủ bằng chứng để gọi bản này production-ready hoặc triển khai.** V13 cố ý đưa 560 từ vựng cũ về `PENDING_REVIEW`; chưa có từ nào trong corpus có nguồn nghĩa tiếng Việt độc lập được xác nhận. Bản build đúng commit trên không thành công. Log build Vercel không truy cập được. LCP lab vẫn chậm hơn nhiều so với mục tiêu. Cần review ngôn ngữ/conten và chủ vận hành hoàn tất các hạng mục BLOCKED bên dưới.

Không có lệnh stage/commit/push/merge/deploy; không gọi API thật bên ngoài, không thao tác database dịch vụ thật và không xóa/reset cơ sở dữ liệu. Các database PostgreSQL 16, tài khoản, từ thi thử tổng hợp, API và ảnh chụp của phiên QA đều nằm trong môi trường local cô lập. Không dùng tài khoản QA để duyệt nội dung học thuật.

## Baseline và phạm vi working tree

Trước các sửa đổi của lượt này, ghi nhận branch/HEAD, trạng thái staged/unstaged/untracked và SHA-256 cho 43 đường dẫn trong [master-baseline-2026-10-19.json](master-baseline-2026-10-19.json). Bản sao byte-for-byte và diff ban đầu được lưu trong thư mục ignored `backups/master-readiness-2026-10-19/baseline/`, `unstaged.diff`, `staged.diff`, `initial-status.txt`. Staged diff ban đầu rỗng. Nội dung có sẵn của maintainer được lưu trong baseline; mục “Delta so baseline” ở cuối liệt kê chính xác 10 file baseline có chỉnh sửa có chủ đích trong lượt này và 33 file còn nguyên byte.

Manifest baseline ghi commit `220fb25` làm mốc, không phải trạng thái hiện tại của working tree. Các script/PDF/database/log/ảnh bằng chứng chỉ nằm trong `backups/master-readiness-2026-10-19/` (ignored), trừ báo cáo/manifest/script được liệt kê ở cuối. `render.yaml` được chuyển byte-identical khỏi root sang `docs/archive/pre-selfhost/render.yaml`; đây là bản lưu lịch sử, không phải blueprint đang hoạt động.

## Syllabus, corpus và điều kiện xuất bản

Nguồn chuẩn dùng để đối chiếu là [Chinese Test — syllabus](https://www.chinesetest.cn/syllabus) và PDF syllabus HSK 3.0 tải từ máy chủ Chinese Test: [PDF chính thức](https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf). SHA-256 PDF: `ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941`. Tệp nguồn 4,636,209 byte và bản trích xuất đầy đủ chỉ lưu ngoài repo trong ignored backup. Tool [compare-hsk-syllabus.py](../../scripts/compare-hsk-syllabus.py) kiểm tra checksum, trang trích xuất, số thứ tự 1–11000, phân cấp, và fail closed nếu cấu trúc không khớp. Unit tests parser: 4/4 passed. Không phân phối lại PDF hoặc danh sách Hán tự/từ vựng có bản quyền; báo cáo public chỉ có số liệu/mã mục cần xem xét, không chép toàn bộ danh sách.

PDF ghi hiệu lực 01/07/2026 trên trang bìa; thông báo Chinese Test về kỳ thi toàn cầu [ghi ngày triển khai 13/12/2026](https://old.chinesetest.cn/gonewcontent.do?flag=kdnew&id=51336883). Đây là hai mốc khác nhau. Tiêu chuẩn nền tảng HSK của Bộ Giáo dục Trung Quốc, GF0025-2021, có [trang thông tin của Bộ](https://jsj.moe.gov.cn/n2/7001/7001/1573.shtml), hiệu lực 01/07/2021 và hệ 3 bậc/9 cấp. So sánh này chỉ dùng PDF HSK 3.0 nêu trên làm đối chiếu 6 cấp; không tuyên bố đây là chứng nhận HSK.

Script trích xuất giữ nguyên cấp phụ ghi trong ngoặc (ví dụ `1（2）（4）`), dạng khoảng (`2（7-9）`), từ đồng âm có số thứ tự, POS và biến thể; không tự chuẩn hóa thanh điệu hay biến thể để tạo “khớp”. Kết quả [hsk3-comparison-2026-10-19.json](hsk3-comparison-2026-10-19.json) so trên export PostgreSQL sau migration V13, chỉ chọn curriculum nội bộ `INTERNAL_SIX_LEVEL_SELECTION_V9` để loại fixture QA. Mức khớp “word and reading” là so khớp chuỗi có chuẩn hóa chữ hoa/khoảng trắng và Pinyin có dấu; **không** xác nhận nghĩa, ví dụ, POS, tính đúng/ngữ cảnh, cấp chính thức hoặc chất lượng học thuật. Một hàng nội bộ có thể khớp nhiều mục chính thức.

| Cấp | Số mục chính trong syllabus | Khớp chữ + Pinyin | Mã mục chưa khớp |
|---|---:|---:|---:|
| 1 | 300 | 200 | 100 |
| 2 | 200 | 75 | 125 |
| 3 | 500 | 68 | 432 |
| 4 | 1,000 | 48 | 952 |
| 5 | 1,600 | 45 | 1,555 |
| 6 | 1,800 | 14 | 1,786 |

Các mục chưa khớp là hàng đợi đối chiếu của con người, không phải kết luận tự động rằng các từ đó cần nhập hoặc rằng từ hiện có sai. Corpus lịch sử có 560 bản ghi, 528 chữ/từ khác nhau; sau V13: 560 `PENDING_REVIEW`, 560 `needs_human_check`, không còn hàng `APPROVED`. Có 21 hàng cần xem lại cách viết/Pinyin, 14 hàng đọc cần kiểm tra, 157 hàng cấp độ cần kiểm tra trong lần rà cấu trúc. Kiểm kê cũ ghi 38 thiếu `source_ref`, 10 thiếu phân loại, 8 không ghi thanh điệu; thanh nhẹ có thể hợp lệ. Không có bằng chứng độc lập cho nghĩa Việt của 560 hàng. Các con số này là cờ QA, không phải phán quyết biên tập.

V13 chỉ thêm metadata truy nguyên và chuyển trạng thái; không xóa từ, sửa nghĩa hoặc đổi checksum migration cũ. Các hàng được gắn nguồn dữ liệu lịch sử `legacy-unverified`, curriculum nội bộ V9, thời điểm import gốc giữ theo `created_at`. Admin có thể ghi tham chiếu nguồn, băm snapshot nội dung và vẫn để mục chờ duyệt. Cổng duyệt từ yêu cầu metadata hoàn chỉnh khớp đúng nội dung hiện tại và thao tác duyệt riêng của admin; sửa từ làm mất xác nhận cũ. Metadata ghi bởi admin là lời xác nhận họ đã xem nguồn, không phải kiểm tra độc lập tự động. Syllabus chỉ chứng minh tham chiếu chữ/Pinyin/cấp, không chứng minh bản dịch tiếng Việt hay câu ví dụ.

API/bộ nhớ SRS cũng lọc lại danh sách ID đã duyệt khi trả cache để thu hồi mục vừa chuyển pending. Hanzi không còn fallback mẫu học thuật cứng khi API lỗi hoặc guest; guest thấy cổng đăng nhập, lỗi có thể retry, danh sách rỗng được nêu rõ. Fallback hình thư pháp khi thiếu tệp nét vẫn còn. Pinyin giữ nội dung cũ nhưng bỏ lời khẳng định toàn bộ ví dụ đã duyệt độc lập; các mục tĩnh vẫn cần người chịu trách nhiệm học thuật rà soát. Không tuyên bố nội dung Grammar/Hanzi/Pinyin lịch sử đã được thẩm định độc lập.

## Kiểm chứng ứng dụng và kiểm thử

Đã chạy backend trên PostgreSQL 16 cô lập ở localhost, dùng output Maven riêng dưới ignored backup. `mvn -B verify` hoàn tất `BUILD SUCCESS`: 263 test, 258 pass, 5 skipped, 0 failed/error. Lệnh migration-check PostgreSQL chính xác trong CI cũng `BUILD SUCCESS` với cùng số test. Bộ rehearsal V1–V3/V13 chạy 7 test, pass; rehearsal trên database restore chạy Hibernate validation 1 test, pass. H2 cũng đạt cùng thống kê 258/5/0. Frontend có 162 Vitest pass trên 22 file, thêm 8 kiểm thử Node của dự án; lint và build hiện tại pass. Parser syllabus: 4 pass. Kiểm thử focused provenance mới: 3 pass; Hanzi regression mới: 4 pass.

54 kiểm tra HTTP thật qua API local/PostgreSQL bao gồm đăng ký hai learner và admin local, phân quyền, chặn đọc pending, nguồn/duyệt, stale digest sau sửa, sở hữu sổ từ/thi, cache SRS khi thu hồi, chống submit lặp, thi nội bộ, tiến độ Pinyin/Hanzi, refresh/logout/replay và CORS origin không tin cậy. Fixture đề thi gắn nhãn tổng hợp và được archive sau chạy; các fixture này không được tính là nội dung học đã xác nhận. Không đo xác thực email, gửi thư, push notification, payment hoặc khả năng chạy nhiều instance thực tế.

Các lớp test cũ từng bị `@Disabled` đã được bật lại. Bộ test đầy đủ có 5 skip: một release assertion corpus assisted chỉ chạy với property `legacy.dictionary.assisted-release=true`; một rehearsal PostgreSQL pilot; ba rehearsal PostgreSQL chỉ chạy theo opt-in. Ba rehearsal đều được gọi riêng và pass. Điều tra sáu test bằng cách vô hiệu hóa JUnit `DisabledCondition`: 5 pass, 1 lỗi vì nguồn assisted Vietnamese enrichment rỗng. Không chế dữ liệu để ép pass và không sửa corpus assisted của maintainer. Điều kiện release cho corpus này còn BLOCKED.

### Giao diện và truy cập

Ảnh browser lấy từ ứng dụng thật nối API local, 9 route × guest/learner/admin × light/dark × 1440×900/390×844 = 108 scene; thêm 4 ảnh panel provenance. Kiểm tra tự động thấy 0 tràn ngang, 0 lỗi JavaScript, 0 HTTP lỗi trong sweep cuối; người xem đã rà contact sheet desktop/mobile và phóng ảnh form nguồn. Panel mobile có scroll margin cho tiêu đề tránh thanh điều khiển cố định. Bằng chứng PNG và contact sheet ở ignored `backups/master-readiness-2026-10-19/ui/`. Thử cây accessibility Chromium và bàn phím xác nhận dialog đăng nhập có tên, textbox email có nhãn, Tab hoạt động và Escape đóng drawer/trả focus. Đây không phải kiểm thử bằng NVDA/VoiceOver hoặc đánh giá WCAG đầy đủ.

Lighthouse 13.5.0, một lần chạy lab mobile trên Chrome headless sau tối ưu variable font: Performance 57, Accessibility 96, LCP 9.18 giây, CLS 0, TBT 0ms. Ảnh audit ban đầu trước tối ưu có LCP 10.63 giây. CSS font tải giảm 217,533 xuống 62,904 byte. LCP vẫn **không đạt** ngưỡng lab 2.5 giây; TBT không phải INP và không có phép đo Core Web Vitals p75 người dùng. Điểm Accessibility mất ở contrast của họa tiết chữ trang trí `温故知新` ẩn với accessibility tree; việc chấp nhận ngoại lệ thị giác cần quyết định sản phẩm, chưa tuyên bố đạt WCAG AA. Xem [Web Vitals](https://web.dev/articles/vitals) về ngưỡng field p75.

## An ninh, dependency và triển khai

| Phát hiện | Mức nội bộ | Xử lý/bằng chứng | Rủi ro còn lại |
|---|---|---|---|
| Cache SRS trả DTO đã pending sau khi admin sửa | High | Lọc lại ID approved bằng một batch query trước khi trả cache; regression `FlashcardApiTest` và HTTP warm-cache/revoke pass | Cần giữ guard khi thay cache implementation |
| Hanzi fallback cứng hiển thị mục pending khi API guest/lỗi | High | Gỡ fallback dữ liệu, gate guest, lọc approved, loading/empty/error/retry; 4 regression và browser sweep pass | Chất lượng học thuật seed Hanzi lịch sử chưa được xác minh độc lập |
| Từ cũ approved thiếu nguồn nghĩa độc lập | High đối với tính toàn vẹn nội dung | V13 quarantine, digest provenance và duyệt riêng; test API thiếu nguồn/stale digest/learner403 pass | Không có người review học thuật được ủy quyền trong task; corpus vẫn pending |
| Hai advisory WebMVC trong dependency runtime | Medium theo đánh giá surface hiện tại | Guards khóa XSLT/SSE fragment, `MvcViewSurfaceTest` pass; OSV ghi 2 ngoại lệ | Severity upstream/điều kiện khai thác được ghi dưới; maintainer theo dõi patch tương thích |
| HEAD build không tương thích `SpeakOptions.slow` | Chặn build | Snapshot 220fb25 tái hiện 4 TS2353; working tree có fix type của maintainer và build pass | Log Vercel gốc 403; chưa commit/deploy bản sửa |
| LCP lab 9.18s | Medium UX | Giảm CSS font có số đo; Lighthouse vẫn báo chậm | Chưa có p75 field; cần tối ưu/đo tiếp theo ngân sách sản phẩm |

Đối chiếu chọn lọc OWASP ASVS phiên bản 5.0.0 [trang dự án](https://owasp.org/projects/asvs): quyền truy cập/ownership, session/token, input/validation, lỗi, CORS/trust proxy, giới hạn payload, audit, chống lặp và publish gate có test hoặc kiểm tra cấu hình cụ thể ở trên. Đây không phải chứng nhận ASVS hay audit toàn bộ từng yêu cầu. Rate limit admin giữ 30 request/phút/admin.

Gitleaks 8.30.1, binary xác minh checksum release chính thức, rà 203 commit/27.63 MB: 3 phát hiện lịch sử. Hai secret literal trong test JWT là khóa fixture công khai cũ; test hiện tại dùng chuỗi sinh cục bộ. Một JWT trong script load test đã hết hạn 02/10/2026. Không in token/claim ra báo cáo. Scan working tree cuối sau tài liệu: 0 finding trên hơn 9 MB. Lịch sử Git vẫn chứa các giá trị cũ; rotation/rewriting lịch sử chưa thực hiện.

`npm audit --omit=dev` trả 0 advisory. OSV audit runtime rà 104 dependency và ghi nhận 2 advisory `spring-webmvc 6.2.19` được đánh dấu không reachable vì `XsltView`/SSE fragments bị khóa; đây là ngoại lệ có bằng chứng trong code/test, không phải “không có lỗ hổng”. Các advisory: [CVE-2026-47884](https://spring.io/security/cve-2026-47884/) và [CVE-2026-47890](https://spring.io/security/cve-2026-47890/). Tại thời điểm kiểm tra Maven Central chỉ có bản vá public 6.2.19 cho dòng hiện dùng; nhánh 6.2.20 Enterprise và Spring 7 là thay đổi hỗ trợ/major, không tự nâng trong lượt này. Theo dõi bản vá tương thích và rà lại ngoại lệ. Không tải thư viện mới vào package manifest cho kiểm tra này.

Deployment Vercel check thực tế cho HEAD 220fb25 là failure, dù comment check của Vercel màu xanh. Đã export HEAD bằng `git archive` sang backup riêng (không checkout/đổi nhánh), `npm ci` exit 0 và `npm run build` exit 2 với bốn TS2353: option `slow` không có trong `SpeakOptions`. Working tree maintainer hiện bổ sung type đó; build hiện tại pass, nhưng commit 220fb25 chưa có phần sửa này. API log Vercel trả 403; không có token phiên/API để lấy log gốc. Vì vậy lỗi biên dịch trên snapshot giải thích failure có thể tái hiện, còn nguyên nhân chính xác của deployment **chưa xác minh**. Không sửa Vercel project/integration hoặc cấu hình secret.

Workflow CI đã bỏ job deploy Render. Blueprint root được lưu ở archive. Không truy cập/cập nhật cài đặt GitHub/Vercel/Render từ xa; chủ repo cần xác minh không còn Git integration/hook tự triển khai đang bật. Build self-host và API dùng đường dẫn same-origin `/api/v1`; `vercel.json` bỏ Render host cũ khỏi `connect-src`, nên operator phải giữ API cùng origin hoặc cấu hình CSP có chủ đích. Hướng dẫn [self-host-runbook.md](../self-host-runbook.md) phân biệt VERIFIED, UNVERIFIED và BLOCKED.

## Hạng mục còn chặn phát hành

| Trạng thái | Chủ việc | Việc cần hoàn tất |
|---|---|---|
| BLOCKED | Biên tập/người có chuyên môn tiếng Trung–Việt | Xác minh nguồn độc lập cho chữ/Pinyin/cấp, nghĩa Việt, Hán Việt và ví dụ 560 từ; duyệt thủ công từng nội dung; rà Pinyin/Grammar/Hanzi/Reading. Không nhập tự động từ phép so syllabus. |
| BLOCKED | Maintainer nội dung | Cung cấp release corpus assisted đã được kiểm tra; test yêu cầu release đó hiện lỗi vì enrichment rỗng. |
| UNVERIFIED | Chủ repo | Lấy build log Vercel thật cho deployment thất bại; xác minh commit sửa type đã được deploy bằng quy trình riêng được phép. |
| UNVERIFIED | Chủ hạ tầng | Xác minh cấu hình DNS, TLS, cookie domain, trusted proxy, CSP/CORS, firewall, database private và quyền DB trên máy mục tiêu. Không cấu hình thật trong lần này. |
| UNVERIFIED | Chủ hạ tầng | Chọn chính sách backup mã hóa/offsite, lịch/RPO/RTO, cảnh báo, khôi phục khi restart và rollback. Drill dump/restore ở local chỉ chứng minh thao tác cơ bản: database 566 hàng khôi phục có aggregate MD5 giống nguồn (`6f59d39de9b6297b9b7be99d578b8dc4`), Hibernate validate 1 test pass. |
| UNVERIFIED | Chủ sản phẩm | Xem xét cảnh báo contrast trang trí Lighthouse và phép đo lab LCP 9.18s; đánh giá hiệu năng field sau khi có traffic thật. |
| UNVERIFIED | Chủ sản phẩm/pháp lý | Xác nhận khôi phục tài khoản/email và chính sách dữ liệu/pháp lý trước dịch vụ công khai. |

## Lệnh và bằng chứng

Log và artifacts có timestamp/exit ở `backups/master-readiness-2026-10-19/`. Các lệnh kiểm tra quan trọng và kết quả thật:

| Lệnh/nhóm | Kết quả |
|---|---|
| `frontend: npm test` | exit 0 — 162/162 Vitest, 22/22 file; 8/8 Node tests |
| `frontend: npm run lint` | exit 0 — oxlint không warning; có một disable-next-line cục bộ đã giải thích cho catch đồng bộ SDK |
| `frontend: npm run build` | exit 0 — `tsc -b && vite build` |
| `mvn -B verify` (output trong backup) | exit 0 — 263 tests, 258 pass, 5 skip, 0 fail/error |
| CI PostgreSQL migration-check command/env | exit 0 — cùng 263/258/5/0 trên PG16 local cô lập |
| Flyway staging rehearsal V1–V3/V13 | exit 0 — 7 pass |
| Hibernate validate database restore | exit 0 — 1 pass |
| Syllabus parser tests | exit 0 — 4 pass |
| Local HTTP/browser | 54 API checks pass; 108 route scene + 4 panel screenshot pass |
| JUnit skipped-condition investigation | exit 1 — 5 pass, 1 error, 0 skip; assisted enrichment trống |
| Exact HEAD `220fb25`: `npm run build` | exit 2 — 4 TS2353 cho `SpeakOptions.slow` |
| Lighthouse mobile | exit 0 — Perf 57 / A11y 96; LCP vẫn fail mục tiêu |
| Gitleaks lịch sử | exit 1 — 3 phát hiện lịch sử đã phân loại ở trên |
| Gitleaks working tree | exit 0 — 0 phát hiện hiện tại |
| `npm audit --omit=dev` | exit 0 — 0 advisory npm |
| OSV runtime audit | exit 0 — 2 ngoại lệ reachability Spring đã nêu |

Các kiểm tra trên không xác minh tải, availability, p75 CWV, backup tự động/offsite, restore trên máy đích, hệ thống email, secret trên nền tảng cloud hoặc quyền hạn môi trường production.

### Cách tái chạy

Frontend: `npm test`, `npm run lint`, `npm run build` từ `frontend/`; build đã bao gồm `tsc -b`. Lần kiểm tra cuối trước bàn giao trả exit 0 cho cả ba lệnh, cùng số test nêu trên. `git diff --check` trả exit 0; còn thông báo Git sẽ chuyển LF thành CRLF ở các file vốn có thay đổi, không có lỗi whitespace.

CI `backend-migration-check` chạy `mvn -B test` trên toàn suite, không giới hạn `-Dtest`. Lần local sử dụng cùng các biến của job, chỉ thay địa chỉ port/database cho container cô lập và thêm `-Dbuild.output.root` để tránh đụng `backend/target` của IDE:

```powershell
$env:SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:15451/heyganba_migrationcheck_master'
$env:SPRING_DATASOURCE_USERNAME='postgres'
$env:SPRING_DATASOURCE_PASSWORD='postgres' # local disposable fixture only
$env:SPRING_DATASOURCE_DRIVER_CLASS_NAME='org.postgresql.Driver'
$env:SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT='org.hibernate.dialect.PostgreSQLDialect'
$env:SPRING_JPA_HIBERNATE_DDL_AUTO='validate'
$env:SPRING_FLYWAY_ENABLED='true'
$env:SPRING_FLYWAY_LOCATIONS='classpath:db/migration,classpath:db/migration-staging'
$env:SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE='5'
Remove-Item Env:DEBUG -ErrorAction SilentlyContinue
# From backend/, with Maven on PATH; actual run used Maven 3.9.16 installed under C:/Tools.
mvn -B test '-Dbuild.output.root=D:/GitHub/heyganba/backups/master-readiness-2026-10-19/pg-target'
```

Rehearsal gọi `mvn -B test -Dtest=FlywayLocationsConfigTest,PostgresSchemaStagingRehearsalTest` với `-Dpostgres.rehearsal=true`, `urlA=jdbc:postgresql://localhost:15451/heyganba_rehearsal_a_master`, `urlB=jdbc:postgresql://localhost:15451/heyganba_rehearsal_b_master`, user/password local `postgres` và output root riêng. Case A chỉ V1–V3; Case B kiểm V12 rồi nâng V13 và kiểm idempotency; Case C Hibernate validate. Lệnh verify H2 được chạy sau khi gỡ các biến override datasource/Flyway của phiên PostgreSQL.

Tái chạy đối chiếu, sau khi cung cấp PDF đúng checksum và export JSON các hàng corpus (không gồm fixture QA):

```powershell
python scripts/test_compare_hsk_syllabus.py
python scripts/compare-hsk-syllabus.py --pdf backups/master-readiness-2026-10-19/hsk-2025-syllabus.pdf --corpus backups/master-readiness-2026-10-19/seed-vocabulary-after.json --report docs/QA/hsk3-comparison-2026-10-19.json --private-output backups/master-readiness-2026-10-19/private-reference
```

Lighthouse dùng simulated mobile 412×823, DPR 1.75, RTT 150ms, throughput 1638.4Kbps và CPU slowdown ×4; ảnh UI riêng dùng viewport 390×844/1440×900. Không có phép nghe audio vật lý, viết bằng ngón tay/bút thật hoặc NVDA/VoiceOver trong phiên headless. Test thuật toán nét viết và API lưu tiến độ đã chạy, nhưng không coi chúng là chứng minh phản hồi cảm giác/thính giác trên thiết bị thật. Roadmap cấp 7–9 cần nội dung có quyền sử dụng và review riêng, chưa được bật trong sản phẩm sáu cấp.

## Delta so baseline

Các file dưới đây có trong manifest 43 file trước phiên và nội dung hiện khác baseline do công việc thuộc readiness này. Baseline byte gốc vẫn nằm ở thư mục ignored đã nêu. File modified/untracked khác được giữ nguyên từ maintainer. `PRODUCT.md` chỉ thêm ghi chú V13 và số liệu đối chiếu để không hiểu nhầm số lượng lịch sử là nội dung được duyệt hiện nay.

So sánh SHA-256 tại thời điểm chốt cho thấy 10/43 file baseline đổi nội dung; 33/43 còn nguyên byte so với baseline:

| Đường dẫn baseline | SHA-256 trước | SHA-256 hiện tại |
|---|---|---|
| `PRODUCT.md` | `6cd46f4a1bab32852e46e53423e2e95073141743935083042456bb8f84be424d` | `39f0ebf2054f37925c82c38b72be62e46d5de2cc333b91c911c9af113d23add6` |
| `backend/src/main/java/com/heyganba/service/AdminContentService.java` | `afd782d26d2fbecb70557bd2dad7455226e5ea6531613028d17317c716396c39` | `c778ab7b57d304f80851239eebb322b9c67a926325f6c3e40ab3babababd8d20` |
| `backend/src/test/java/com/heyganba/AssistedDictionaryCurationIntegrityTest.java` | `9d0f5e8eea9ac55ef086378326ea93c2812fabe2eaf9124a00bb1576b8d0091d` | `733ec69dbf3bd8f775662b624e5c0c04cd6ff01ea218f0df1288c8adafdbf4c4` |
| `backend/src/test/java/com/heyganba/DictionaryCoverageSearchTest.java` | `3e8211c2e8860dfe87da3e64034fa8bcf22b66b35516cc418c3f6f972e5efabb` | `8af49d156068e997053d4ebcf22a9700069b35d047d99ec85199ca7b435e728b` |
| `backend/src/test/java/com/heyganba/DictionaryCurationIntegrityTest.java` | `0a70a490e440b75489799764034ab1922b4e9071cd67b9ea8dbfdb4a1573616c` | `91107660185babea6191f1df8290d9e649715a7c4db1848af01ba61870768464` |
| `backend/src/test/java/com/heyganba/PostgresSchemaStagingRehearsalTest.java` | `a7071161e3ba2f3c591b090f8fad98453075dcc451d31dca899cbfec84c9fa9d` | `9b7d3ff93244d5ca5ea7e8b5f264c6d827bda1c9bec4c37b63b0612b0edeaad1` |
| `frontend/src/features/dictionary/DictionaryNotebookView.tsx` | `8498f532fd6ccd1aab7c2299f25ae795c2f36dd4025b30e3120dd29ce6706f96` | `0e5b75b71e5b4ff7caa79702a10ecb2aadf2ad21dc5190b2d58b1cb70e78a4c2` |
| `frontend/src/features/hanzi/HanziStationView.tsx` | `70d2bc77e8996061e1ce408a36f87c2bab589cc4eadeaa3477effbbdf23b483a` | `308cfc5cde41995d32dac867851a916c16aad5919eaefcde68b6a183ff64d96d` |
| `frontend/tests/unit/v21-edtech-ux.test.tsx` | `2a6a8e0af7dbd833f063d0bd39b50ffa866a3e3adab165d31d49345e99d5cbb4` | `e477d779f5a8f46957044c4ebc76109cfcfa58adee9e9f93d455eea7254c5f40` |
| `backend/src/test/java/com/heyganba/AdminDraftPublicationTest.java` | `48608d7bfadd5e25b0180ddbad3131581914605f6c9ec288509f31c679d973e7` | `4b51686b69bdd44357558b654416150f2cf4960de045f55f1edc0a0801eb9bea` |

Danh sách 10 đường dẫn trên là delta chính xác so với các file baseline. Danh sách file do task tạo/sửa, hash hiện tại và toàn bộ `git status --short` cuối được lưu ở [master-worktree-final-2026-10-19.json](master-worktree-final-2026-10-19.json). Manifest không chứa hash của chính nó để tránh vòng tham chiếu. Staged diff cuối rỗng. Các cổng local QA 15176/18091/15451 đã không còn lắng nghe khi bàn giao; Docker daemon không chạy. Không khởi động lại hoặc xóa container/database để dọn dẹp.

Phần chạm vào file baseline được giới hạn: `AdminContentService` thêm cổng provenance cho approve/bulk và vô hiệu xác nhận khi sửa; `AdminDraftPublicationTest` thêm kiểm chứng cổng đó; ba lớp dictionary integrity/search bỏ blanket disable và giữ release assertion có điều kiện cụ thể; rehearsal thêm kiểm V13 sau mốc V12; `DictionaryNotebookView` bỏ bốn escape regex thừa mà oxlint báo; `HanziStationView` gỡ fallback dữ liệu và thêm trạng thái thật; v21 fixture bổ sung `reviewStatus: APPROVED` để phù hợp API learner; `PRODUCT.md` thêm một đoạn giải thích quarantine. Mọi diff khác có sẵn trong các file này được giữ, không stage file nào.

Hai lớp `DictionaryCoverageSearchTest` và `DictionaryCurationIntegrityTest` trở lại nội dung giống HEAD sau khi bỏ blanket disable nên không còn xuất hiện trong `git status`, nhưng vẫn có trong delta/hash so baseline. Manifest cuối ghi 39 đường dẫn task (gồm manifest, root blueprint đã archive và hai file hiện clean này).
