# Cleanup có kiểm soát — 26/10/2026

Phạm vi: `feat/v2.1-ux-and-stability`, bắt đầu tại `a512091`. Chỉ các nhóm frontend độc lập đã kiểm chứng được đưa vào commit. Backend, migrations, corpus, provenance và cấu hình triển khai vẫn chưa đủ điều kiện phát hành. **Production: NO-GO; PR chỉ phù hợp ở trạng thái draft.**

[Inventory đầy đủ](./autonomous-cleanup-2026-10-26.json) ghi từng file giữ lại, lý do, hash trước/sau, phạm vi từng commit và kết quả kiểm chứng. `codeHead` trong JSON là HEAD code trước commit báo cáo này; HEAD bàn giao và remote phải đọc từ kết quả Git cuối phiên.

## Bảo toàn workspace

Baseline: 66 modified, 21 deleted, 118 untracked file; index rỗng. Không có upstream lúc bắt đầu; origin là `thach09/heyganba`, remote feature ở `6451606`. Hai commit có sẵn nhưng chưa push là `c0aab12` và `a512091`.

Trước sửa đã sao lưu ngoài repo: 964 file hiện hữu, archive HEAD, binary patch staged/unstaged và baseline SHA-256. Đối chiếu cuối phần code: không mất file baseline; chỉ 10 file có byte thay đổi do lượt sửa này, được liệt kê trong JSON. Những file maintainer được stage nguyên trạng vẫn giữ byte ban đầu. Toàn bộ 878 artifact có hash baseline trong `backend/target`, `frontend/dist` và cache frontend giữ nguyên. Node modules gốc không được cập nhật; dependency mới chỉ được cài trong workspace kiểm thử cô lập.

Không reset/clean/restore, không sửa migration hoặc database thật, không merge main. Các file có nhiều nhóm thay đổi được stage bằng blob đã đối chiếu, không dùng `git add -A`. Mỗi commit đều kiểm phạm vi staged và `git diff --cached --check`.

## Các commit code mới

| Commit | Kết quả |
| --- | --- |
| `c74fd94` | Deadline API/refresh 15 giây, bao gồm đọc body; giải phóng timer/listener, giữ cancellation và account ownership; timeout không tự replay POST. |
| `84f49f8` | Tra từ trong bài đọc; lưu sổ bằng ID/meaning API thật, từ chối mục thiếu/trùng/khác cách đọc, hủy lookup khi đổi ngữ cảnh. Sửa tooltip normal thành 0.95x. |
| `5155f0e` | Khôi phục quiz theo tài khoản và nội dung bài; giữ input/vị trí; retry catalog/SRS riêng; modal dùng component chung; bài ít nghĩa khác nhau chuyển sang gõ Pinyin. |
| `4e8135e` | Xóa feedback lỗi cũ khi retry chấm; giữ payload/attempt ID; thêm nghe chậm và dùng nhãn nhóm nội bộ. |
| `dc67347` | Bỏ dữ liệu Hanzi mẫu khi API lỗi; phân biệt guest/loading/error/empty, lọc pending cho learner; bổ sung loader tái dùng writer đã có; hủy writer/request và chặn callback/EXP muộn của chữ cũ. Việc bỏ script chặn trong index vẫn chưa commit. |
| `32cb6d6` | Mục tiêu Dashboard hợp lệ, EXP có loading/error, nhãn chọn lọc cho roadmap/insights/Pinyin; không đưa coverage corpus chưa phát hành vào commit. |
| `6677856` | WebGL không khả dụng có fallback, không làm sập trang học. |
| `eaf053b` | Dời lồng đèn trang trí lên để tránh che heading/banner. |
| `80b2142` | Nối label với input/textarea quản trị; không gộp thay đổi grammarRuleId phụ thuộc DTO backend. |
| `5af44d6` | Sửa truy vấn ngữ nghĩa, mock export và fixture cho hành vi hiện tại; không bỏ assertion/test hoặc thêm skip. |
| `fdcc4c2` | Vá lockfile công cụ frontend trong range đã khai báo, không force/override; package.json và phiên bản dependency production giữ nguyên. |

266 test Vitest cuối phiên gồm 228 test baseline và 38 test mới: API +6, flashcard lifecycle +3, Hanzi +7, lesson recovery +7, Dashboard +9, reading notebook +5, WebGL +1. Baseline HEAD sạch có 11 fail: sáu assertion nhãn Exam cũ và năm lỗi trong v21 (thiếu chức năng đọc tương tác/mock export hoặc query trùng). Các chức năng còn dirty trước đó không được dùng để che lỗi baseline này.

