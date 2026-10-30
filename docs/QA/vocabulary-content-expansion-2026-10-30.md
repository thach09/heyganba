# Vocabulary content expansion — 2026-10-30

Đã **nhập thật 25 từ mới ở trạng thái PENDING_REVIEW** vào PostgreSQL local cô lập,
giữ nguyên dữ liệu học, và áp dụng bản sửa phồn thể ID 173. Không có từ mới được
công bố; CORE_VERIFIED/FULLY_VERIFIED đều bằng 0. Không yêu cầu người dùng duyệt
từng từ hoặc cung cấp API key. Không thay đổi quyền xuất bản để tạo kết quả xanh.

Baseline: branch `feat/v2.1-ux-and-stability`, HEAD
`d42db32386b4f364441457d8f8f4d23cc411768f`.
Commit implementation/content và commit báo cáo được tạo riêng; xem
`git log -2 --format='%h %s'` sau lượt này. Không push/merge/deploy.

## Kết quả dữ liệu thực

| Chỉ số | Trước | Sau |
|---|---:|---:|
| Vocabulary trong snapshot/database ứng viên | 560 | 585 |
| Hàng đợi nghiên cứu (gồm đề xuất chưa nhập) | 585 | 610 |
| NEEDS_RESEARCH trong hàng đợi | 583 | 608 |
| CONFLICT | 2 | 2 |
| LICENSE_BLOCKED / REJECTED | 0 / 0 | 0 / 0 |
| CORE_VERIFIED / FULLY_VERIFIED / AUTO_VERIFIED | 0 / 0 / 0 | 0 / 0 / 0 |
| Từ mới thực sự nhập local | — | 25 pending |
| Dòng cũ được sửa field trên clone này | — | 1 |
| Từ mới được xuất bản / production receipt / production writes | — | 0 / 0 / 0 |

Đã audit từng record của 560 dòng gốc bằng engine hiện có, rồi kiểm tra cả 610
ứng viên với nguồn thật. Đây là **audit cho ra kết quả chưa đạt**, không phải 560
nghĩa Việt đã được chứng minh chính xác. 25 discovery candidates cũ vẫn giữ trong
hàng đợi, không tính nhầm thành 25 dòng đã nhập mới. Batch HSK1 mới có 18 từ chưa
nằm trong các word-set đề xuất web-batch maintainer đã kiểm tra, 7 từ đã từng được
đề xuất nhưng vẫn vắng trong V14 và được nghiên cứu lại. Cả 25 đều thực sự vắng
khỏi database V14 và không trùng 25 discovery candidates cũ.

[25 candidate với nghĩa Việt và attribution](../Content/hsk1-pending-candidates-2026-10-30.json),
[manifest field-level 610 records](../Content/vocabulary-content-expansion-manifest-2026-10-30.jsonl),
[số liệu, skip reasons, hash delta](vocabulary-content-expansion-2026-10-30.json).
Manifest chứa hash/URL/revision/entry/sense/lineage và kết luận theo field; không
chứa full export từ điển hoặc toàn bộ syllabus được bảo hộ. Source snapshots và
English definitions nằm trong kho bằng chứng private.

## Những lỗi và đề xuất được xử lý

- **ID 173 手表:** traditional `手表 → 手錶` có nguồn trực tiếp, áp dụng qua guarded
  field correction. ID/word/reading/meaning/POS, các optional draft và quan hệ học
  giữ nguyên; eligibility revision tăng theo audit. Đây là tái lập bản sửa đã có
  bằng chứng ở phiên trước, **không phải một lỗi mới phát hiện so với baseline**.
- **IDs 6 và 42 再见:** POS verb/interjection chưa thống nhất theo sense. Giữ riêng
  hai ID sử dụng trong bài học; không ghi đè hoặc gộp. Hai correction proposals bị
  chặn đúng vì thiếu corroboration POS/sense độc lập.
- **ID 49 几:** cách ghi `<10` quá tuyệt đối so với định nghĩa số lượng nguồn.
  **ID 204 得:** cần giải thích trợ từ `de`, tránh làm người học hiểu như động từ
  Việt “được”. Đây là hai **đề xuất biên tập chưa được xác minh**, không tính thành
  hai lỗi đã chứng minh hoặc hai bản sửa đã áp dụng. Nội dung gốc được giữ nguyên;
  [drafts có reference đúng sense](../Content/vocabulary-editorial-proposals-2026-10-30.json).

## Nguồn và ngưỡng xác minh

Đã đọc lại policy, source registry, publication authority, projection/quarantine
và báo cáo trước. Không tạo framework mới hoặc thay public digest/receipt contract.

