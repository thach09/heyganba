# Editorial quality / HSK1 authoring transfer study — 2026-10-30

**Đã chuẩn bị 10 draft HSK1 mới cho các ID hiện có. Chưa có mục nào được nâng
validation/certification/publication status.** Frozen B V0.1 vẫn chỉ là replay của
hai seed; bộ mới không vượt gate mở rộng. Không sửa evaluator để làm xanh kết quả.

Baseline branch `feat/v2.1-ux-and-stability`, HEAD
`7f6e7fbe89a4cfb57ca369b10df0acd09a90f658`. Giữ nguyên lexical verification,
publication authority, Flyway checksums và toàn bộ dirty work có trước.

## 1. Freeze và ground truth

[Freeze manifest](editorial-v01-freeze-2026-10-30.json) lưu SHA-256 và Git blob
của evaluator, hai draft 水/学校, source fixture, benchmark26 và policy proposal.
Không thay bất cứ file nào trong nhóm này. Hai seed không chứng minh một semantic
validator tổng quát. Không dùng chúng làm positive examples của bộ mới.

Có khác biệt line endings đáng ghi nhận: pin trong code là **bytes CRLF gốc**
`ce34c1d7…aa67b1`, còn facts file trong Git LF có SHA `77b043d6…3cc2a`.
Một preflight dùng bản LF đã bị từ chối trước khi đánh giá case. Sau đó chạy
frozen evaluator với `--facts` trỏ đến private copy được khôi phục đúng bytes CRLF
và kiểm tra đúng pin cũ. Không đổi code, gate, oracle hoặc file gốc để vượt check.
Manifest có cả worktree/committed hashes; đây là hạn chế reproducibility của bản
nghiên cứu, cần giải quyết bằng contract serialization tường minh ở version sau.

[Bộ mới](editorial-untuned-transfer-set-2026-10-30.json) có **36 new-word inputs**
trên 10 IDs khác hoàn toàn 34/104. Năm từ 得/还/了/几/再见 đã được dùng trong
development cũ được công khai ở `reusedAmbiguousControlsNotHeldOut`, không đếm vào
36 hoặc gọi là unseen. Bộ26 gốc đã chứa các ca abstain đó.

Nguồn facts của reference khác implementation: CC-CEDICT và COW là datasets
publisher đã có trước evaluator; selected entry/sense/Pinyin không lấy từ gold
table của evaluator. Word selection/labels được ghi trước lần chạy bộ mới, source
và case hashes không đổi sau khi biết kết quả. **Tuy nhiên đây không phải blind
held-out hoặc independently validated ground truth**:

- Cùng Agent đã đọc implementation, viết Vietnamese prose/examples và gán
  acceptability labels; không có independent language adjudicator.
- Grammar template là cái đã dùng trong pilot, không phải held-out construction.
- External spelling/Pinyin/sense facts có thể đối chiếu trực tiếp; không vì vậy
  mà toàn bộ Vietnamese/example outcome trở thành independently adjudicated.
- CC-CEDICT/COW có shared reading upstream; unknown per-sense origin được giữ,
  không gọi hai datasets là hai independent lexical votes.
- Đây là Agent-recorded pre-run freeze, không phải signed independent preregistration.

Không thiết lập được ground truth đủ độc lập cho đánh giá ngữ nghĩa/naturalness
tổng quát trong lượt này. Không tạo credentials, không dùng cùng Agent như một
independent assessor, không hỏi người dùng duyệt từng từ. Vẫn hoàn thành drafts
an toàn như task yêu cầu.

## 2. Mười draft thực tế

[Artifact đầy đủ](../Content/hsk1-editorial-drafts-10-2026-10-30.json) chứa chữ
giản/phồn, Pinyin, original definition, original example/Pinyin/translation,
context, source/sense IDs, license, lineage, limitations và status riêng từng mục.

