# Kiểm chứng local trước self-host — 19/10/2026

## 1. Phạm vi và hiện trạng

Repo `D:\GitHub\heyganba`, branch `feat/v2.1-ux-and-stability`, HEAD `220fb25`. Báo cáo phản ánh working tree, không phải một commit đã phát hành. Đã đọc AGENTS, PRODUCT, frontend/PRODUCT, DESIGN, docs/Internal/AGENTS, roadmap, routes, cấu hình, migration và workflow CI. Sáu ảnh gửi kèm được dùng làm danh mục kiểm tra bảo mật; không coi chữ trong ảnh là lệnh triển khai.

**Kết luận:** các bản sửa dưới đây đã qua kiểm thử local; chưa đủ bằng chứng để tuyên bố toàn bộ sản phẩm hoặc hạ tầng production sẵn sàng. Phần nội dung học thuật và kiểm chứng laptop thật còn BLOCKED. Không deploy, SSH, gọi hook Render, chuyển DB thật, reset/drop DB, chạy migration trên DB thật, stage, commit, push hoặc merge.

Trước sửa đã lưu bản sao và SHA-256 của 23 file modified/untracked vào `backups/selfhost-audit-2026-10-19/baseline/`. Manifest chính xác: [selfhost-baseline-2026-10-19.json](selfhost-baseline-2026-10-19.json). Cả 23 file giữ nguyên byte; gồm V12 chưa commit, các thay đổi dictionary lớn, test bị disable, frontend v2.1 và script rehearsal của maintainer. Không quy các thay đổi đó thành kết quả của lượt này.

Môi trường: PostgreSQL **16.15** trong container riêng `heyganba-selfhost-audit-20261019`, cổng chỉ bind `127.0.0.1:15450`; backend prod profile local `18090`, frontend production preview `15175`. Không dùng DB developer ở 5432. Các DB test được tạo mới, không xóa/ghi đè DB cũ. Tài khoản QA chỉ ở DB test; việc cấp admin chỉ áp dụng ID vừa đăng ký trong container này. Không lưu token/password vào báo cáo.

IDE có thể ghi bytecode Eclipse vào `backend/target`; mọi Maven check dùng `-Dbuild.output.root=D:/GitHub/heyganba/backups/selfhost-audit-2026-10-19/backend-target` hoặc `backend-pg-target`. Biến DEBUG của máy được bỏ trong process kiểm tra để không bật log chi tiết request. Không sửa môi trường hệ thống.

## 2. Bản đồ route, quyền, API và bảng

PASS dưới đây luôn đi kèm phạm vi bằng chứng. PASS một route không có nghĩa mọi nút/trạng thái/thiết bị trong route đã được kiểm thử end-to-end. Các API có prefix `/api/v1`.

