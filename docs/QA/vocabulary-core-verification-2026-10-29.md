# Vocabulary core/supplemental verification — 2026-10-29

**Đã triển khai tách core/enrichment và bản chiếu có quarantine. Chưa có core thật đủ điều kiện xuất bản.** Optional draft đã được tách khỏi kết luận core; thiếu evidence POS/semantic/independence vẫn là blocker thật. Không sửa bằng parser heuristic, confidence hoặc approvals giả.

Baseline `a927cfb28f97aee6d4deabb42cfa9aa17a5d844a`, branch `feat/v2.1-ux-and-stability`. Commit triển khai: **`5e2a1b56d82d3619a380c3485818d8a7a6b5a39e`**. Report/manifest ở commit local riêng; lấy hash bằng `git log -1 --format=%H -- docs/QA/vocabulary-core-verification-2026-10-29.md`. Không push, merge hoặc deploy.

[Manifest 585 record](../Content/vocabulary-core-verification-manifest-2026-10-29.jsonl) có before/after, kết quả từng field/core/supplement, source/extraction hashes, licensing/lineage metadata, counts/skips của test và hash delta. Không chứa raw định nghĩa nguồn, optional draft thật hoặc credentials. Evidence private: `C:\Users\LENOVO\AppData\Local\Temp\jiayou-core-verification-jrz5psrb`.

## Kết quả thật trước/sau

Cohort là snapshot V14 local 560 row, cộng 25 candidate mới từ pilot cũ. Không phải kiểm kê production và không cộng trùng 25 existing trong pilot.

| Chỉ số, 585 candidate | Trước a927cfb | Sau |
|---|---:|---:|
| CORE_VERIFIED | 0, suy từ bằng chứng từng field | **0** |
| FULLY_VERIFIED / AUTO_VERIFIED | 0 | **0** |
| NEEDS_RESEARCH | 583 | **583** |
| CONFLICT | 2 | **2** |
| Traditional field VERIFIED | 566 | **566** |
| Word/reading/meaning/POS fields VERIFIED | 0 mỗi field | **0 mỗi field** |
| Hán Việt/example fields VERIFIED | 0 | **0** |
| Real assessor calls / genuine assessments | 0 / 0 | **0 / 0** |
| Real core projections / unsigned receipts / trusted production receipts | 0 / 0 / 0 | **0 / 0 / 0** |

Pilot 25 existing + 25 new đã chạy lại: **49 NEEDS_RESEARCH, 1 CONFLICT**, 0 CORE_VERIFIED, 0 FULLY_VERIFIED; 49 traditional fields VERIFIED. Same-input repeat ghi **0 ledger rows**. CLI không tạo file core proposal/import khi không có eligible core.

Outcome mới trên cohort: **583 CORE_NEEDS_RESEARCH, 2 CORE_CONFLICT; 25 SUPPLEMENTAL_VERIFIED, 560 SUPPLEMENTAL_NEEDS_RESEARCH; 585 NOT_FULLY_VERIFIED**. Hai mươi lăm supplemental outcome chỉ xác nhận traditional đang có của 25 candidate mới; chúng không có Hán Việt/ví dụ được duyệt và không có nghĩa Việt/POS được xác minh. Đây là phân loại rõ hơn của evidence đã có, **không phải 25 từ mới được duyệt** hoặc 566 core được duyệt. Không có bằng chứng ngữ nghĩa mới nào được bịa để đổi counts.

## Policy và authority

Đã đọc policy, verifier V1, authority runtime, projections/DTO và test/publication fixture. Core tương thích authority là **word, reading, Vietnamese meaning theo sense, POS**. Traditional, Hán Việt và ví dụ là enrichment. Classifiers/English definitions chỉ là audit bổ sung; syllabus/official level là claim riêng.

Chữ/cách đọc/nghĩa là tối thiểu cho thẻ học; POS không phải bắt buộc cho mọi sản phẩm từ điển, nhưng ở contract hiện tại là field core được authority yêu cầu. Hai nguồn POS tường minh là rule nghiêm ngặt, trong khi nhiều nguồn không annotate POS hoặc dùng taxonomy khác nhau. Một policy khác có thể đánh giá một nguồn POS cùng assessor độc lập theo sense, nhưng chưa có evidence/assessment thật để chứng minh thiết kế đó an toàn và verifier V1 hiện yêu cầu hai family. Rule đó được ghi nhận để đánh giá riêng, **không hạ xuống một nguồn để làm xanh pilot**.