- [CC-CEDICT/MDBG](https://www.mdbg.net/chinese/dictionary?page=cc-cedict): export
  pin ngày 2026-10-28, SHA-256
  `714c3e7ea6086956f163eb9387d627859e5c00c0e51725197b7a0c670cc2641a`.
  CC BY-SA 4.0, ghi công và share-alike. Trang primary hiện công bố export mới hơn;
  lần này dùng snapshot pin để tái lập, không gọi nó là latest. Mỗi từ mới chọn
  một entry/sense/definition hash, không lấy họ người hoặc sense khác để dịch.
- [Wiktionary copyright](https://en.wiktionary.org/wiki/Wiktionary:Copyrights):
  không đánh đồng văn bản gốc với quotation bên thứ ba. Với 25 từ HSK1 cuối cùng,
  **24 trang EN có snapshot, 1 HTTP 429**; fetch thành công không đồng nghĩa parser
  hay independence đã đạt. Mỗi đợt giới hạn số request, khoảng cách ít nhất 5 giây,
  dừng khi 429. Tổng hai đợt acquisition thêm: 33 requests, 31 fetched, 2 gặp 429;
  đây không phải 33 từ được verified. Không lặp endpoint CVDICT hỏng.
- [CFDICT primary](https://chine.in/cfdict.php) nêu rõ dựa trên CC-CEDICT và CC
  BY-SA 3.0. Không tính nó như một family độc lập hoặc bản dịch Việt. Không nhập
  hàng loạt từ nguồn này. Các hạn chế MOE/NAER/CWN/CVDICT đã ghi trước vẫn giữ;
  chưa tìm được nguồn Trung–Việt mới vừa có quyền reuse rõ vừa đủ evidence.
- PDF CTI pin published 2025-11/effective 2026-07 được tải lại thực tế:
  4.636.209 bytes, 406 trang, SHA-256
  `ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941`.
  Đã xem cover/table, trích kiểm tra đủ IDs 1–11000. Chỉ dùng cho đối chiếu chữ,
  Pinyin và ID/cấp nghiên cứu; không suy ra nghĩa Việt, quyền redistribute toàn
  bảng hoặc tuyên bố phiên bản mới nhất. Bản PDF/full reference giữ private.

Trong kết quả thực có extraction từ CC-CEDICT, EN Wiktionary và VI Wiktionary,
nhưng **chỉ 1 family đủ điều kiện independence: cedict**. Wiktionary chưa có
entry-level lineage đủ điều kiện; số domain không thay thế số family độc lập.
Không có lời gọi external assessor thật (0), không dùng mock hay tự đánh giá
cùng model như corroboration. Nghĩa Việt mới là **AI-assisted editorial draft dựa
trên definition đã dẫn**, không giả là bản dịch Việt có sẵn trong nguồn.

Policy V1.2 đã cho phép deterministic corroboration khi có hai định nghĩa Việt
độc lập phù hợp; external assessor **không bắt buộc cho mọi trường hợp**. Ở cohort
này chưa có những bằng chứng đó. Quy tắc hai family cho word/reading/POS không
được hạ xuống một chỉ vì tên gọi POS khác nhau. Interjection vẫn cần đúng sense;
không có benchmark/bằng chứng thay thế đủ mạnh để ban hành semantic policy mới.
Optional fields đã được tách khỏi core bằng contract hiện có.

Các lý do tổng hợp sau không loại trừ nhau:

| Lý do | Số record |
|---|---:|
| Không có semantic assessor/corroboration thay thế đủ điều kiện | 610 |
| Word/reading/meaning/POS chưa VERIFIED (mỗi field, gồm 2 conflict) | 610 |
| EN Wiktionary independence unresolved | 92 |
| VI Wiktionary independence unresolved | 30 |
| CC-CEDICT không có supported match | 19 |
| EN Wiktionary không có supported match | 17 |
| VI Wiktionary thiếu page/revision | 34 |
| VI Wiktionary không có supported match | 26 |
| HTTP 429 còn hiện trong kết quả (VI 2, EN 1) | 3 |
| POS/sense ambiguity thực tế | 2 |

Engine bỏ qua bước tổng hợp `UNVERIFIED_FIELD` khi đã CONFLICT nên reason counters
cho core là 608, còn field results là 610 chưa đạt. Không diễn giải reason
`SEMANTIC_ASSESSOR_NOT_CONFIGURED` thành điều kiện phải mua API key.
Traditional field: **591 verified, 19 chưa đạt** trên 610 research candidates;
không phải 591 core verified. 50 candidate không có supplemental fields nên
`SUPPLEMENTAL_VERIFIED` là trạng thái rỗng theo contract, **0 ví dụ/Hán Việt mới
được xác minh**. Các con số hoàn toàn tách với quyền publication.

## Import thật, an toàn và khả năng tái lập

Chỉ bổ sung opt-in `--pending-research-output`: candidate mới phải có draft flag,
editorial origin/license, immutable candidate/result binding và exact lexical
DEFINITION hỗ trợ word/reading/sense. Không nhận CONFLICT/LICENSE_BLOCKED, edits
row cũ hoặc optional fields qua nhánh này. Default verified import, core projection
và publication authority giữ nguyên.

Candidate SQL **không nằm trong repo/release manifest**. Trên native PostgreSQL
**16.15** private, loopback, đánh dấu audit/kiểm tra data_directory trước khi ghi:

1. Clone fixture V14 sang `jiayou_ingestion_40434d208bf9`.
2. Flyway private V15 thêm đúng 25 pending rows; 560 exported rows cũ giữ nguyên.
3. Private V16 sửa traditional ID 173; đọc lại 585 rows, chỉ traditional và audit
   revision của ID đó thay đổi so với bước 2.
4. Notebook item, SRS repetitions, completed mock exam và exam-results snapshot
   của synthetic disabled learner giữ nguyên trước/sau. Không dùng tài khoản thật.
5. Rerun migration: 0 migration mới, audit không đổi. Transaction rollback, same
   word collision và archived/revoked rerun rejection còn được test độc lập.
6. Mọi row mới: pending, lesson/hsk_level null, không publication digest, false
   optional verification flags, có fieldResults và exact draft-source metadata.
   Official-ID research vẫn giữ trong metadata, không gán level/lesson công khai.

Đọc lại actual DB fields và kiểm tra **585/585 Python–Java V2 digests khớp**, không
ký. Pilot gốc 25+25 và pilot ưu tiên HSK1 25+25 đều được chạy lại: mỗi bộ 49
NEEDS_RESEARCH +1 CONFLICT. Full610 chạy lần đầu ghi 610 ledger records, lần hai
0; pilot ưu tiên chạy lại 0 ledger writes. Không tạo unsigned publication proposal
giả cho record chưa đủ core. Giữ cả những đề xuất chưa đạt; không xóa để tăng tỉ lệ.

Kho bằng chứng private có ACL giới hạn:
`C:\Users\LENOVO\AppData\Local\Temp\jiayou-content-expansion-g3dsu8ap`.
Giữ `research/objects`, locks, candidate JSON, actual DB exports, generated SQL,
Flyway logs và baseline backup. File config chứa mật khẩu local **không commit**.
Reproduction cần đúng các pinned objects/locks, không hứa URL mutable hôm nay trả
lại đúng bytes cũ. Public candidate envelope cung cấp mảng `candidates`; xuất
mảng đó ra private JSON trước khi gọi CLI. Chạy theo thứ tự:

```text
python -m scripts.vocabulary_pipeline --private-dir <private-evidence> verify --candidates <candidate-array.json> --locks <locks.json> --output <result.json> --pending-research-output <private-evidence/new-pending.sql>
```

SQL output dùng exclusive create, không overwrite checkpoint. Apply qua Flyway
chỉ trên clone local V14, xuất lại dữ liệu/audit và rerun; không đưa private V15/V16
này vào production version namespace. Đã dừng cluster sở hữu sau test và xác nhận
port đóng. Không thay checksum của 14 migration lịch sử.

## Coverage theo syllabus pin

Đếm unique official ID bằng chữ + cách đọc giữ dấu thanh, chuẩn hóa khoảng trắng/
apostrophe/case; loại ambiguous multiple-ID matches. Không trộn HSK 2.0 với
CTI pin hoặc cấp nội bộ V9. ID `半` có notation 1(4) giữ primary level 1.

| Primary level | Tổng IDs | Match trước | Match sau | Còn thiếu |
|---|---:|---:|---:|---:|
| 1 | 300 | 194 | 219 | **81** |
| 2 | 200 | 72 | 72 | 128 |
| 3 | 500 | 66 | 66 | 434 |
| 4 | 1000 | 47 | 47 | 953 |
| 5 | 1600 | 42 | 42 | 1558 |
| 6 | 1800 | 14 | 14 | 1786 |

HSK1 **chưa đầy đủ**. 219 là lexical coverage của pending data; **0 mục có core
mới đủ điều kiện publication**. Machine report có đầy đủ matched219/missing81 ID.
Không mở rộng sang HSK2 chỉ để tăng lượng khi pilot chưa thiết lập được chất lượng
semantic/POS độc lập. Không thay Dashboard/lesson copy hay public curriculum.

## Kiểm thử thực thi

Build candidate = archive HEAD d42db32 + đúng Python thay đổi của task. Không
overlay dirty backend/frontend maintainer. Không build/clean target/dist gốc.
Kết quả không chứng nhận toàn bộ dirty integration tree hay corpus đã publish.

| Lệnh/gate | Kết quả thực |
|---|---|
| Python engine/unblock/core/pending/postgres/receipt unittest | **93/93 pass, 0 fail/error/skip**, chạy lại trong isolated workspace |
| Offline CI Python command: engine + unblock + core_projection + pending_research | **87/87 pass** |
| `mvn -o -B clean verify` H2 | exit0, **513 total: 506 pass, 0 failure/error, 7 skip** |
| `mvn -o -B test` PostgreSQL16, env CI trừ host/credentials/DB local riêng | exit0, **513 total: 506 pass, 0 failure/error, 7 skip** |
| `npm test` | exit0, **276/276 Vitest, 31 files +8/8 Node**, 0 skip |
| `npm run lint`, `npm run build` | exit0 / exit0, không warning trong logs của hai lệnh |
| Actual snapshot digest bridge | 585/585 match, no signing |
| `audit-production-artifact.py --test-rejections` | pass; V1–V14 only, 0 Japanese/QA resources; 4 synthetic bad artifacts rejected |
| `git diff --check` | exit0; Git LF→CRLF notices không phải lỗi whitespace |

Python tăng **88→93**: 4 pending-admission security unit tests và 1 PostgreSQL
pending/rollback/idempotency/revocation test; không bỏ test. Java/frontend số lượng
giữ nguyên. 93 =87 unit +4 PG +2 Java bridge. Synthetic tests kiểm tra contract,
không được tính vào số từ lexical verified.

7 skip mỗi Maven suite giữ nguyên: `PostgresSchemaStagingRehearsalTest` case A/B/C
thiếu opt-in `postgres.rehearsal`; 4 `ProductionMigrationSafetyTest` fresh/upgrade/
rollback/checksum thiếu `postgres.production-rehearsal` và bộ DB riêng. Từng tên/
reason lấy từ Surefire XML có trong machine report. **Không tính skip là pass**;
không tuyên bố đã chạy lại 7 opt-in đó. Đã chạy private batch Flyway thực tế và
full PG suite riêng, không thay thế chúng bằng assertion mô phỏng.

Backend warnings còn: JDK dynamic-agent/CDS, explicit dialect deprecation,
AuthenticationProvider configuration và expected security-negative logs. Không
thay code để che warnings. Spring advisory memo/exception giữ nguyên, không có
CVE scan mới hoặc tuyên bố scanner sạch.

## Git preservation và phạm vi

Baseline index rỗng, 42 tracked modified +1 deleted (`render.yaml`) +77 untracked
default entries. Snapshot backup/status/diff và **1008 file hashes** trước task.
**1001 file baseline giữ nguyên hash**, chỉ 7 file clean-at-start dưới đây đổi.
Mọi dirty/untracked maintainer có trước giữ nguyên. Không restore/reset/clean.

Các file implementation/content của task:

- `.github/workflows/ci.yml`: thêm module unit pending admission vào command cũ;
  không đổi jobs/services/deployment.
- `scripts/vocabulary_pipeline/ingestion.py`: opt-in draft admission và metadata.
- `scripts/vocabulary_pipeline/__main__.py`: private research SQL output.
- `scripts/vocabulary_pipeline/test_postgres.py`: regression PG mới.
- `scripts/vocabulary_pipeline/test_pending_research.py`: 4 negative/positive units.
- `backend/docs/vocabulary-publication.md`: phân định pending với publication.
- `docs/Content/vocabulary-verification-policy.md`: admission policy, không hạ V1.2.
- `docs/Content/automated-source-registry.md`: license/lineage follow-up.
- `docs/Content/hsk1-pending-candidates-2026-10-30.json`: 25 draft thực đã nhập.
- `docs/Content/vocabulary-editorial-proposals-2026-10-30.json`: 2 proposal chưa áp dụng.
- `docs/Content/vocabulary-content-expansion-manifest-2026-10-30.jsonl`: 610 field-level outcomes.

Hai file báo cáo: chính file này và JSON cùng tên. Không sửa Java/frontend runtime,
migration, manifest release, trust configuration hoặc deployment. Chỉ stage đúng
các file liệt kê bằng path cụ thể; kiểm tra cached diff trước local commit.

Chặn release còn lại: independent sense/POS/Vietnamese evidence, entry lineage,
nguồn Trung–Việt reusable; production source-rights catalog/authorized issuer/key
chưa có. Không yêu cầu routine human review; hàng đợi và evidence cho phép tiếp
tục tự nghiên cứu khi có nguồn hợp lệ. Thành quả local hiện tại là **25 pending
additions có nguồn và 1 correction được bảo vệ**, không phải một curriculum đã
verified hoặc đã published.