| Route/luồng | Quyền, API chính | Bảng/dữ liệu | Kết quả và giới hạn |
|---|---|---|---|
| Đăng ký/đăng nhập (modal) | Guest: `/auth/register`, `/auth/login`; refresh/logout; `/users/me` | users, roles, revoked_tokens | PASS: integration tests; HTTP thật register/login/refresh/logout/revoke. Account switch/expired session có frontend test; chưa thao tác đầy đủ mọi nhánh modal trên trình duyệt thật. |
| `/` Dashboard | Guest xem khung; user: `/exp`, `/streak`, `/streak/heatmap`, `/progress/insights`, `/flashcard/stats` | study_activities, streaks, character_mastery, srs_reviews, user_learning_preferences | PASS: mục tiêu HSK, link tiếp tục, thống kê test, ảnh sáng/tối; sửa saved goal sai và EXP lỗi. Không đánh đồng tiến độ nội bộ với năng lực chứng nhận. |
| `/pinyin` | Nội dung static; user ghi `/progress/practice`; `/audio/tts` | pinyinData, study_activities, learning_attempts, tts_audio | PASS: render responsive và unit quiz/ghi kết quả; BLOCKED: thẩm âm người bản xứ và thiết bị thiếu voice/audio thực. Không gọi dịch vụ TTS công khai để thử tải/attack. |
| `/vocabulary?level=HSK3`, `?hsk=3` | Guest: `/vocabulary/lessons`, `/lessons/{slug}/words`, `/{id}`; user ôn `/flashcard/*` | lessons, vocabulary, srs_reviews, learning_mutation_receipts | PASS: deep link, filter, flashcard lifecycle, lost-response retry bằng unit; HTTP thật review cùng attemptId không tăng repetitions hai lần; UI lỗi mạng không báo thành công. |
| `/dictionary` | Guest `/dictionary/search`, `/lookup/{id}`; user `/notebooks`, `/{id}/items`, `/practice-result` | vocabulary, dictionary_entries (legacy opt-in), vocab_notebooks/items, notebook_practice_sessions | PASS: tra cứu/sổ riêng bằng API tests; HTTP thật thêm từ, xem lại, user khác nhận 404. UI bài đọc có 9 bài static. Corpus từ điển JP legacy không phải 560 từ giáo trình ZH. |
| `/hanzi` | User `/hanzi`, `/{id}`, `/{id}/progress`; `/radicals` public | hanzi, radicals, kanji_radicals, kanji_practice_progress, character_mastery; local stroke JSON | PASS: filter HSK, fallback bằng test, ảnh mobile/desktop. BLOCKED: kiểm định bút thuận và audio từng chữ bởi chuyên gia. |
| `/grammar`, `/grammar/:ruleId` | User `/grammar/rules`, `/exercises`, `/exercises/{id}/check` | grammar_rules/exercises, learning_attempts, study_activities | PASS: lọc cấp, MC/sắp xếp câu, retry/idempotency unit+API; trình duyệt làm bài sắp xếp HSK6 với kết quả server. Trang chi tiết có code/API; không chụp riêng tất cả 42 bài. |
| `/exam` | User `/exam/generate`, `/{id}`, `/submit`, `/result`, `/history` | mock_exam_presets, mock_exams, exam_results, study_activities | PASS: API thật sinh/đọc/nộp/xem kết quả, user khác 404, response đề không lộ đáp án; reload/dual-storage recovery và account isolation qua tests. BLOCKED: phần Viết chính thức; đây là bài luyện nội bộ. |
| Nhiệm vụ/linh vật | User `/progress/quests/{code}/claim`, `/companion/wallet`, `/companion/feed` | daily_quest_claims, companion_wallets, study_activities | PASS: code và API integration chống nhận lặp; render 3D thật trong ảnh QA. Không sửa renderer 3D để ép test pass. |
| `/admin` | ROLE_ADMIN tại API và UI; `/admin/status`, CRUD, review-queue, audit, 2FA | users/roles, audit_logs, vocabulary, hanzi, grammar_exercises | PASS: guest UI403, user API403, admin thật xem trang; sửa bài tập giữ grammarRuleId; CRUD regression và duyệt tường minh. Không bulk import qua UI. |
| `/health`, `/actuator/health` | Public, chỉ trạng thái; các endpoint khác vẫn theo SecurityConfig | aggregate health/DB | PASS: HTTP UP thật; unit DOWN503, không lộ diagnostics. Khi dừng container DB test cuối lượt, request health thật cũng trả503. Chưa load-test outage. |
| Alias `/flashcards`, `/flashcard`, `/kana` | Redirect tương thích | Không tạo dữ liệu riêng | Có code redirect; không coi là trạm học tiếng Nhật đang hoạt động. |

Nội dung learner phải APPROVED ở backend; PENDING_REVIEW không được public chỉ nhờ frontend gate. Admin có quyền xem hàng đợi, duyệt/reject riêng. Tạo/sửa vocabulary/Hanzi/exercise giờ là PENDING_REVIEW + needsHumanCheck=true; edit nội dung đã duyệt làm nó tạm ẩn khỏi learner cho đến lần duyệt tiếp theo. Đây là thay đổi hành vi có chủ đích cần maintainer review.

### Milestone thực tế

| Mốc | Có code và bằng chứng | Chưa chứng minh/thiếu |
|---|---|---|
| M1 Pinyin | Bảng âm, 36 vận mẫu, quiz, ghi activity, tests | Thẩm định phát âm độc lập, audio bản xứ theo ngữ cảnh |
| M2/M2.1/M2.2 từ vựng/SRS | Danh mục, thẻ, SM-2, attempts/receipts, retry, notebook; H2 và PostgreSQL chạy được | Không đủ corpus mọi cấp; legacy dictionary integrity có test maintainer disable |
| M3 ngữ pháp | 42 rule, 84 MC + 6 sắp xếp; có frontend/backend test | Chất lượng học thuật từng giải thích/câu mẫu chưa được duyệt độc lập |
| M4 chữ Hán/đọc | 75 Hanzi, 28 radical DB, 9 bài đọc; UI/fallback có test | Corpus đại diện; không đủ toàn bộ bút thuận/chữ nâng cao |
| M5 thi/tiến độ/admin | Code sinh/nộp đề, timer/recovery, streak/EXP/quests/admin có thật | Roadmap lịch sử còn ghi thi thử là “tiếp theo”; không phải đề/chứng chỉ chính thức, thiếu phần Viết |
| M6 curriculum/UI | V9/V10 dữ liệu sáu nhóm cấp, source notes, theme/responsive, tests và ảnh | Không “full HSK”; 38 dòng thiếu nguồn, HSK3–6 còn rất ít; định hướng HSK3.0 trong docs không chứng minh đã triển khai |
| v2.1 | Test v21 chạy lại 8/8; HSK deep link/fallback/exam recovery | Chưa release; maintainer working tree phải review riêng |
| Self-host | Config prod, Flyway, headers, proxy trust, backup scripts có trong repo | Laptop/firewall/TLS/backup schedule/restore drill/cảnh báo chưa được kiểm chứng thực tế |

## 3. Kiểm kê từ vựng và chuẩn đối chiếu

