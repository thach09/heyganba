# Autonomous learning content strategy — 2026-10-30

**Khuyến nghị tách B thành authoring-quality policy riêng, nhưng chưa triển khai
workflow EDITORIAL_VALIDATED hoặc publication route mới.** Đã hoàn thành hai mục
học liệu và benchmark có thể chạy lại. Nội dung hiện là EDITORIAL_DRAFT; hai seed
đạt phép kiểm tra B đề xuất, **0 mục được nâng thành EDITORIAL_VALIDATED,
CORE_VERIFIED hoặc PUBLISHED**.

Baseline branch `feat/v2.1-ux-and-stability`, HEAD
`486171e2951c08ddd4732d7ef1a134cfd8f6f569`. Không mở rộng lexical-source audit hoặc
batch 610, không thêm vocabulary row. Chỉ nghiên cứu đúng hai target, một grammar
pattern, Vietnamese scope checks và source rights cần thiết.

## So sánh A / B / C

| Tiêu chí | A — trusted lexical policy hiện có | B — editorial quality có phiên bản riêng | C — independent external assessor tùy chọn |
|---|---|---|---|
| Mục tiêu | Chứng minh core lexical fields đúng sense và đủ independent sources | Chuẩn bị bài học rõ ràng, bounded context, nguyên gốc, có provenance | Đánh giá thêm semantic alignment/naturalness khi có provider/model độc lập |
| Trạng thái đầu ra | CORE_VERIFIED khi đạt; chưa tự publish | EDITORIAL_VALIDATED **chỉ sau khi policy được adopt**, scope được ghi rõ; pilot hiện vẫn draft | Structured assessment, có thể UNKNOWN/CONFLICT; không phải certificate tự đủ |
| Không API key | Có, khi deterministic independent Vietnamese evidence đủ; hiện thiếu | Có với source facts + constrained templates; không hứa kiểm chứng free prose | Không cần cho A/B; nếu chọn hosted provider thì cần cấu hình thật; local independent model cũng cần thực sự khả dụng |
| Quality risk | False abstention cao khi nguồn thiếu POS/lineage; đồng thuận nguồn vẫn có thể sai | Overfit catalog/template, wrong concept, unsupported prose, ambiguity; cần abstention mạnh và kiểm thử ngoài mẫu | Hallucination, correlated models, provider/model drift và confidence không đáng tin nếu thiếu grounding |
| Licensing | Source expressions + notices + production rights catalog | Original wording/adaptation notices; không suy quyền từ một label hoặc một source URL | Quyền dùng source/inputs vẫn cần; model verdict không sửa được quyền hoặc provenance |
| Complexity | Pipeline/receipt/quarantine đã có | Thiết kế nhỏ nếu finite frames; sẽ phức tạp nếu cố làm semantic parser cho mọi từ | Adapters hiện có; thêm ops, cost/budget/privacy/model-version evaluation |
| Scalability | Phụ thuộc nguồn đủ field/sense và independence | Chỉ mở rộng những frames có evidence và approved global rules; ngoài scope giữ draft | Có thể hỗ trợ rộng hơn nhưng vẫn phải abstain, pin metadata/evidence, không giải quyết source rights bằng model |
| Publication | Cần mọi receipt/catalog/rights/digest/revision gate hiện hành | **Không có đường bypass A** | Không bỏ qua A/rights/trust dù assessor trả PASS |

A không hỏng vì không có paid API. Nó đang thiếu evidence phù hợp với mục tiêu
certification. B phục vụ mục tiêu khác: giúp Agent chuẩn bị học liệu kiểm soát
được, tránh gọi văn bản biên soạn là từ điển đã chứng nhận. C là tùy chọn về sau,
không phải điều kiện để làm task này. Không có real external assessor call (0).

[Policy B V0.1 đề xuất](../Content/editorial-validation-policy-proposal-v0.1.md)
định nghĩa riêng SOURCE_ATTESTED, EDITORIAL_DRAFT, EDITORIAL_VALIDATED,
CORE_VERIFIED và PUBLISHED, cùng các hard abstention conditions. Không sửa current
policy V1.2, authority hoặc meaning của những trạng thái đang có.

## Hai mục hoàn chỉnh để đánh giá

Nghĩa Việt, lời giải thích và câu ví dụ sau do Agent biên soạn; source facts được
trích dẫn riêng. Đây là sense-specific learning cards, không phải full dictionary
definitions. Không có claim “độc lập verified bởi chính Agent”.

### ID34 — 水