## Kiểm chứng thực tế

Source kiểm thử được dựng từ archive HEAD rồi chỉ ghép từng file/hunk dự kiến commit. Sau commit đã đối chiếu toàn bộ **441 file frontend đã commit** với bản đã kiểm thử, không có khác biệt nội dung ngoài CRLF/LF.

| Gate | Kết quả |
| --- | --- |
| `npm ci --ignore-scripts` với lockfile mới | Exit 0. Lần đầu bị EPERM do preview giữ native module; dừng đúng preview của phiên rồi chạy lại thành công. |
| `npm test` | Exit 0: 8/8 Node và 266/266 Vitest, 29 file Vitest; 0 fail, 0 skip. |
| Lint / production build | Exit 0, không có warning lint cuối cùng. |
| `npm audit --audit-level=moderate` | Ban đầu exit 1, năm mục high; sau vá exit 0, zero advisory theo kết quả registry tại thời điểm chạy. Không khẳng định không còn mọi lỗ hổng. |
| Browser với API fixture | 6 route × desktop 1440/mobile 390; mở xem ảnh, không overflow/page error/error boundary/NaN. Quiz giữ input sau reload; lưu reading dùng ID 103 thật từ fixture API. WebGL bị tắt để kiểm fallback. |
| Browser reconnect | 503 → retry → online recovery tại hai viewport: giữ cùng DOM bài thi và checkpoint, không phát sinh navigation. |
| Backend source đã commit `mvn -o -B compile` | Exit 0. |
| Backend source đã commit `mvn -o -B verify` | **Exit 1 ở test compilation**, vì `VocabularyDigestV1CompatibilityTest` tham chiếu `VocabularyProvenanceService` và field entity vẫn chưa commit. Không có suite Surefire được chạy ở lần này. |
| Snapshot toàn bộ backend dirty `mvn -o -B verify` | Exit 0: total 491, passed 488, failures 0, errors 0, skipped 3. Đây không phải kết quả của cây đã commit. |
| PostgreSQL fresh/upgrade/integration | **Chưa chạy**: Docker Linux engine không hoạt động. Không dùng báo cáo PostgreSQL lịch sử làm PASS cho source hiện tại. |
| Profile Japanese riêng | **Exit 1**: total 24, passed 22, failures 0, errors 1, skipped 1. Không sửa dữ liệu để ép xanh. |
| Maven dependency audit | Exit 0 trên 104 coordinate, vẫn có hai exception Spring hiện hữu. |
| Diff / secret patterns | Diff checks exit 0. Quét các mẫu credential/private-key phổ biến không thấy match; đây không phải chứng minh tuyệt đối hoặc scanner toàn diện. |

Ba skip H2 là `PostgresSchemaStagingRehearsalTest.caseA_officialSchemaOnly`, `.caseB_stagingSchemaWithV4`, `.caseC_hibernateSchemaValidation`, do thiếu property opt-in `postgres.rehearsal`. Japanese skip là `DictionaryPilotPostgresRehearsalTest.rehearseFullAssistedReleaseThroughFlywayWithoutCurriculumMutation`, thiếu `dictionary.pilot.rehearsal`. Japanese error là `AssistedDictionaryCurationIntegrityTest.runtimeResourceContainsOnlyTheValidatedAssistedRows`: resource assisted đang rỗng.

Các cảnh báo Java hiện hữu gồm deprecated API, unchecked test code và Mockito/agent; Maven audit vẫn giữ CVE-2026-47884/CVE-2026-47890. Memo Spring ngày 20/10 giữ nguyên, hạn rà lại 27/10/2026 và các điều kiện XSLT/SSE/view-fragment vẫn áp dụng. Chưa đo lại LCP; không tuyên bố cải thiện tốc độ từ bundle size hoặc test UI.

Browser dùng fixture cục bộ, không phải kiểm chứng end-to-end với PostgreSQL thật, native mobile keyboard hoặc browser zoom 200%. Quyền sở hữu/expiration/scoring/submission Exam vẫn thuộc server. localStorage không có CAS nguyên tử; cửa sổ race cross-tab và việc giữ checkpoint sau logout đã có trước phiên vẫn là rủi ro còn lại. Lesson recovery chỉ lưu trong sessionStorage, tách tài khoản, nhưng chưa chủ động xóa cache của tài khoản vừa logout.

## Các nhóm cố ý giữ ngoài commit

Sau các commit code còn **49 modified, 21 deleted, 114 untracked = 184 file**. JSON kèm theo là danh sách đầy đủ, có SHA-256 và lý do từng đường dẫn.