Các yêu cầu có thể làm deterministic: chữ/cách đọc đúng thanh từ hai family độc lập; POS alias được nguồn ghi tường minh; traditional từ nguồn thực hỗ trợ; nghĩa Việt chính xác từ hai nguồn Việt độc lập cùng reading/POS/sense. Đường nghĩa Việt deterministic vẫn có regression synthetic và không đòi AI/human khi đủ evidence, nhưng chưa có record thật đáp ứng. Cùng AI biên soạn rồi tự đánh giá không tạo nguồn thứ hai.

V1.2 thêm coreVerification/supplementalVerification/supplementalFields/fullVerification; không đổi codec **VOCAB_CONTENT_V2**, receipt **VOCAB_EVIDENCE_RECEIPT_V1**, authority runtime hoặc ngưỡng corroboration core. Catalog phải explicitly trust policy/decision version mới; không auto-upgrade issuer/rights. Source ID khác nhau không đủ: kiểm tra khác family, khác snapshot hash, dependency closure không giao nhau và eligibility. Closure luôn chứa chính family; không thể giấu family bằng cách khai thiếu lineage. Nguồn dư không rõ quyền, không được dùng làm proof, không hủy core đã đủ các nguồn hợp lệ khác. Expression bị hạn chế vẫn chặn.

## Bản chiếu core an toàn

`projection.py` chỉ nhận result CORE_VERIFIED có immutable bundle khớp candidate/result hiện hành. Nó tạo candidate **riêng**, giữ nguyên input gốc. Bản chiếu giữ core và traditional đã VERIFIED; các enrichment còn lại được withheld, có danh sách field và liên kết source-record hash/digest. Nó mang CORE_VERIFIED/CORE_ONLY_PROJECTION/NOT_FULLY_VERIFIED, không đổi record gốc thành fully verified.

Pending generator:

- Lưu đầy đủ candidate/result gốc trong `vocabulary_research_quarantine`, liên kết vocabulary ID, original/projected digest và source-record SHA-256.
- Chụp các cột academic vật lý trước UPDATE, gồm modern/legacy aliases có giá trị khác nhau bị COALESCE/getter che; giữ JSONB cùng SHA-256 riêng. Không làm mất draft chỉ vì nó không phải getter đang có hiệu lực.
- Đồng bộ bản chiếu và giữ quarantine trong cùng transaction, có row/advisory lock, before-content/revision guard, idempotency và withdrawal checks. Fail/rollback không để lại row đã clear mà thiếu draft. Quarantine bị sửa làm rerun thất bại.
- Giữ ID/lesson/notebook/SRS; row vẫn pending, optional flags false và publication digest cũ bị vô hiệu. Dấu câu/dấu `;` trong draft không bị xóa: SQL dùng hex encoding khi cần.

Raw CORE_VERIFIED record còn draft bị từ chối khi xin receipt/import trực tiếp. Phải persist đúng bản chiếu, export lại chín field và current revision, giữ projection provenance rồi mới chuẩn bị unsigned V1 payload. Digest là của **toàn bộ row thực đang lưu**, không phải hash một mask trên row vẫn giữ draft. Withheld fields thật sự null/NOT_PRESENT, capabilities false. Authority hiện có tiếp tục chặn false presence, stale digest/revision, raw optional draft, thiếu nguồn/quyền/chữ ký và draft được thêm lại.

Không có Entity/learner API cho quarantine; operator phải bảo vệ DB/evidence và không serve objects công khai. Generated SQL/table DDL chỉ nằm private, không được thêm vào release resources/allowlist hay sửa checksum migration lịch sử. Bảng rehearsal chưa phát hành không được coi là schema production đã nâng cấp.

## Nguồn độc lập đã điều tra

Hai family lexical thực đã xử lý vẫn là **CC-CEDICT và Wiktionary**; chỉ **một family hiện eligible về independence (CC-CEDICT)**, không có eligible pair. Wiki Anh/Việt là cùng family, entry lineage chưa được chứng minh. Không đăng ký thêm family dựa vào tên domain hoặc việc tải được README.

| Nguồn bổ sung | Kết luận có căn cứ |
|---|---|
| MOE Đài Loan / Moedict | Publisher MOE có từ điển và cách đọc độc lập tiềm năng; primary download metadata và Moedict ghi BY-ND 3.0 Taiwan. Moedict là derivative của MOE, không thêm family. Không giả quyền dịch/adapt định nghĩa, không coi mọi entry có POS phù hợp. Không nhập corpus. |
| TBCL/COCT NAER | Có bảng chữ/từ, nhưng báo cáo kỹ thuật chính NAER nói bảng TBCL không phân biệt mọi POS/sense của cùng từ. Không lấy syllabus làm proof POS/nghĩa Việt, không trộn TBCL với HSK. Chưa có grant reuse phù hợp được xác định. |
| CwnGraph | README/license live có GPLv3 cho code, data image tải riêng. Chưa pin quyền/lineage dataset, nên không coi license code là license dữ liệu hoặc tự auto-download image. |
| Từ điển học tập NAER | Có POS tiềm năng, chưa có quyền redistribution/adaptation đủ căn cứ; không scrape định nghĩa. |