Nguồn kiểm kê: export chỉ đọc trước khi tạo dữ liệu QA từ DB test đã apply V1–V12. [Bản JSON từng từ và từng bài](vocabulary-audit-2026-10-19.json) gồm 560 ID, trường thiếu, nguồn, trạng thái, nhóm cấp, lesson, trùng lặp và danh sách chờ kiểm nguồn. Script tái lập: `node scripts/audit-chinese-vocabulary.mjs <export.json> <output.json>`; không kết nối hay ghi DB.

| Nhóm | Dòng | Từ khác nhau trong nhóm | Dòng trùng trong nhóm | Thiếu source_ref | Trạng thái hiện có |
|---|---:|---:|---:|---:|---|
| Nhập môn/chưa gán HSK | 10 | 10 | 0 | 0 | 10 APPROVED |
| HSK1 | 182 | 160 | 22 | 38 | 182 APPROVED |
| HSK2 | 154 | 154 | 0 | 0 | 154 APPROVED |
| HSK3 | 53 | 53 | 0 | 0 | 53 APPROVED |
| HSK4 | 48 | 48 | 0 | 0 | 48 APPROVED |
| HSK5 | 53 | 53 | 0 | 0 | 53 APPROVED |
| HSK6 | 60 | 60 | 0 | 0 | 60 APPROVED |
| Toàn bộ | **560** | **528 toàn cục** | **32 dòng vượt số từ toàn cục** | **38** | **560 APPROVED** |

538 là tổng số từ riêng **cộng theo nhóm**, không phải số từ khác nhau toàn cục. Các từ xuất hiện ở nhiều bài/cấp không tự động là lỗi cần xóa. Có 30 lesson; thống kê từng lesson trong JSON. DB còn có 42 grammar_rules, 90 grammar_exercises, 75 hanzi, 28 radicals, 9 reading_passages, 6 mock_exam_presets. UI đọc hiểu dùng bộ dữ liệu static nên thay DB không tự bảo đảm UI đồng bộ.

Tất cả 560 dòng có nội dung không rỗng cho word, Pinyin, Hán Việt, nghĩa Việt, từ loại, câu ZH, Pinyin câu và bản dịch Việt. **Đây chỉ là kiểm tra cấu trúc**, chưa xác nhận giản thể chuẩn, ngữ nghĩa/từ loại, biến điệu hay bản dịch đúng. Có 8 từ không có nguyên âm mang dấu thanh cần người kiểm (thanh nhẹ có thể hợp lệ), 10 dòng nhập môn không gán HSK. Không tự sửa dấu thanh bằng thuật toán hoặc gán cấp cho 10 dòng này.

### HSK 2.0 và 3.0

Code/dữ liệu hiện tại dùng sáu nhóm 1–6 và nguồn community `wordlists/exclusive/old/`. Suy luận có căn cứ: curriculum tham chiếu HSK sáu cấp cũ; **không** trộn với HSK3.0. Roadmap/PRODUCT và ghi chú trên Dashboard đã làm rõ giới hạn này.

Đối chiếu nguồn chính thức, truy cập 19/10/2026:

- [HSK 2010 trên ChineseTest](https://www.chinesetest.cn/userfiles/file/HSKbyWord.pdf): tài liệu lịch sử sáu cấp, mục tiêu tích lũy 150/300/600/1200/2500/5000+; không dùng để nói đã phù hợp kỳ thi mới hiện nay.
- [Trang syllabus HSK3.0 chính thức](https://www.chinesetest.cn/syllabus) dẫn [đề cương công bố 11/2025, áp dụng 07/2026](https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf). Repo chưa chứng minh đối chiếu đủ tài liệu này.
- [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) là nguồn community đã dùng trong M6, **không phải cơ quan chứng nhận**. So sánh exact chữ giản thể theo cùng nhóm với snapshot local cho kết quả dưới đây; biến thể từ/chính tả cần người xem lại.

| Nhóm | Snapshot community cũ | Từ repo khớp đúng nhóm | Snapshot chưa có trong nhóm repo |
|---|---:|---:|---:|
| 1 | 150 | 147 | 3 |
| 2 | 147 | 142 | 5 |
| 3 | 298 | 45 | 253 |
| 4 | 598 | 45 | 553 |
| 5 | 1298 | 44 | 1254 |
| 6 | 2500 | 45 | 2455 |

Các số snapshot là danh sách exclusive theo cấp, không phải mục tiêu tích lũy chính thức. Không suy ra tỷ lệ hoàn thiện HSK3.0 từ bảng này. Log đối chiếu local: `backups/selfhost-audit-2026-10-19/community-comparison.json`.

**Dữ liệu mới thêm: 0 từ học thuật, 0 ví dụ, 0 migration.** Không có nguồn độc lập đủ để an toàn điền 38 source_ref hoặc hoàn thành corpus. JSON tạo hàng chờ `pendingSourceReview` với recommendedReviewStatus=PENDING_REVIEW; đây là đề xuất kiểm duyệt, không âm thầm cập nhật 560 seed đã được APPROVED theo ngoại lệ M6 cũ. Sau khi chuyên gia xác minh nguồn/bản quyền/định nghĩa cấp, bổ sung bằng migration mới giữ PENDING_REVIEW, không sửa checksum migration cũ. Không nhận “100% hoàn chỉnh”.

Flyway: production hiện nạp **cả** `classpath:db/migration` và `classpath:db/migration-staging`; chữ staging không cô lập migration khỏi prod. V1–V12 đã chạy thành công trên DB test, V12 là file sẵn của maintainer được bảo toàn. Không tạo V13 tùy tiện, không chạy language_code khi chưa có quyết định founder.

## 4. Finding, bảo mật và bản sửa

| ID / severity | Bằng chứng, tái hiện an toàn và tác động | Xử lý / xác minh |
|---|---|---|
| F01 HIGH — bypass quy trình xuất bản | `AdminContentService#create/updateVocabulary/Kanji/Exercise` trước đây tự APPROVED. Tạo hoặc sửa qua admin làm nội dung chưa thẩm định xuất hiện cho learner; không cần lần approve riêng. | FIXED: PENDING_REVIEW + needsHumanCheck=true; chỉ approve tường minh xuất bản. `AdminDraftPublicationTest` kiểm thử client không ép reviewStatus, learner404, approve200, edit ẩn lại và có mặt trong queue. |
| F02 MEDIUM — admin CRUD500 | PUT Hanzi/exercise serialize entity lazy khi OSIV=false; đã tái hiện LazyInitializationException trong test, response500; list cũng có rủi ro cùng loại. | FIXED: `AdminContentResponses` DTO scalar cho cả ba loại, không mở OSIV. Test list/create/update đều200/201 trên H2 và PostgreSQL. DTO admin vẫn có đáp án, endpoint tiếp tục ROLE_ADMIN. |
| F03 MEDIUM — dữ liệu từ vựng cũ sau edit | Admin sửa legacy reading/meaning nhưng canonical pinyin/meaningVi còn cũ; search có thể giữ normalized reading cũ. | FIXED: đồng bộ các cặp trường, clear normalized khi reading thay đổi; regression xác nhận canonical mới và normalized null. Không rewrite seed. |
| F04 MEDIUM — báo health sai | `HealthController` trước đây luôn trả UP, che DB outage khỏi monitor. | FIXED: aggregate HealthEndpoint, UP200/DOWN503, no-store, không lộ component detail. `HealthReadinessTest` 2 ca. |
| F05 MEDIUM — đổi nhầm rule khi sửa bài tập | `AdminView` trước đây luôn gán grammarRuleId=1. Sửa bài đang thuộc rule khác rồi lưu chuyển sai chủ đề. | FIXED: DTO trả ID và UI giữ ID; backend regression và trình duyệt bắt payload PUT có ID khác1. Request browser được chủ động abort sau khi kiểm tra để không sửa seed đã duyệt. |
| F06 LOW — goal HSKNaN | localStorage target='NaN'/text/fraction có thể tạo link không hợp lệ. | FIXED: integer1–6, fallback1; 7 test goal và deep links hiện có. |
| F07 MEDIUM — EXP giả khi API lỗi | Dashboard signed-in vẫn hiện cấp1,0/1000 mặc định khi `/exp` không tải được; heatmap chưa tải có thể hiện tổng tuần0. | FIXED: EXP loading/error rõ ràng, ẩn level/progress cho đến dữ liệu thật; tuần dùng dấu thiếu dữ liệu khi chưa tải. 2 regression mới và browser abort EXP kiểm tra không có “Lên cấp”. |
| F08 LOW — tên truy cập admin | 16 label không gắn input/textarea; ô tìm kiếm/2FA chỉ có placeholder. | FIXED: htmlFor/id cho16 trường CRUD, association cho enable2FA, aria-label cho disable2FA và3 ô search. Browser kiểm form exercise có accessible names; chưa dùng screen reader thật. |
| F09 LOW — flake test retry | Full suite đầu lượt này có QA-008 thất bại do bấm phím ngay trước effect keyboard handler được cài, không phải assertion ID sai. | FIXED: câu trả lời đầu/câu mới dùng nút semantic; retry vẫn dùng phím2 và giữ toàn bộ ID/payload/score assertions. Các test keyboard riêng giữ nguyên. |
| F10 MEDIUM — dữ liệu/nguồn chưa kiểm định | 38 dòng thiếu source_ref; corpus nâng cao chỉ đại diện; seed APPROVED không chứng minh thẩm định độc lập. | OPEN/BLOCKED học thuật: danh sách từng ID trong JSON, không bịa nguồn hoặc ví dụ. |
| F11 MEDIUM — dependency có advisory | OSV trả2 advisory cho spring-webmvc6.2.19; không được báo “0 lỗ hổng backend”. | MITIGATED theo exception đã có trong repo + `MvcViewSurfaceTest`; cần theo dõi bản vá, xem dưới. Không nâng framework major trong audit này. |
| F12 MEDIUM — bảo đảm legacy corpus bị bỏ qua | 6 test integrity/search thuộc3 class đã bị maintainer disable; working tree corpus JP thay đổi lớn từ trước. | OPEN: không bật lại/ghi đè dữ liệu chưa có căn cứ. Không dùng kết quả suite xanh để chứng nhận corpus legacy. |
| F13 LOW — đèn lồng chồng tiêu đề mobile | Ảnh grammar390px cho thấy đèn lồng thứ2 ở top80px chạm tiêu đề108px; kiểm giao cắt text/SVG hai chiều tái hiện lỗi. | FIXED: đưa đèn thứ2 lên top16px, trước vùng nội dung80px, giữ token/màu/component cũ. Layout sweep kiểm lại cả hai theme/viewport. |

Threat model: trình duyệt/localStorage và payload không đáng tin; API chịu trách nhiệm role, ownership, review filter, chấm điểm/reward. Request HTTP không cookie dùng bearer; transport refresh cookie có kiểm Origin allowlist và X-Auth-Transport. TLS/proxy là trust boundary khác, không chứng minh chỉ bằng test Java.

Kiểm tra local đã có bằng chứng: RBAC user403/guest401, IDOR notebook/exam404 với tài khoản khác, không lộ đáp án sinh đề, refresh/revoke, filter pending, mass-assignment status, retry/idempotency, validation/payload, rate limit, proxy spoofing/error correlation, privacy và account-switch tests. SQL repository dùng tham số; không thấy nối SQL từ request trong phạm vi rà soát. Không có endpoint upload file; giới hạn JSON64KB và multipart2MB không thay thế kiểm định file nếu bổ sung upload sau này. Admin limiter vẫn30 ghi/phút/admin; cache/limiter bộ nhớ chưa phải cơ chế nhiều replica.

CORS tường minh, untrusted preflight thật trả403. Cookie refresh HttpOnly/Secure/SameSite=Lax được kiểm bằng integration test; localhost HTTP không chứng minh secure cookie hoạt động qua domain thật. Frontend/API có CSP, nosniff, DENY, Referrer/Permissions policy. Frontend production build bỏ console/debugger và không phát source map. Không bật log DEBUG trên prod. Static scan 4 mẫu key/token độ tin cậy cao trên file tracked hiện tại không có hit; chỉ có3 `.env.example` tracked. **Không** có gitleaks trên máy, chưa quét toàn lịch sử/entropy, không chứng nhận không còn secret. Không in secret value trong kết quả scan.

Dependency: `npm audit --json` exit0, **0 vulnerabilities**. Maven resolve104 runtime dependencies; OSV raw có2 GHSA. Script audit sẵn `backend/tools/audit-runtime-dependencies.py` exit0 với **2 ngoại lệ**, không phải0 findings:

- [CVE-2026-47884 / Spring](https://spring.io/security/cve-2026-47884/): cần XsltView và implicit wildcard view name; ứng dụng REST không bật surface đó, test guard có chạy.
- [CVE-2026-47890 / Spring](https://spring.io/security/cve-2026-47890/): cần SSE view fragments chứa dữ liệu attacker điều khiển. Spring đánh giá LOW, [GHSA](https://github.com/advisories/GHSA-j9f9-w8pj-32f8) đánh giá CRITICAL; khác biệt severity không phải bằng chứng ứng dụng hiện tại khai thác được. Guard kiểm handler không expose SSE/view fragments.

Nguồn truy cập 19/10/2026. Bản6.2.20 được Spring ghi Enterprise Support Only; bản public7.0.9 có vá. Không tự nâng sang Spring7 vì thay đổi kiến trúc/API rộng. Revisit ngoại lệ trước khi thêm server-rendered view hoặc SSE; theo dõi patch phù hợp dòng hỗ trợ hiện tại.

## 5. QA, hiệu năng và các lệnh thực chạy

Logs/artifacts local: `backups/selfhost-audit-2026-10-19/`. Không đưa token hoặc credential vào artifact. Ảnh do Chrome headless render production build và API/PostgreSQL thật; reduced-motion được bật cho layout sweep. Mỗi cảnh1440×900 hoặc390×844, sáng/tối, 8 route =32 cảnh; kiểm document overflow, badge/title collision và giao cắt **hai chiều** giữa text với SVG đèn lồng. Phép kiểm chỉ theo chiều dọc ban đầu báo nhầm ở desktop; kiểm hai chiều và xem ảnh sau đó tìm ra lỗi thật ở mobile (F13), đã sửa vị trí đèn. Xem `ui/layout-results.json` và PNG trong `ui/`.

Kiểm tra bổ sung: guest admin403, mobile Escape/focus return/scroll lock, guest HSK3 deep link, lỗi mạng vocabulary, admin form accessible names/giữ rule ID và lỗi EXP không hiện tiến độ mặc định. Ảnh desktop/mobile đã mở xem trực tiếp; không tuyên bố đã review thủ công từng pixel của32 ảnh. Contrast token và drawer keyboard có unit tests; chưa audit WCAG đầy đủ hay screen reader/thiết bị âm thanh thật.

Build hiện tại: entry khoảng312KB (gzip~98KB), Three chunk527KB (gzip~131KB), Flashcard~50KB, Dictionary~60KB. Có lazy route; chưa có số Core Web Vitals hoặc tải đồng thời trên laptop thật. Không thêm thư viện nặng hoặc index chỉ dựa suy đoán. V12 index là thay đổi sẵn của maintainer, không nhận là tối ưu đã benchmark của lượt này. Chưa có benchmark query/N+1 và latency theo tải, nên phần performance production UNVERIFIED.

| Lệnh/check | Exit | Kết quả thực |
|---|---:|---|
| `npx --no-install vitest run tests/unit/v21-edtech-ux.test.tsx --reporter=verbose` | 0 | 8 pass,0 fail; `focused-final.log` |
| `npm test` | 0 | Node8 pass; Vitest155 pass/21 files,0 fail; `frontend-final.log` |
| `npm run lint` | 0 | 0 error,4 warning; `lint-final.log` |
| `npm run build` | 0 | tsc + Vite production build thành công; `build-final.log` |
| `mvn test` + output root riêng, H2 test profile | 0 | 262 total:252 pass,10 skipped,0 failure/error; `backend-final.log` |
| `mvn -B test` + env migration-check CI, PostgreSQL16 | 0 | 262 total:252 pass,10 skipped,0 failure/error; `backend-postgres-full.log` |
| `mvn test -Dtest=FlywayLocationsConfigTest,PostgresSchemaStagingRehearsalTest -Dpostgres.rehearsal=true ...` | 0 | 7 pass,0 skip; A chỉ V1–V3, B V1–V12, C Hibernate validate; `postgres-final.log` |
| Local HTTP smoke script | 0 | 24 request checks, ownership/retry/auth/exam/CORS; `api-smoke-results.json` |
| Dừng DB test rồi gọi `/health` thật | 0 | HTTP503 đúng kỳ vọng; `health-outage.log`; không tác động DB thật |
| Layout helper / interaction helper | 0 | 32 scenes / các tương tác nêu trên; local browser artifacts |
| `node scripts/audit-chinese-vocabulary.mjs ...` | 0 | 560 rows,528 global distinct,38 missing source |
| `npm audit --json` | 0 | 0 vulnerabilities; `npm-audit.json` |
| Existing runtime OSV audit script | 0 | 104 dependencies,2 known reachability exceptions; `runtime-audit-final.log` |
| `git diff --check` | 0 | Không lỗi whitespace |

Lint4 warning đều ở file baseline không sửa: `DictionaryNotebookView.tsx:896` có3 no-useless-escape; `HanziStationView.tsx:348` có set-state-in-effect. Backend còn warning cấu hình AuthenticationProvider/UserDetailsService và PostgreSQLDialect tường minh từ env CI; không lỗi build. `git diff --check` exit0 còn thông báo LF→CRLF cho7 file baseline theo cấu hình Git của máy; SHA-256 vẫn nguyên. Không che warning bằng suppress mới.

10 skip của full suite: 6 test corpus JP trong AssistedDictionaryCurationIntegrityTest/DictionaryCoverageSearchTest/DictionaryCurationIntegrityTest do baseline disable;1 DictionaryPilotPostgresRehearsalTest opt-in;3 PostgreSQLSchema rehearsal opt-in. Ba rehearsal sau đã chạy riêng, không bị skip trong check7/7. Corpus JP pilot vẫn UNVERIFIED, không báo “262 pass”.

Các lần thử lỗi đã xử lý/ghi nhận: full frontend ban đầu145/146 +8Node do QA-008 timing; wrapper rehearsal exit1 vì gọi executable `powershell` không có trong PATH ở bướcC; thử chạy lại A/B trên DB đã seed bị safeguard từ chối DB không rỗng. Không drop/reset để né safeguard: tạo hai DB mới và chạy đủ A/B/C thành công. Lần khởi động local đầu tiên lỗi API RandomNumberGenerator.GetBytes của PowerShell cũ, đã chuyển sang Create/GetBytes instance; không đổi source app vì lỗi helper này. Các lỗi helper/test assertion trong quá trình làm không được tính là PASS trước khi sửa và chạy lại.

### Tái lập PostgreSQL CI an toàn

Workflow hiện tại `.github/workflows/ci.yml` migration-check chạy toàn bộ `mvn -B test`, sau đó opt-in rehearsal; không còn giả định chỉ2 test class. Đã chạy cùng các env sau; chỉ thay host/port/DB để cô lập test và thêm build output root để tránh IDE ghi đè:

```powershell
$env:SPRING_DATASOURCE_URL='jdbc:postgresql://127.0.0.1:15450/heyganba_migrationcheck_audit'
$env:SPRING_DATASOURCE_USERNAME='postgres'
$env:SPRING_DATASOURCE_PASSWORD='postgres' # container test riêng, không dùng production
$env:SPRING_DATASOURCE_DRIVER_CLASS_NAME='org.postgresql.Driver'
$env:SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT='org.hibernate.dialect.PostgreSQLDialect'
$env:SPRING_JPA_HIBERNATE_DDL_AUTO='validate'
$env:SPRING_FLYWAY_ENABLED='true'
$env:SPRING_FLYWAY_LOCATIONS='classpath:db/migration,classpath:db/migration-staging'
$env:SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE='5'
Remove-Item Env:DEBUG -ErrorAction SilentlyContinue
mvn -B test '-Dbuild.output.root=D:/GitHub/heyganba/backups/selfhost-audit-2026-10-19/backend-pg-target'
```

DB mới `heyganba_rehearsal_a_audit_final` và `heyganba_rehearsal_b_audit_final` được tạo bằng createdb trong container test; lệnh rehearsal:

```powershell
mvn test '-Dtest=FlywayLocationsConfigTest,PostgresSchemaStagingRehearsalTest' `
  '-Dpostgres.rehearsal=true' `
  '-Dpostgres.rehearsal.urlA=jdbc:postgresql://127.0.0.1:15450/heyganba_rehearsal_a_audit_final' `
  '-Dpostgres.rehearsal.urlB=jdbc:postgresql://127.0.0.1:15450/heyganba_rehearsal_b_audit_final' `
  '-Dpostgres.rehearsal.user=postgres' '-Dpostgres.rehearsal.password=postgres' `
  '-Dbuild.output.root=D:/GitHub/heyganba/backups/selfhost-audit-2026-10-19/backend-target'
```

Chỉ chạy trên database rehearsal **mới, rỗng**, không chạy lại A/B trên DB đã có dữ liệu. FlywayLocationsConfigTest đã pass cả khi OS env locations tồn tại như CI. Không cần sửa V1/checksum để làm pass.

## 6. File thay đổi và bảo toàn

Danh sách chính xác file của lượt này cùng git status cuối được ghi ở phần cuối tài liệu. Hai helper trình duyệt tạm được lưu trong thư mục backups, không để lẫn vào source frontend. Manifest baseline chứa23 đường dẫn/SHA-256, đối chiếu cuối vẫn23/23 giống trước task. Các bản sửa source/test đều ở file trước đó sạch hoặc mới; không sửa bất kỳ23 file baseline nào. Không có thao tác staging/commit/push.

## 7. Checklist self-host sau này — CHƯA thực hiện triển khai

- [ ] Maintainer review diff và hành vi edit→PENDING_REVIEW; chuyên gia duyệt nguồn/biến thể/corpus. Chọn chuẩn HSK cụ thể trước khi mở rộng, không gộp2.0/3.0; bulk content qua migration mới.
- [ ] Chốt máy/OS/domain, mức hỗ trợ phiên bản Java/Node/Postgres; đo CPU/RAM/disk và pool size trên laptop. Thiết lập chạy service sau reboot, cập nhật bảo mật và cảnh báo đĩa/điện/mạng.
- [ ] HTTPS tại reverse proxy đáng tin, chứng chỉ tự gia hạn; route `/api/v1/*` tới backend và SPA fallback. Chỉ trust đúng proxy CIDR; kiểm XFF/scheme qua đường ingress thực. Không dùng Vite preview làm production server.
- [ ] Firewall chỉ mở ingress cần thiết; bind backend/DB nội bộ, không mở5432/Redis ra Internet. Nếu Cloudflare, kiểm Full(strict), chứng chỉ origin, origin firewall/WAF và rate limit phù hợp người dùng chung NAT. Cloudflare không thay RBAC.
- [ ] JWT_SECRET random đủ độ dài, secrets ngoài repo với quyền tối thiểu; DEBUG/SQL bind logging tắt. CORS đúng origin và CSP connect-src đúng domain mới; bỏ origin cũ khi không còn dùng. Kiểm Secure/HttpOnly/SameSite cookie và Origin guard qua HTTPS thật.
- [ ] Tách migration role khỏi runtime role qua SPRING_FLYWAY_*; kiểm cả PUBLIC/inherited grants, runtime chỉ quyền schema/table/sequence cần thiết và không DDL. Test dùng postgres superuser **không** chứng minh runtime least privilege production.
- [ ] Backup trước migration: dump custom, checksum/pg_restore --list, bản mã hóa ngoài laptop, quyền đọc hạn chế. Chốt RPO/RTO/retention và Task Scheduler/cron, cảnh báo backup quá tuổi. Script tồn tại không có nghĩa lịch đã cài.
- [ ] Diễn tập restore vào DB mới, so số bảng/dòng và các luồng auth/SRS/exam; không restore đè production để thử. Backup riêng roles/secrets/audio ngoài DB. Task này chưa thực hiện restore drill.
- [ ] Rehearse đúng Flyway locations/current schema trên bản sao test; review V12 baseline trước phát hành. Không sửa checksum cũ, không auto-clean, không chạy language_code chưa chốt. Quy trình rollback app + forward-fix DB/restore đã diễn tập, không hứa rollback DDL/data tự động.
- [ ] Monitor sanitized health/503, latency/5xx/429, DB pool, disk, certificate và backup age; gắn cảnh báo/người phụ trách. Kiểm health DOWN ngoài mock, load/soak, accessibility và audio trên thiết bị thật trước public.

Không đánh dấu các mục này hoàn thành chỉ từ kết quả local. Dừng tại working tree để maintainer review.

## Bàn giao working tree cuối lượt

23/23 SHA-256 baseline trùng khớp. API18090 và preview15175 do lượt này mở đã dừng; container DB test giữ nguyên dữ liệu ở trạng thái stopped. Không dừng container/dịch vụ của maintainer. 20 file dưới đây là toàn bộ delta của lượt này (12 file modified, 8 file mới); 23 file còn lại là thay đổi có sẵn của maintainer. Không có file staged.

- `PRODUCT.md`
- `backend/src/main/java/com/heyganba/controller/AdminController.java`
- `backend/src/main/java/com/heyganba/controller/HealthController.java`
- `backend/src/main/java/com/heyganba/service/AdminContentService.java`
- `docs/curriculum-roadmap-m1-m3.md`
- `docs/roadmap.md`
- `frontend/src/components/OrientalDecorBackground.tsx`
- `frontend/src/features/admin/AdminView.tsx`
- `frontend/src/features/admin/types.ts`
- `frontend/src/features/dashboard/DashboardView.tsx`
- `frontend/src/features/dashboard/HskRoadmap.tsx`
- `frontend/tests/unit/qa-batch-b.test.tsx`
- `backend/src/main/java/com/heyganba/dto/admin/AdminContentResponses.java`
- `backend/src/test/java/com/heyganba/AdminDraftPublicationTest.java`
- `backend/src/test/java/com/heyganba/HealthReadinessTest.java`
- `docs/QA/selfhost-baseline-2026-10-19.json`
- `docs/QA/selfhost-readiness-2026-10-19.md`
- `docs/QA/vocabulary-audit-2026-10-19.json`
- `frontend/tests/unit/dashboard-target.test.tsx`
- `scripts/audit-chinese-vocabulary.mjs`

`git status --short` cuối lượt:

```text
 M PRODUCT.md
 M backend/src/main/java/com/heyganba/controller/AdminController.java
 M backend/src/main/java/com/heyganba/controller/HealthController.java
 M backend/src/main/java/com/heyganba/service/AdminContentService.java
 M backend/src/main/java/com/heyganba/service/RateLimiterService.java
 M backend/src/main/java/com/heyganba/service/srs/InMemorySrsDueCache.java
 M backend/src/main/resources/dictionary/assisted-ja-vi.tsv
 M backend/src/test/java/com/heyganba/AssistedDictionaryCurationIntegrityTest.java
 M backend/src/test/java/com/heyganba/DictionaryCoverageSearchTest.java
 M backend/src/test/java/com/heyganba/DictionaryCurationIntegrityTest.java
 M backend/src/test/java/com/heyganba/PostgresSchemaStagingRehearsalTest.java
 M docs/Dictionary/coverage-after-rehearsal.json
 M docs/Dictionary/coverage-baseline.json
 M docs/Dictionary/vietnamese-coverage-baseline.json
 M docs/Dictionary/vietnamese-coverage-candidate.json
 M docs/curriculum-roadmap-m1-m3.md
 M docs/roadmap.md
 M frontend/src/components/OrientalDecorBackground.tsx
 M frontend/src/features/admin/AdminView.tsx
 M frontend/src/features/admin/types.ts
 M frontend/src/features/dashboard/DashboardView.tsx
 M frontend/src/features/dashboard/HskRoadmap.tsx
 M frontend/src/features/dictionary/DictionaryNotebookView.tsx
 M frontend/src/features/exam/ExamView.tsx
 M frontend/src/features/exam/activeAttempt.ts
 M frontend/src/features/grammar/GrammarView.tsx
 M frontend/src/features/hanzi/HanziStationView.tsx
 M frontend/src/services/chineseSpeech.ts
 M frontend/tests/unit/qa-batch-b.test.tsx
 M frontend/tests/unit/v21-edtech-ux.test.tsx
 M scripts/verify-postgres-m21.ps1
?? backend/src/main/java/com/heyganba/dto/admin/AdminContentResponses.java
?? backend/src/main/resources/db/migration-staging/V12__performance_indexes_and_constraints.sql
?? backend/src/test/java/com/heyganba/AdminDraftPublicationTest.java
?? backend/src/test/java/com/heyganba/HealthReadinessTest.java
?? docs/QA/ci-migration-check-f6c9ea7-2026-10-18.md
?? docs/QA/selfhost-baseline-2026-10-19.json
?? docs/QA/selfhost-readiness-2026-10-19.md
?? docs/QA/vocabulary-audit-2026-10-19.json
?? frontend/tests/unit/dashboard-target.test.tsx
?? scripts/audit-chinese-vocabulary.mjs
?? scripts/extract_hanzi.mjs
?? scripts/extract_hanzi.py
```