- **Migration/release/CI/self-host:** V12–V23, release copies/manifest, pom, application config, CI, Vercel CSP, render.yaml deletion và runbook phải được xét cùng nhau. Không có rehearsal PostgreSQL hiện tại hoặc xác nhận checksum production đã áp dụng; không tự đưa cả staging vào release.
- **Provenance/publication graph:** entity/DTO/services/admin editor và test phụ thuộc nhau. Service pending hiện dựa trên URL/family và lời khai observation trong JSON; chưa nối signed receipt verifier thành cổng tin cậy. H2 xanh không thay thế việc này. Không commit service chỉ để chữa test compilation.
- **Dữ liệu/copyright:** V21 và các manifest/observation Collins chưa có bằng chứng cấp quyền phân phối đầy đủ cho cách dùng dự kiến. Truy cập được trang, giữ excerpt ngắn hoặc ghi “editorial” không tự chứng minh quyền sử dụng. Không kết luận có vi phạm; giữ nguyên dữ liệu cho tới khi có cơ sở đáng tin cậy. Không khóa hay thu hồi corpus thật.
- **Legacy Japanese:** 21 deletion gồm 20 đường dẫn legacy và render.yaml. So với Git baseline, chỉ gzip khớp nguyên byte; 19 replacement khớp sau chuẩn hóa CRLF/LF, gồm hai helper Java chuyển vào test. Assisted TSV khác thực chất: từ 4.797 dòng ở Git thành một comment trong working tree đã có trước phiên. Các tuyên bố “move byte-for-byte” lịch sử chỉ đối chiếu snapshot trước di chuyển, không phải Git HEAD. Giữ tất cả deletion/archive ngoài commit.
- **Performance:** routes eager Dashboard, index font loading và DeferredCompanionCanvas chưa có phép đo cold-cache so sánh trong phiên; bảo toàn chúng nhưng không phát hành dưới danh nghĩa cải thiện đã đo.
- **Coverage/docs/scripts:** số CTI trong Dashboard/roadmap phụ thuộc corpus đang giữ lại. Generator/audit và tài liệu readiness lịch sử chưa độc lập với release graph. Công cụ compare hiện đếm mọi candidate cùng cách đọc, cần rà riêng các ID mơ hồ; hai extract_hanzi file chỉ có comment hoàn thành.
- **Admin:** phần grammarRuleId/type và provenance editor/review queue còn lại phụ thuộc hợp đồng backend chưa phát hành. Accessibility đã được tách riêng.

JAR từ **snapshot dirty cô lập** có đúng V1–V23, checksum khớp manifest, không thấy staging/Japanese/QA fixture hoặc marker tài khoản QA theo bộ kiểm hiện hữu. SHA-256 `2da590137eb7f418d33144b31967eafe891e63ae38d5efa9c82b724c46007637`. Đây chỉ là kiểm đóng gói, không phê duyệt nội dung, nguồn evidence, licensing hoặc khả năng fresh/upgrade trên PostgreSQL. Cây backend đã commit không có cùng quy trình đóng gói này.

## Điều kiện Git và triển khai

Không có thay đổi CI/deployment trong chuỗi commit code mới. Workflow đã commit chỉ nhận push main/develop; job backend production có điều kiện `refs/heads/main`. Render blueprint đã commit dùng branch main và autoDeploy false. GitHub repository vẫn có default branch main; lần triển khai feature `6451606` được GitHub ghi là Preview. Không có credential CLI để đọc trực tiếp cấu hình project Vercel hiện tại; không coi lịch sử Preview là bằng chứng tuyệt đối về toàn bộ setting provider.

Fetch cuối cho thấy remote feature vẫn ở `6451606`, là tổ tiên của local HEAD, không có divergence. Tuy nhiên, không có credential Vercel CLI/environment và inventory browser kết nối rỗng, nên chưa đọc được production branch của provider hiện tại. **Dừng push theo gate Phase 7 của yêu cầu người dùng**; chưa push `c0aab12`, `a512091` hoặc các commit mới. Không thử đổi setting, tạo credential hoặc gọi deploy hook để vượt điều kiện này. Các gate backend/provenance/migration còn đỏ hoặc chưa xác minh khiến PR chưa đủ điều kiện merge và production vẫn NO-GO.

Các advisory đã đối chiếu: [Vite/launch-editor](https://github.com/advisories/GHSA-587h-7wmj-h5pm), [Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [Undici](https://github.com/advisories/GHSA-xjj6-f33q-929c). Lockfile giải quyết chúng qua Vite 8.3.5, Puppeteer 25.16.0 và dependency tương thích đi kèm; không thêm override ép phiên bản Zod vào consumer cũ.
