# Vocabulary research / verification — 2026-10-28

Đã triển khai và chạy pipeline nghiên cứu local, importer candidate và pilot. **Chưa đủ điều kiện vận hành tự động xuất bản dữ liệu thật.** Không áp yêu cầu human review từng từ; các mục chưa đạt có lý do và evidence riêng. Không thay trạng thái corpus trên server.

## Baseline và bảo toàn

- Repository `D:\GitHub\heyganba`, branch `feat/v2.1-ux-and-stability`, HEAD đầu phiên `a237807c34d4ffafc3da0bf6eff2d2acb8969110`.
- Baseline: 42 modified, 1 deleted, 60 untracked entries theo status mặc định. Đã lưu status, dirty/staged diff và hash/backup của 985 file source/untracked trước khi sửa.
- Evidence riêng: `C:\Users\LENOVO\AppData\Local\Temp\jiayou-vocabulary-trlkuzj7`, ACL hạn chế cho owner/SYSTEM/Administrators. Không đưa raw corpus, PDF, assessor responses, credential hoặc source object vào commit.
- 984/985 file baseline nguyên hash. Thay đổi chủ ý duy nhất trong file baseline là thêm một bước unit test offline vào CI; giữ ba job và deployment behavior. Tất cả thay đổi maintainer còn lại, kể cả `render.yaml` bị xóa, được giữ nguyên.
- Không chạy build/clean trong target/dist của working tree gốc. Maven/npm và integration chạy trong archive HEAD + file mới ở workspace riêng. Generated outputs gốc không được dùng làm bằng chứng build candidate.
- Một commit local cho phần này; lấy hash chính xác bằng `git log -1 --format=%H -- docs/QA/vocabulary-auto-verification-report.md`. Không push, merge, deploy, thay provider settings hoặc truy cập database thật.

Hash delta từng file và quyết định từng record nằm trong [manifest JSONL](../Content/vocabulary-auto-verification-manifest.jsonl). Header có hash source code/policy; hai artifact báo cáo được loại khỏi self-hash để tránh tham chiếu vòng.

## Đã triển khai

1. Registry máy đọc và acquisition có pin version/revision/hash; source objects ghi atomic, kiểm tra tamper/size, retry hữu hạn và cooldown khi 429. Không fetch URL do candidate tự chọn, không theo HTTP redirect.
2. Parser CC-CEDICT/CVDICT, Mandarin Wiktionary, adapter Vietnamese Wiktionary có test synthetic. Giữ gloss/sense/cách đọc riêng, nhãn ngữ cảnh, classifier/reference riêng và attribution. `zh-see` một bước phải được cả hai trang xác nhận giản/phồn; composite snapshot giữ đúng bytes của hai nguồn trang, không tính thành hai họ độc lập.
3. V2 digest tương thích codec hiện có; Pinyin có thanh/numbered/ü/từ viết liền; alias POS so sánh không sửa giá trị đang lưu. Trường core/optional/supplemental có kết quả riêng.
4. AUTO_VERIFIED có thể đi qua quy tắc deterministic khi hai nguồn tiếng Việt độc lập đồng ý chính xác. Adapter assessor có protocol và factory, cấu hình qua môi trường; command wrapper có thể nối provider sau này. Không có provider SDK/key/endpoint Gemini/OpenAI thật được tạo trong phiên này.
5. Mock chỉ kiểm tra protocol, không được biến thành xác minh ngữ nghĩa. Cùng model tự nghiên cứu/biên soạn không được ghi là AI assessment độc lập.
6. Ledger private có transaction, checkpoint, no-op rerun và CAS cho cả content/evidence. Có thống kê lesson reuse/homograph, không merge/xóa ID học viên.
7. Generator migration **candidate mới**, không chạm migration lịch sử hay release allowlist. Từ mới luôn pending/unmapped; sửa cần before-content/digest/revision, giữ ID và learner relationships, đồng bộ alias columns, hạ pending và tăng audit revision. Không tự mở lại ARCHIVED/REJECTED. Candidate SQL chỉ được tạo khi verification đủ điều kiện, không auto-apply.
8. Unsigned receipt proposal đúng contract V1, binding V2/ID/revision. Java integration dùng verifier thật với key ephemeral và fixture synthetic; không cấp receipt hoặc trust thật.