Chi tiết và primary links: [source research](../Content/automated-source-registry.md). Web retrieval đọc được một số metadata MOE/NAER, trong khi Python HTTPS trực tiếp thất bại; manifest ghi rõ lỗi, không có hash/corpus giả cho các URL đó. Raw metadata tải được có hash, nhưng **không được đưa vào field evidence của candidate**. Không bypass TLS/access controls. Các blocker CVDICT 404, PanLex rights, COW lineage và Wiki lineage của phiên trước vẫn chưa được giải quyết; không đếm mirror/dẫn xuất là nguồn độc lập.

## Assessor và cấu hình operator

OpenAI Responses và Gemini generateContent adapters hiện có được giữ, thêm strict JSON chống duplicate keys/nonfinite values và cap request 1 MiB. Response/request binding, schema/facet checks, actual provider model metadata, known extraction references, same-model denial, bounded retry/timeout, no redirect và no stale response reuse vẫn áp dụng. Mock không được dùng xác minh nghĩa thật.

| Biến môi trường | Giá trị operator cần cung cấp |
|---|---|
| `JIAYOU_ASSESSOR_PROVIDER` | `openai` hoặc `gemini`; mặc định disabled |
| `OPENAI_API_KEY` hoặc `GEMINI_API_KEY` | Secret thật của provider được cấp quyền, đặt ngoài Git; không dùng Codex/ChatGPT OAuth |
| `JIAYOU_ASSESSOR_MODEL` | Exact/pinned model ID có quyền dùng structured output trên endpoint đã chọn; không có default model |
| `JIAYOU_ASSESSOR_AUTHOR_MODEL` | Danh tính thật của model biên soạn; không khai khác model chỉ để qua gate |
| `JIAYOU_ASSESSOR_ATTEMPTS` | 1–3, default 2 |
| `JIAYOU_ASSESSOR_TIMEOUT_SECONDS` | 1–60, default 45 |
| `JIAYOU_ASSESSOR_MAX_OUTPUT_TOKENS` | 256–8192, default 2048 |

Không có các key/model này trong môi trường được kiểm tra; **0 real calls**. Live provider behavior/model quality chưa được xác minh. Không gọi adapter “đã production-validated” từ mock transport PASS. Gemini generateContent compatibility phải phù hợp model operator chọn; không tự chuyển sang API/model khác hoặc tạo credential. Quy trình exact CLI/projection: [policy](../Content/vocabulary-verification-policy.md). Provider configuration không thay quyền reuse, source independence hay publication issuer/catalog. Không cần review tay từng từ khi checks thật đạt.

## Conflicts và rehearsal

IDs 6/42 `再见`: đề xuất POS thán từ vẫn bị chặn vì thiếu independent POS/sense corroboration. Không gộp hai learner/lesson IDs. ID 173 `手表 → 手錶`: đề xuất field correction được rehearse lại qua Flyway trên fresh native clone; **560 rows trước/sau**, chỉ traditional và eligibility revision thay đổi, optional bytes giữ nguyên, row pending. Đây là tái lập bản sửa đã có bằng chứng ở a927cfb, **0 conflict mới được giải quyết so với baseline**, không cộng nó như một từ mới.

Tổng reproposed 3 / supported 1 / blocked 2 / rehearsed trên local clone 1. Một rehearsal **synthetic riêng** cho core projection qua Flyway thực: apply 1, repeat 0, quarantine 1, draft bytes giữ nguyên, row pending. Nó không được cộng vào số verified core thật. Tests còn chứng minh giữ hidden legacy aliases, rollback, tamper detection và learner relationships.

## Kiểm thử thực thi

Workspace cô lập là archive HEAD a927cfb + đúng thay đổi task. Maintainer dirty backend/frontend không được overlay; kết quả này chứng nhận candidate cô lập, **không chứng nhận toàn bộ dirty integration tree**. Không build/clean target/dist gốc.