| Field | Nội dung |
|---|---|
| Simplified / traditional | 水 / 水 |
| Pinyin / POS | **shuǐ**, danh từ |
| Vietnamese term | **nước** |
| Giải thích nguyên gốc | Nước, chất lỏng thường dùng trong sinh hoạt. |
| Ví dụ nguyên gốc | **这是水。** |
| Pinyin câu | **Zhè shì shuǐ.** |
| Nghĩa câu | **Đây là nước.** |
| Context | Người nói đang nhận diện nước ở dạng lỏng. |
| Không bao gồm | Đất nước, surname Shui, tên sông, mọi chất lỏng, ngũ hành, hoặc claim mọi nước đều uống được |
| Curriculum research | CTI pin ID192, primary level1; không chứng nhận cả bài học HSK |
| Hiện trạng | EDITORIAL_DRAFT; PASS_PROPOSED_B trong development benchmark; chưa core/published |

CEDICT line62308 sense0 là water, phân biệt line62307 surname Shui. COW
cow-w1188/cow-14845743-n hỗ trợ physical-water sense; reading của COW vẫn bắt
nguồn CEDICT. Wikidata L8219-S1 có water sense và P5137 Q283/Q29053744; form
L8219-F1 ghi shuǐ. Q283 có nhãn Việt `nước`, nhưng label không phải định nghĩa đầy
đủ. Chemical concept Q283 không chỉ ở thể lỏng; liquid scope được giới hạn bởi
lexical sense và learner context, không suy mọi H2O luôn là liquid.

### ID104 — 学校

| Field | Nội dung |
|---|---|
| Simplified / traditional | 学校 / 學校 |
| Pinyin / POS | **xuéxiào**, danh từ |
| Vietnamese term | **trường học** |
| Giải thích nguyên gốc | Trường học, nơi tổ chức việc dạy và học. |
| Ví dụ nguyên gốc | **这是学校。** |
| Pinyin câu | **Zhè shì xuéxiào.** |
| Nghĩa câu | **Đây là trường học.** |
| Context | Người nói đang nhận diện một trường học. |
| Không bao gồm | Trường phái tư tưởng, bệnh viện hoặc một tòa nhà bất kỳ |
| Curriculum research | CTI pin ID250, primary level1; không chứng nhận cả bài học HSK |
| Hiện trạng | EDITORIAL_DRAFT; PASS_PROPOSED_B trong development benchmark; chưa core/published |

CEDICT line31776 sense0 là school; classifier sense được giữ tách. COW
cow-w58953/cow-08276720-n là educational institution; không lấy adjective hoặc
gộp tùy tiện với building-only sense. Wikidata L204160-S1 → Q3914, form F1 ghi
xuéxiào, category Q1084 noun. Q3914 có Vietnamese label `trường học` và English
description về cơ sở giáo dục; không lấy riêng label làm một full lexical proof.

[Pilot JSON](../Content/editorial-learning-pilot-2026-10-30.json) chứa đúng hai
existing IDs, không sửa/gộp ID85 cùng chữ 水 hoặc bất kỳ lesson/SRS identity nào.
Hán Việt để null, không sinh audio hoặc optional verified flags.

## Source facts và rights

[Source-facts fixture](../Content/editorial-pilot-source-facts-2026-10-30.json)
ghi entry/sense/form/official IDs, source hashes, revision, selected frame và đầy
đủ COW license. Các nguồn chỉ được đọc cho pilot:

- CC-CEDICT pin 2026-10-28, snapshot714c3e7…: chữ/pinyin, nghĩa Anh và 这 zhè /
  是 shì. CC BY-SA4, ghi công CC-CEDICT contributors/MDBG, chỉ rõ editorial
  adaptations và giữ share-alike cho adaptations liên quan.
- COW1.1 package93e9357…: Chinese definitions/POS theo đúng sense. WordNet-style
  license/notices giữ nguyên. Không count Pinyin như independent family mới;
  per-sense src vẫn chưa được export.
- Wikidata Lexemes revisions L8219=2458938859 và L204160=2498800279 từ audit đã
  commit; structured data CC0. Snapshot item Q283/Q3914 tải cho task này có
  revisions2560755578/2559240952. Field-level lineage chưa đủ current-core proof.