Chi tiết vận hành: [registry](../Content/automated-source-registry.md), [policy](../Content/vocabulary-verification-policy.md), [publication authority](../../backend/docs/vocabulary-publication.md).

## Kết quả dữ liệu thật và pilot

Phạm vi là **snapshot local của artifact phát hành V1–V14**, 560 vocabulary rows. Không gọi prospective V15–V23 hoặc 495 quyết định cũ là dữ liệu đã vượt audit mới. Không có kết luận về nội dung database production từ snapshot này.

| Tập dữ liệu | AUTO_VERIFIED thật | NEEDS_RESEARCH | CONFLICT | Ghi vào vocabulary thật / receipt thật |
|---|---:|---:|---:|---:|
| 560 mục hiện có trong snapshot | 0 | 557 | 3 | 0 / 0 |
| 25 ứng viên mới, có entry trong CC-CEDICT và chưa có trong snapshot | 0 | 25 | 0 | 0 / 0 |
| Pilot: 25 hiện có + 25 mới | 0 | 49 | 1 | 0 / 0 |
| Pilot với mock assessor | 0 | 49 | 1 | 0 / 0 |

Pilot là tập con của audit; không cộng lại thành 635 mục. Tổng manifest **585 candidate**, 582 NEEDS_RESEARCH và 3 CONFLICT. Rerun pilot cuối **0 ledger writes**. Không tạo migration approval batch thật vì chưa có mục đủ điều kiện.

Ba conflict cần hòa giải, chưa tự kết luận/sửa dữ liệu học viên:

- IDs 6 và 42: `再见`, nghĩa đang dạy là lời tạm biệt, nhãn hiện có “Động từ”; Wiktionary trích được interjection/noun. Giữ riêng hai ID, không xóa lesson reuse.
- ID 173: `手表`, trường phồn thể đang là `手表`, nguồn CC-CEDICT hỗ trợ `手錶` cho reading đang xét.

Audit phát hiện 12 nhóm có thể là lặp core/lesson reuse và 31 nhóm cùng chữ/cách đọc. Đây là cảnh báo nghiên cứu, không phải lệnh deduplicate. Nghĩa, sense và quan hệ học viên được giữ.

Nghĩa Việt cho 25 candidate mới là **biên soạn AI-assisted dựa trên CC-CEDICT**, được ghi rõ origin; không giả là bản dịch Việt có sẵn trong nguồn. Chưa cấp verified flag cho các nghĩa đó. Không tạo ví dụ, Hán Việt hoặc audio được duyệt.

CC-CEDICT raw export pin header ngày 2026-10-28. Đã lấy 50 page gốc + 24 page đích Wiktionary, tổng 75 raw vocabulary snapshot objects kể cả CC-CEDICT. Parser lấy được facts khớp chữ/reading cho **17/50** mục pilot từ Wiktionary và **541/560** mục snapshot từ CC-CEDICT. Những trang/notation/template còn chưa hỗ trợ giữ NEEDS_RESEARCH; không gán “đã kiểm chứng” chỉ vì fetch thành công.

Thiếu hiện tại gồm: lineage Wiktionary chưa chứng minh theo entry, corroboration POS còn thiếu, bằng chứng nghĩa Việt chưa đủ và optional fields chưa xác minh. CVDICT live API/raw/README trả 404, Tatoeba chưa có adapter/author-rights binding; không dùng chúng làm nguồn thứ hai giả. Quyền expression bị hạn chế không được AI semantic agreement xóa bỏ. Nguồn thừa không đủ quyền cũng không chặn mục đã đủ các nguồn hợp lệ khác.

## Độ phủ curriculum — mẫu số có pin

Đã đọc lại PDF local SHA-256 `ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941`, xác nhận dãy ID **1–11.000** và ranh giới primary levels. Phiên bản: CTI 2025-11, cover effective 2026-07; **không tuyên bố đây là bản mới nhất hiện hành**. PDF và danh sách từ đầy đủ nằm private, không phân phối vào repo.