| ID | Từ / phồn thể | Pinyin | Giải thích Việt nguyên gốc | Ví dụ / nghĩa Việt |
|---|---|---|---|---|
| 38 | 书 / 書 | shū | Vật gồm các trang được đóng lại, dùng để đọc. | 这是书。Zhè shì shū. — Đây là một quyển sách. |
| 135 | 猫 / 貓 | māo | Trong bài này là con mèo được nuôi trong nhà. | 这是猫。Zhè shì māo. — Đây là một con mèo. |
| 227 | 狗 / 狗 | gǒu | Chó, con vật nuôi thường gặp trong gia đình. | 这是狗。Zhè shì gǒu. — Đây là một con chó. |
| 27 | 茶 / 茶 | chá | Đồ uống được pha từ lá trà. | 这是茶。Zhè shì chá. — Đây là trà. |
| 35 | 苹果 / 蘋果 | píngguǒ | Quả táo, một loại trái cây dùng làm thức ăn. | 这是苹果。Zhè shì píngguǒ. — Đây là một quả táo. |
| 121 | 杯子 / 杯子 | bēizi | Cốc hoặc ly dùng để đựng đồ uống. | 这是杯子。Zhè shì bēizi. — Đây là một cái cốc. |
| 29 | 米饭 / 米飯 | mǐfàn | Món ăn từ gạo đã được nấu chín. | 这是米饭。Zhè shì mǐfàn. — Đây là cơm. |
| 120 | 电脑 / 電腦 | diànnǎo | Thiết bị dùng để tính toán và xử lý thông tin. | 这是电脑。Zhè shì diànnǎo. — Đây là một chiếc máy tính. |
| 136 | 衣服 / 衣服 | yīfu | Đồ dùng để mặc trên người. | 这是衣服。Zhè shì yīfu. — Đây là quần áo. |
| 23 | 爸爸 / 爸爸 | bàba | Cách gọi thân mật dành cho bố. | 这是爸爸。Zhè shì bàba. — Đây là bố. |

Mỗi câu là bài nhận diện trong context đã ghi, không phải một assertion về ảnh
thật. Các noun phrases như “một quyển/con/quả/cái/chiếc” là rendering Việt, không
khẳng định câu Trung đã dùng classifier. Prerequisites là 这 zhè / 是 shì và noun
predicate; không thêm Chinese classifier, aspect, negation hay sandhi rule mới.

Phân biệt các traps: sách vật lý với thư/động từ viết/abbreviation Shu; mèo với
modem/máo; trà uống với cây trà; quả táo với công ty Apple; cơm chín với gạo sống.
COW sense về cat bao gồm cả domestic/wild cats nên lesson chỉ chọn pet context,
không tuyên bố mọi loài mèo đều được thuần hóa. Không thêm health/safety claims.
Hán Việt để null, không audio hoặc optional verified flags.

Tất cả 10 là existing IDs với internal level1 và có exact word/reading match ở
primary HSK1 của **CTI pin published2025-11/effective2026-07**, không khẳng định
latest edition. Official IDs lần lượt190/119/64/17/159/9/125/36/255/3. Không nhập
official mappings vào DB hoặc tuyên bố HSK1 course đầy đủ. Không gộp IDs tái sử
dụng cùng từ, không đổi notebook/SRS/lesson/exam history hay nghĩa đang có của ID29.

## 3. Source checks và quyền sử dụng

Đã dùng đúng các snapshot đã pin, kiểm tra lại bytes/hash và selected entries,
không tiến hành một vòng broad source audit mới:

- [CC-CEDICT primary](https://www.mdbg.net/chinese/dictionary?page=cc-cedict):
  snapshot2026-10-28 SHA714c3e7… dùng để đối chiếu 10 cặp simplified/traditional,
  Pinyin và selected gloss; không gọi snapshot này là latest. CC BY-SA4,
  attribution CC-CEDICT contributors/MDBG, ghi adaptations và giữ share-alike.
- [COW1.1](https://github.com/bond-lab/cow/releases/tag/v1.1): package SHA93e9357…,
  XML đọc được đối chiếu lại với member trong package. Selected noun/synset và
  reading khớp 10/10; complete WordNet-style copyright/license notice nằm trong
  artifact. Reading vẫn từ CEDICT, per-sense source không được export; LLM-reviewed
  rescue nếu có được ghi riêng, không nâng thành độc lập.
- Syllabus PDF pin SHAec74ce0… đã kiểm tra lại và dùng đúng official ID, version,
  page/Pinyin; không đưa full protected reference vào Git.
- Grammar từ Wikibooks Lesson1 rev4659960, snapshot32f7a15… đã có trong pilot:
  S + 是 + noun. Chỉ reuse grammar fact với attribution/CC BY-SA4; không copy
  source example sentences. Sentence wording của batch do Agent soạn.

Kiểm tra facts cho **10/10** draft khớp forms/Pinyin với CEDICT, noun/reading
observations với COW, official pinned word/reading và template construction.
Các số này không phải 10 semantic/naturalness validations. Không có independent
Vietnamese/example adjudication (0). Nghĩa Việt là editorial adaptations,
không phải bản dịch Việt lấy sẵn từ COW/CEDICT. Rights source, editorial license
proposal và quyền production release giữ tách biệt.

## 4. Kết quả actual evaluation

Frozen26: **exit0**,2 proposed passes +24 abstentions,0 oracle mismatch. Hai
seed vẫn chỉ là development controls. Không nâng chúng thành bằng chứng tổng quát.

Bộ mới: **exit1 — gate mở rộng KHÔNG ĐẠT**,0 accepted,36 abstained,10 oracle
mismatches đối với prospective labels. Không sửa labels, facts, input cases,
evaluator hoặc policy sau lần chạy để đổi kết quả này.

| So với provisional prospective reference | Số ca |
|---|---:|
| Correct acceptance | 0 |
| False acceptance | 0 |
| Correct abstention | 26 |
| False abstention (positive drafts) | 10 |

Đây là conditional counts theo labels của Agent, **không phải independent quality
metrics**. Precision không xác định vì accepted=0. Theo contract cũ, việc abstain
10 new positives vẫn đúng scope guard; đó không phải regression của V0.1. Nhưng
nó cho thấy chưa có reusable validator để tiếp nhận học liệu mới.

| Nhóm trong bộ mới | Ca | Accepted / abstained |
|---|---:|---|
| Source-grounded positive drafts, chưa independent adjudication | 10 | 0 /10 |
| Incorrect Pinyin/tones | 5 | 0 /5 |
| Incorrect Vietnamese translations | 4 | 0 /4 |
| Wrong concept links | 3 | 0 /3 |
| Incorrect examples/Pinyin/translations | 4 | 0 /4 |
| Incompatible/revoked rights scenarios | 3 | 0 /3 |
| Polyphonic/homograph/sense traps | 5 | 0 /5 |
| Missing source/binding cases requiring abstention | 2 | 0 /2 |

**Tất cả36 có cùng reason `OUTSIDE_TWO_NOUN_PILOT_NOT_A_LINGUISTIC_ERROR`.**
Không được nói evaluator đã phát hiện 5 tone errors,4 translation errors hoặc3
license failures: nó chưa đến những check đó. Năm reference tone errors được đối
chiếu riêng với external CEDICT và3 concept bindings khác selected external
synsets; điều này kiểm tra reference facts, không chứng minh evaluator phân biệt
được chúng. Các full Vietnamese/example outcomes vẫn là Agent annotations.

Ba licensing cases là giả định rõ về NC + intended commercial use, academic-only
grant + public distribution, và grant revoked; không tuyên bố publisher thật đổi
license. Frozen evaluator không có dynamic rights input, nên không đo được năng
lực kiểm tra những tình huống này. Chặn bởi ID không thay licensing validation.

## 5. Scope recommendation và learner availability

Chưa có evidence để mở rộng EDITORIAL_VALIDATED ra 10 từ mới hoặc free text.
Giữ B0.1 là two-seed research replay, chỉ dùng authoring workflow để tạo draft
có nguồn và context. Không append gold whitelist rồi báo những case này là held-out.
Nếu dùng chúng để tune về sau, phải chuyển sang development và lấy bộ khác.

[Adoption/route contract proposal](../Content/editorial-learner-route-proposal-v0.1.md)
ghi cụ thể product-level authorization, separate state/content type, rights,
policy scope, digest/revision, audit, revocation và safe rejection. Optional GET
`/api/v1/editorial-lessons` cùng detail route **chỉ là đề xuất**, không endpoint,
schema/migration hoặc release control nào được implement/activate.

Muốn mở cho learner: trước hết cần đủ ground-truth/evaluation phù hợp scope, rồi
quyết định product/security cấp policy; kế tiếp mới thiết kế riêng release trust
và rehearsal source/rights/withdrawal/auth/digest. Không đưa B drafts vào các
existing lexical APIs hoặc giả CORE proof. Không yêu cầu routine human approval
từng từ hoặc paid API; thiếu independent expected outcomes vẫn phải abstain.

Counts: **10 new drafts**, cộng2 seed cũ thành12 research drafts; **0 newly
EDITORIAL_VALIDATED,0 CORE_VERIFIED,0 PUBLISHED,0 new vocabulary rows,0 DB writes,
0 trusted production receipts**. Không thay coverage của corpus/production.

## 6. Tests, reproduction và workspace

- Original26: exit0 khi dùng đúng historical raw fixture pin; raw-LF preflight
  rejected trước khi đánh giá cases, được ghi nhận riêng.
- Separate36: **exit1,10 mismatches**; không ghi PASS cho gate này.
- Existing engine/unblock/core_projection/pending_research regressions:
  **87/87 pass**,0 failures/errors/skips, isolated tracked-source workspace.
- Draft/source integrity checks10/10, JSON/set disjointness, frozen/pre-run and
  post-run hashes kiểm tra. Đây không phải independent semantic certification.
- `git diff --check` và cached scope kiểm tra trước commit. Không chạy lại Java,
  PostgreSQL/frontend/lint/build vì không sửa runtime/code/config/DB; không dùng
  test results cũ để báo PASS trong lượt này. Không start cluster/service.

Ví dụ tái lập từ root repo, giữ mọi file gốc và tạo scratch directory mới:

```powershell
$editorialEvalDir = Join-Path ([IO.Path]::GetTempPath()) ('jiayou-replay-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $editorialEvalDir | Out-Null
@'
import sys, pathlib, hashlib
raw = pathlib.Path(sys.argv[1]).read_bytes().replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')
assert hashlib.sha256(raw).hexdigest() == 'ce34c1d7e6c1680dc755092b187c58082c223c26ecd15ebc8df781bba7aa67b1'
pathlib.Path(sys.argv[2]).write_bytes(raw)
'@ | python - docs/Content/editorial-pilot-source-facts-2026-10-30.json "$editorialEvalDir/facts-original-crlf.json"
python scripts/evaluate_editorial_pilot.py --facts "$editorialEvalDir/facts-original-crlf.json" --output "$editorialEvalDir/original26.json"
python scripts/evaluate_editorial_pilot.py --facts "$editorialEvalDir/facts-original-crlf.json" --benchmark docs/QA/editorial-untuned-transfer-set-2026-10-30.json --output "$editorialEvalDir/new36.json"
# Expected last exit code: 1; 10 prospective oracle mismatches. Do not relabel to force green.
```

Raw Windows-run SHA và Git LF serialization SHA có trong freeze manifest. Không
thay newline/hash gate của frozen evaluator. Private primary-source snapshots,
baseline backup, run logs và scripts nằm tại
`C:\Users\LENOVO\AppData\Local\Temp\jiayou-hsk1-transfer-6w9tg9tq` cùng các prior
private evidence roots đã ghi. Source headers/version/hash, không mutable URL
hoặc self-asserted license flag, là cơ sở tái lập.

Baseline có **1025 physical file hashes**, kể cả dirty matrix của maintainer;
mọi file có trước giữ nguyên. Chỉ thêm sáu files của task: freeze manifest,
10-draft artifact,36-case set, results JSON, báo cáo này và route proposal.
Không thêm application/infrastructure code hoặc dependency. Exact paths/hash
delta, counts và exits: [results JSON](editorial-hsk1-transfer-results-2026-10-30.json).
Spring advisory exception giữ nguyên, không scan mới hoặc tuyên bố sạch CVE.
Không stage file khác, không push/merge/deploy. Local commit hash tra bằng
`git log -1 --format=%H -- docs/QA/editorial-hsk1-transfer-2026-10-30.md`.