- [Wikibooks grammar](https://en.wikibooks.org/w/index.php?title=Chinese_(Mandarin)/Lesson_1&oldid=4659960),
  revision4659960: pronoun/noun subject + 是 + noun phrase. Source facts, không
  copy example sentences; ví dụ của pilot do Agent soạn. Rights API thực trả
  CC BY-SA4. 这/是 được kiểm tra đọc trong CEDICT, không suy từ text-to-speech.
- [Vietnamese nước](https://vi.wiktionary.org/w/index.php?title=n%C6%B0%E1%BB%9Bc&oldid=2462344)
  và [trường học](https://vi.wiktionary.org/w/index.php?title=tr%C6%B0%E1%BB%9Dng_h%E1%BB%8Dc&oldid=2360175):
  chỉ kiểm tra phạm vi noun sense1. Rights API trả CC BY-SA4; pages ghi upstream
  Hồ Ngọc Đức/FVDP. Không tự clear upstream expression rights, không copy source
  definitions/examples vào học liệu, không count như nguồn bilingual độc lập.

Đã tải thành công 5 responses mới có hash: một query cho hai mục Việt, một
grammar revision, hai rightsinfo, một query hai concept items. Không đi tìm thêm
hàng chục lexical datasets, không scrape nguồn thương mại, không lặp endpoint hỏng.

Original Vietnamese prose của pilot là adaptation được đề xuất chia sẻ CC BY-SA4,
**không phải production rights catalog đã cấp quyền**. Nguồn quyền không rõ hoặc
foreign quotation không được dùng làm expression reuse. Bản source matrix đang
dirty trong working tree được bảo toàn; nghiên cứu dùng bytes đã commit ở486171e.

## Benchmark và giới hạn chất lượng

[Cases](editorial-pilot-benchmark-2026-10-30.json) được đóng băng trước lần kiểm
tra ổn định. Script [evaluate_editorial_pilot.py](../../scripts/evaluate_editorial_pilot.py)
chỉ replay finite source-grounded frames/templates, không gọi provider hoặc ứng
dụng. Nó pin hash fixture, kiểm tra ID/sense/concept/readings và exact surfaces,
abstain mọi case chưa mô hình hóa. Không xuất receipt hoặc đổi authoring state.

| Nhóm | Số ca | Kết quả ổn định |
|---|---:|---|
| Hai positive seeds có nguồn | 2 | PASS_PROPOSED_B: 2 |
| Tone/sense/concept/POS/prose/example/optional/state spoofing | 17 | ABSTAIN: 17 |
| 得, 还, 了, 几, 再见 | 5 | ABSTAIN do ngoài scope; không kết luận chúng là tiếng Trung sai |
| Ví dụ/paraphrase có thể đúng nhưng khác template | 2 | ABSTAIN: 2; false abstention được chấp nhận trong pilot |
| Tổng | **26** | **2 conditional passes +24 abstentions, 0 oracle mismatch** |

Không coi đây là 26 independently adjudicated linguistic tests. Oracle, seed và
template do cùng Agent thiết kế. Exact-match checker có thể replay một gold sai;
nếu đổi cả gold và code, benchmark có thể xanh mà chất lượng không tốt hơn.
**Independent adjudications=0, held-out cases=0.** Không có estimate đáng tin về
false-approval rate ngoài mẫu và không có kiểm chứng learner comprehension.

Vì vậy B **đáng có policy authoring-quality riêng**, nhưng V0.1 chỉ là proposed
closed-scope study. Chưa đủ bằng chứng triển khai general editorial validator,
chưa đổi state thành EDITORIAL_VALIDATED, chưa đưa evaluator vào server/CI publish.
Đây không phải một whitelist giả làm chứng nhận từ điển. Free definitions/examples
được Agent soạn ở bước sau vẫn phải giữ draft khi ngoài approved frame/template.

## Workflow có thể mở rộng, không cần paid API

1. Chọn một existing ID và một sense; bảo toàn lesson/notebook/SRS/exam mappings.
   Lọc risk tier: ordinary noun, reading/context rõ; polyphonic/functional/abstract
   cases chưa có rule thì abstain thay vì ép map.
2. Lấy source facts có version/hash, tách lineage theo từng field. SOURCE_ATTESTED
   chỉ mô tả các facts đã đọc; mirror/shared upstream không tạo thêm vote.
3. Agent viết Vietnamese lesson draft gốc hoặc điền source-grounded semantic frame
   vào templates đã được policy cho phép. Exact bilingual link chỉ dùng khi target
   sense/term thực sự tương ứng; context phải loại các nghĩa khác.
4. Chạy quality checks theo version, development + held-out benchmarks và mutations.
   Unknown/contradiction/unsupported expression → giữ draft, research lại có giới
   hạn; không khóa mọi từ vì một case thiếu evidence.
5. Sau **policy-level adoption**, những artifact đúng scope/hash mới có thể nhận
   editorial-quality marker riêng. Có thể tự động theo rule; không cần một người
   approve từng từ. Mở rộng catalog/template theo release policy có kiểm thử, không
   tự suy rule cũ bao phủ văn bản mới.
6. Chạy A độc lập. Artifact B không được xem như CORE receipt. Với contract hiện
   hành, publication vẫn cần current lexical proof, authorized issuer/catalog,
   actual source rights và DB revision/full digest binding. C có thể là assessor
   tùy chọn, nhưng verdict không override source contradiction hoặc license.
7. Source/rights thay đổi: invalidate/quarantine artifact liên quan và re-evaluate;
   không xóa draft/history hay toàn bộ corpus. Ghi số abstentions và nguyên nhân,
   không dùng test count thay số học liệu thực sự đủ điều kiện.

Điều kiện trước scale B: có held-out source-grounded cases chưa dùng thiết kế,
đánh giá cả unexpected acceptance/abstention và nghĩa Việt, bao gồm lexical sense
đúng nhưng text diễn đạt sai, không chỉ mutations từng ký tự. Independent evidence
có thể đến từ nguồn bilingual/lexical reusable và rule phù hợp; không bắt buộc mua
API key hoặc đặt routine human review làm gate cho từng word.

## Implementation và tests đã thực hiện

Chỉ thêm evaluator nghiên cứu (không phải authoring/publishing workflow), hai draft,
source facts, benchmark và tài liệu. Không thêm dependency, schema, service, API,
approval flag, provider adapter hay receipt contract.

Candidate được chạy trong isolated workspace: tracked pipeline từ486171e + đúng
script/fixtures mới. Không overlay dirty maintainer source hoặc dùng target/dist gốc.

| Kiểm tra | Kết quả |
|---|---|
| `python scripts/evaluate_editorial_pilot.py --output <new-private-json>` | exit0;26 cases,2 proposed passes,24 abstentions,0 mismatch |
| 6 CLI safety negatives | expected nonzero cho tampered fixture, duplicate JSON key, NaN, duplicate case IDs, oracle mismatch, overwrite result; 6/6 đúng |
| Existing engine/unblock/core_projection/pending_research unit regressions | **87/87 pass**,0 failure/error/skip |
| Source/fixture integrity, JSON, baseline hashes, `git diff --check` | kiểm tra trước commit; chi tiết trong results JSON |
| Java/PostgreSQL/frontend/lint/build | **Không chạy lại**: không sửa runtime, DB, frontend hoặc release packaging |

Lệnh regression thực tế:

```text
python -m unittest scripts.vocabulary_pipeline.test_engine scripts.vocabulary_pipeline.test_unblock scripts.vocabulary_pipeline.test_core_projection scripts.vocabulary_pipeline.test_pending_research -v
```

Trong development, một lần đổi context sang liquid-water chưa đồng bộ draft đã
cho 1 mismatch; đã sửa context của artifact, giữ nguyên assertion hẹp, rồi chạy
lại final isolated benchmark. Không bỏ assertions, skip case hoặc nới scope.
Các CLI negatives có exit nonzero là expected rejection, không tính thành fail của
benchmark cuối. Không dùng mock/synthetic fixture để nói có real assessor call.

Để tái lập từ repo ở bất kỳ thư mục nào:

```powershell
$env:PYTHONDONTWRITEBYTECODE='1'
python D:\GitHub\heyganba\scripts\evaluate_editorial_pilot.py
```

`--output` chỉ ghi file nghiên cứu mới và từ chối overwrite. Hash source-facts
fixture được pin trong script; muốn thay facts phải re-audit và cập nhật benchmark
tường minh. Nó không chống được người có quyền sửa cả repository; không phải
cryptographic trust boundary. Output luôn báo CORE_VERIFIED=0, PUBLISHED=0,
stateTransitions=0 và policyAdopted=false, kể cả hai proposed passes.

## Quyết định còn lại và Git integrity

Operator cần quyết định policy-level về phạm vi/nhãn B, evaluation criterion,
grammar/frame catalog và cách rà soát trước adoption. Không hỏi duyệt hai mục
riêng lẻ. Nếu muốn hiển thị cho learner nội dung B chưa CORE, cần một product/
security decision và publication contract riêng; task này **không triển khai**
đường đó. Không tự cấp issuer, quyền source hoặc trusted receipt.

Publication hiện chưa đủ: current CORE evidence còn thiếu, production rights
catalog/signing trust chưa được cấp, policy B chưa adopt, independent/held-out
quality evaluation chưa có. Không tuyên bố paid AI API là dependency bắt buộc.

Baseline đã backup HEAD/status/diff/index và **1018 file hashes**, gồm bản matrix
dirty của maintainer. Tất cả file có trước phải giữ nguyên byte. Chỉ thêm bảy file
của task; exact paths/hashes trong [results JSON](editorial-pilot-results-2026-10-30.json).
Không stage thay đổi khác, không mutate DB local/production, không sửa Flyway
checksum, không push/merge/deploy. Spring advisory exception giữ nguyên; không có
CVE scan mới. Local commit hash tra bằng:
`git log -1 --format=%H -- docs/QA/editorial-learning-strategy-2026-10-30.md`.