| Primary level của bản pin | Official IDs | Khớp duy nhất chữ + reading | Chưa khớp duy nhất |
|---|---:|---:|---:|
| 1 | 300 | 194 | 106 |
| 2 | 200 | 72 | 128 |
| 3 | 500 | 66 | 434 |
| 4 | 1.000 | 47 | 953 |
| 5 | 1.600 | 42 | 1.558 |
| 6 | 1.800 | 14 | 1.786 |
| Tổng | 5.400 | 435 | 4.965 |

Đây là lexical matching trên snapshot V14, **chưa xác nhận nghĩa/POS hay publication eligibility**. HSK 1 chưa đầy đủ; không quảng bá 194 mục đã hoàn thành học thuật. Mọi `syllabusClaims` của pipeline vẫn rỗng. Nhãn nội bộ của snapshot: level 1/2/3/4/5/6 lần lượt 182/154/53/48/53/60 rows, thêm 10 chưa phân cấp; không thay chúng bằng official levels tự động. Không trộn số liệu prospective V23 hoặc HSK 2.0 vào mẫu số này. Chưa mở rộng ingestion HSK 1 tiếp vì pilot chưa qua điều kiện nội dung.

## Kiểm thử đã chạy

| Gate trên workspace cô lập | Kết quả cuối |
|---|---|
| Python unit + PostgreSQL integration + Java receipt integration | **52 tests: 52 passed, 0 failure/error/skip** — 50 unit, 1 PG lifecycle, 1 Java bridge |
| Java receipt bridge | 5 checks: accept đúng fixture; từ chối issuer lạ, revision cũ, digest cũ và chữ ký bị sửa |
| Java V2 codec trên snapshot sau migration | **560/560 digest khớp**; không ký dữ liệu thật |
| SQL do importer sinh, chạy qua Flyway thật trên clone local | apply **1** migration synthetic, rerun **0**, đúng **1** từ PENDING_REVIEW; không sửa release allowlist |
| `mvn -o -B clean verify` H2 | **509 total, 502 passed, 0 failures/errors, 7 skipped**, exit 0 |
| `mvn -o -B test` với env PostgreSQL của CI trên DB local riêng | **509 total, 502 passed, 0 failures/errors, 7 skipped**, exit 0 |
| `npm ci`, `npm test`, `npm run lint`, `npm run build` | exit 0; **276/276 Vitest, 31 files; 8/8 Node tests** |
| Production artifact audit + negative artifacts | exit 0; chỉ 14 migrations, không JP runtime/QA fixture/trust catalog/V15–V23 |
| `git diff --check`, staged diff check | exit 0 trước commit |

Không bỏ hoặc giảm test nghiệp vụ Trung. Bảy Maven skip là 3 `PostgresSchemaStagingRehearsalTest` và 4 `ProductionMigrationSafetyTest` opt-in cần DB rehearsal riêng; tên từng case nằm trong manifest. Phiên này không bật lại bảy rehearsal đó; đã chạy PG API suite và PG ingestion integration riêng. Không cộng các assertion Java/codec vào số JUnit test để tăng tổng.

Các gate kiểm tra runtime source của HEAD baseline cùng tools mới trong checkout riêng. Chúng không chứng nhận toàn bộ dirty DTO/entity/provenance/UI graph maintainer đang giữ ngoài commit là xanh; graph đó được bảo toàn, không bị lẫn vào candidate.

PG ingestion test clone fixture vào database mới `jiayou_ingestion_<uuid>` trong container audit có label kiểm tra, dùng dữ liệu synthetic: hai importer đồng thời chỉ tạo một pending row; rerun không thêm audit; correction tăng revision, giữ ID; notebook practice_count=7 và SRS repetitions=4 giữ nguyên cả row JSON; stale import/correction bị từ chối; ARCHIVED không tự mở lại. Batch nghiên cứu TEMP 585 rows cũng đã kiểm tra repeat/stale rollback và fingerprint vocabulary trước/sau không đổi. Không nhập dữ liệu synthetic vào production.

Các lỗi phát hiện trong quá trình phát triển đã sửa: false conflict do alternate traditional; bỏ sót Wiktionary soft redirect/etymology; retry 429 chưa dừng toàn batch; stale same-content evidence update; optional source làm chặn cả mục đủ nguồn khác; khả năng mở lại record thu hồi qua correction. Fixture SQL thô ban đầu thiếu Flyway sequence callback đã rollback; fixture cuối được tạo bằng JAR/Flyway thực. Một lỗi import tên `Policy` trong Java probe và các assertion phát triển đã được sửa trước gate cuối. Không báo những lần lỗi này là PASS.