| Gate | Kết quả |
|---|---|
| Python unit + PostgreSQL + Java receipt bridge | **88/88 passed, 0 failure/error/skip**: 83 unit, 3 PG, 2 Java bridge |
| CI offline command mới | **83/83 passed**; 50 test_engine cũ, 23 assessor/unblock, 10 core/security |
| Focused Java authority/API | **24/24 passed** |
| `mvn -o -B clean verify` H2, source ổn định | exit 0: **513 total, 506 passed, 0 failures/errors, 7 skipped** |
| `mvn -o -B test`, env CI với PostgreSQL 16 local | exit 0: **513 total, 506 passed, 0 failures/errors, 7 skipped** |
| `npm test` | exit 0: **276/276 Vitest, 31 files + 8/8 Node** |
| `npm run lint`, `npm run build` | exit 0 / 0 |
| Real snapshot Python↔Java V2 | **560/560 digests match**, no signing |
| Controlled artifact + negative artifact checks | pass; V1–V14 only, 0 Japanese/QA resources; no private projection SQL/catalog |
| `git diff --check`, staged check | exit 0; Git LF→CRLF notices only |

So với phiên trước: Python **74→88**, thêm 10 core/security units, 2 provider JSON/size units, 1 PostgreSQL projection test, 1 Java projection bridge. JUnit **509→513**, thêm 3 authority negatives và 1 API core/null/reintroduced-draft case. Không bỏ test. Bảy skip mỗi Maven suite giữ nguyên: 3 PostgresSchemaStagingRehearsalTest và 4 ProductionMigrationSafetyTest opt-in; manifest có từng tên/reason. Chúng không được tính pass. CI chỉ mở rộng command Python trong job hiện có, không đổi service, permissions hay deployment behavior.

Docker daemon không chạy. Để chạy PG thật, đã dùng ZIP PostgreSQL **16.15** qua kênh EDB được PostgreSQL.org dẫn tới, giải nén/chạy trong private temp, SCRAM, loopback-only, không service/global install. Download URL/hash trong manifest; không tuyên bố có independent vendor-signature attestation từ hash tự tính. Native integration guard xác nhận data_directory/private marker trước khi ghi. **Cluster đã dừng và private port đã đóng** sau test; data/evidence giữ lại. Không start Docker hoặc tác động DB/container khác.

Spring advisory memo/exceptions giữ nguyên; không chạy CVE scan mới và không tuyên bố scanner sạch.

## Git và file delta

Baseline: **42 modified tracked, 1 deleted (`render.yaml`), 77 untracked default entries**, index rỗng. Có backup/status/diff và hash của 1004 file baseline. **990 file giữ nguyên hash**, 14 file clean-at-start được sửa có chủ đích; mọi dirty/untracked của maintainer nguyên hash. Hai implementation file mới và hai report/evidence file mới thuộc task này. Không restore/reset/clean/stage file khác.

Commit triển khai gồm đúng 16 file:

- `.github/workflows/ci.yml` — chạy thêm offline regressions.
- `backend/docs/vocabulary-publication.md` — contract core subset/quarantine.
- `backend/src/test/java/com/heyganba/VocabularyPublicationApiTest.java`.
- `backend/src/test/java/com/heyganba/service/VocabularyPublicationAuthorityTest.java`.
- `docs/Content/automated-source-registry.md`.
- `docs/Content/vocabulary-verification-policy.md`.
- `scripts/vocabulary_pipeline/ReceiptCompatibilityProbe.java`.
- `scripts/vocabulary_pipeline/__main__.py`.
- `scripts/vocabulary_pipeline/assessors.py`.
- `scripts/vocabulary_pipeline/engine.py`.
- `scripts/vocabulary_pipeline/ingestion.py`.
- `scripts/vocabulary_pipeline/projection.py` (new).
- `scripts/vocabulary_pipeline/test_core_projection.py` (new).
- `scripts/vocabulary_pipeline/test_postgres.py`.
- `scripts/vocabulary_pipeline/test_receipt.py`.
- `scripts/vocabulary_pipeline/test_unblock.py`.

Evidence commit chỉ thêm report này và `docs/Content/vocabulary-core-verification-manifest-2026-10-29.jsonl`. Before/after SHA-256 từng implementation file nằm trong manifest; self-hashes của hai artifact cuối lấy từ Git để tránh tham chiếu vòng. Backend runtime source, frontend source, migrations và deployment settings không đổi trong task.

**Phần còn chặn mục tiêu học liệu thật:** chưa có eligible second lexical/POS family, chưa có semantic assessment thật hoặc hai nguồn Việt độc lập đủ mạnh, và chưa có authorized production issuer/rights/signing configuration. Core-only representation đã hoạt động trên tests/DB thật, nhưng không thể dùng nó để biến 585 record thiếu core evidence thành học liệu được phép xuất bản. Không phát hành dữ liệu chưa đạt; không tiếp tục thêm heuristic khi các blocker thực tế này chưa đổi.