Maven còn warning deprecated/unchecked và Mockito dynamic agent cho JDK tương lai. Lint/build frontend cuối không có warning. Git có cảnh báo LF/CRLF theo cấu hình checkout, cả khi stage file mới; diff check vẫn exit 0. GitHub CI chưa chạy cho commit chưa push; bước mới chỉ chạy offline Python unit, không cấu hình provider/key hay deploy.

Flyway smoke dùng chính libraries trong JAR, copy đúng 14 migration/callback ra thư mục private rồi thêm V15 **synthetic chỉ trong clone test**. Parser dollar-quote/SQL của generator đã chạy thật; callback báo column đã có là notice idempotent, không phải lỗi migration. V15 này không được ghi vào source migrations hoặc artifact sản phẩm.

## Thời gian, chi phí và giới hạn còn lại

Lượt warm-snapshot cuối: pilot 50 records **1,7761 s**, median mỗi record **11,006 ms**; audit 560 records **8,6118 s**, median **12,623 ms**. Đây là thời gian local với objects đã tải, không bao gồm toàn bộ acquisition/backoff hoặc thời gian provider. 0 request AI provider thật; chi phí tiền tệ không được đo, không suy ra “miễn phí” cho vận hành sau này. Timing và source hashes ở manifest.

Chưa có bằng chứng để phát hành mục thật: thiếu corroboration đủ field, semantic evidence, rights release obligations và trusted issuer/catalog. Pluggable adapter/unsigned proposal đã có; kết nối Gemini/OpenAI, xác minh độc lập provider, signer và publisher vận hành thật chưa được thiết lập. Không tự tạo credentials hoặc production receipt. Mock PASS là kiểm thử contract, không phải PASS học thuật của 50 từ.

HSK mapping trong engine chưa có release contract đầy đủ; parser Wiktionary vẫn có template/reading chưa hỗ trợ. Importer optional hiện yêu cầu optional fields vắng, homograph mới cần reconciliation riêng. Catalog hiện hữu có cap 8 MiB; full-scale HSK 1–6 cần đánh giá kích thước/partitioning trước rollout. Không sửa fail-closed authority để giải quyết những giới hạn đó.

Giữ nguyên [release blockers](release-blockers.md) và memo advisory Spring: hai exception `GHSA-j9f9-w8pj-32f8`, `GHSA-pc63-qcmh-9cmg` vẫn cần rà lại khi thêm SSE fragments/XSLT. Phiên này không tuyên bố scanner không còn CVE. Chưa xác minh Render production branch/autodeploy hoặc production DB history, nên không push/deploy.

## File của lượt này

```text
.github/workflows/ci.yml
scripts/vocabulary_pipeline/.gitignore
scripts/vocabulary_pipeline/__init__.py
scripts/vocabulary_pipeline/__main__.py
scripts/vocabulary_pipeline/assessors.py
scripts/vocabulary_pipeline/engine.py
scripts/vocabulary_pipeline/ingestion.py
scripts/vocabulary_pipeline/source-registry.json
scripts/vocabulary_pipeline/export-vocabulary.sql
scripts/vocabulary_pipeline/test_engine.py
scripts/vocabulary_pipeline/test_postgres.py
scripts/vocabulary_pipeline/test_receipt.py
scripts/vocabulary_pipeline/ReceiptCompatibilityProbe.java
docs/Content/automated-source-registry.md
docs/Content/vocabulary-verification-policy.md
docs/Content/vocabulary-auto-verification-manifest.jsonl
docs/QA/vocabulary-auto-verification-report.md
```

Một file tracked được sửa, 16 file mới. Không stage bất kỳ phần nào của dirty graph maintainer. Index được kiểm tra chỉ chứa 17 file trên trước commit và trống sau commit. Toàn bộ raw evidence và các DB clone audit giữ riêng để nghiên cứu lại; container audit được dừng sau khi kiểm chứng, không drop DB hoặc dừng container khác.
