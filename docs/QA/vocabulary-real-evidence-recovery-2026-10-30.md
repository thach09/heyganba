# Real vocabulary evidence recovery — 2026-10-30

**Không mở rộng batch, không đổi publication authority.** Đã kiểm tra nguồn thật
cho 30 từ hiện có. Wikidata và COW cung cấp thêm quan sát hữu ích, nhưng chưa đủ
để xác minh nghĩa Việt và lineage của những trường core. **Current-policy PASS:
0/30; counterfactual chỉ nới POS: 0/30.** Không dùng hai số này lẫn với nhau.

Baseline `b12dcc4d12a060e2d6b1d6167c0e899ab7bd5af2`, branch
`feat/v2.1-ux-and-stability`. Đã đọc policy V1.2, registry, engine, publication
authority và evidence phiên trước. Không sửa code runtime, migration, trust,
pipeline, CI hoặc dữ liệu ứng dụng. Không gọi assessor ngoài, không dùng mock như
nghĩa Việt đã được kiểm chứng, không yêu cầu API key hay duyệt tay từng từ.

[Ma trận đầy đủ 30 từ](../Content/vocabulary-real-evidence-matrix-2026-10-30.json)
ghi từng ID, chữ, cách đọc, nghĩa/POS đang dạy, các ID tái sử dụng, field results
hiện hành, COW entry/sense/definition, Wikidata form/sense/revision và giới hạn.
[Validation và hash delta](vocabulary-real-evidence-recovery-2026-10-30.json).

## Kết quả trước/sau

| Phạm vi | Trước | Sau |
|---|---|---|
| Hàng đợi hiện có | 610 | 610, không thêm candidate |
| NEEDS_RESEARCH / CONFLICT toàn hàng đợi | 608 / 2 | 608 / 2, giữ nguyên |
| CORE_VERIFIED / FULLY_VERIFIED toàn hàng đợi | 0 / 0 | 0 / 0 |
| Mẫu 30 từ: NEEDS_RESEARCH / CONFLICT | 29 / 1 | không nâng trạng thái |
| Mẫu đạt current policy sau kiểm tra evidence | 0 | **0** |
| Mẫu đạt nếu chỉ nới hai-family POS | chưa đánh giá | **0 hypothetical** |
| Dòng thêm / correction áp dụng / receipt / DB write | — | **0 / 0 / 0 / 0** |

Đây là **eligibility audit** của các bằng chứng mới, không phải kết quả chạy một
adapter Wikidata/COW chưa tồn tại. Baseline field results trong matrix là engine
results của candidate không đổi từ phiên trước. Không báo đã chạy lại toàn bộ
610 qua nguồn mới. Không mở database local/production ở lượt này; ID, progress,
notebook, SRS, exam và draft giữ nguyên.

## Wikidata Lexemes: có dữ liệu thật, chưa có semantic PASS

[Official licensing](https://www.wikidata.org/wiki/Wikidata:Licensing) nêu dữ liệu
cấu trúc, gồm Lexeme, là CC0; văn bản documentation khác namespace có terms khác.
[Lexicographical model](https://www.wikidata.org/wiki/Wikidata:Lexicographical_data/Documentation)
tách lemma, lexical category, form và sense. Header từ loại là bắt buộc khi tạo
Lexeme, nên một header có thể tồn tại dù chưa có pronunciation hoặc nghĩa.

Đã đọc JSON thật của **92 entities**, loại ngôn ngữ khác và related-word hits;
còn **89 exact Mandarin lexemes** thuộc **24/30 từ**. Phạm vi ngôn ngữ kiểm tra
là Q727694/Q9192, không suy Mandarin từ chữ Hán hoặc search locale `zh`.

- **20/30** có P1721 (Pinyin) khớp cách đọc đang dạy.
- **18/30** có ít nhất một sense; đây là coverage, chưa phải tất cả sense đều
  đúng với nghĩa đang dạy.
- **0** gloss tiếng Việt trong các Lexeme khớp mẫu. Không biến English gloss
  hoặc nội dung do Agent dịch thành nguồn Việt độc lập.
- Matching P1721 assertions không có references. Lexical-category header không
  tự chứa nguồn gốc cho POS; reference của một claim khác không chứng minh POS,
  reading hoặc gloss. Ghi `UNREFERENCED_ASSERTIONS_NOT_PROVEN_INDEPENDENT`, không
  khẳng định tất cả Wikidata được sao chép từ Wiktionary/CEDICT.
- L496015 `你好` là noun header không có form/sense. Không dùng stub này để đổi
  lời chào thành danh từ. `听`, `得`, `要` có stub thiếu cách đọc/sense tương ứng;
  `会` có Pinyin nhưng chưa có sense trong verb entry tìm được.
- `还` có L669615 (verb, huán) và L669618 (adverb, hái); `长` có cháng/zhǎng/
  zhàng trên các entry khác. Không ghép form của một reading với sense của entry
  khác. Một Lexeme nhiều form/sense cũng chưa tự xác lập mọi cặp form–sense.
- Related hit L784183 là `吃苦`, không phải `吃`. Nó có reference đến CC-CEDICT
  và trích trainchinese; đã loại khỏi mẫu. Không sao chép quotations/proprietary
  expressions và không dùng reference đó như nguồn độc lập cho `吃`.

Mỗi retained entry có lastRevision, modified, revision URL, batch snapshot SHA và
canonical entity SHA trong matrix. CC0 cho quyền dùng structured data không làm
references biến thành independent attestation. Wikidata và Wiktionary không bị
gộp chỉ vì cùng Wikimedia, cũng không được mặc định độc lập nếu upstream chưa rõ.

Discovery có giới hạn: 30 simplified spellings, thêm các traditional/no-result
checks và hai variant/rank checks; limit 10, riêng `學生`/`看` limit 50. Các từ
không tìm được trong phạm vi này **không được tuyên bố không tồn tại toàn Wikidata**.
Mẫu được chọn có chủ đích để có danh từ, động từ, lời chào, hư từ và các từ đa âm;
24/30 không phải ước lượng coverage của toàn bộ 610 ứng viên. Có 38 Action API
responses thành công và 1 lỗi 429, tách khỏi hai lần Query Service thất bại.
SPARQL ban đầu timeout; query dùng lemma index sau đó gặp outage/429. Action API
dừng ở 429 sau 10 từ, chờ ít nhất 5 phút rồi resume cách nhau 6 giây. Không đổi
identity/proxy, không tiếp tục lặp Query Service hỏng. Các lỗi vẫn nằm trong locks.

## Chinese Open Wordnet: phân biệt bản cũ, curated data và reading upstream

[Bản COW 1.1](https://github.com/bond-lab/cow/releases/tag/v1.1), xuất bản
2026-10-24, đã được tải và kiểm tra thực tế; không chỉ đọc README của bản 0.9.
Package 2.902.528 bytes có SHA-256 khớp digest do release API công bố:
`93e9357dda50a38ce626904c2229479afa177df74d9c504aebfeba06ff2f241e`.
Đọc được 82.660 lexical entries, 46.189 synsets, 105.175 senses trong XML. Mẫu
**30/30 có spelling**, **26/30 có reading khớp**.

[License đầy đủ đi kèm](../Content/source-notices/cow-1.1-LICENSE.txt) là
WordNet-style permissive: được dùng/sửa/phân phối, phải giữ notices/disclaimer,
không tự gọi là CC BY. Citation: Shan Wang and Francis Bond (2013), *Building the
Chinese Open Wordnet (COW): Starting from Core Synsets*. Source publisher là
bond-lab; metadata/hash/URL của package, license, build và corrections được giữ.
Notice text giữ đầy đủ nội dung; chỉ bỏ trailing spaces trên bốn dòng trống để
đạt Git whitespace check. Raw LICENSE nguyên byte vẫn giữ trong private objects
và `cowCompleteLicense` của matrix; không thay source hash hoặc điều khoản.

Kết luận field-specific:

| Field | Nội dung đọc được | Eligibility/giới hạn |
|---|---|---|
| Simplified lemma | 30/30 | Exact spelling observation, không tự xác minh nghĩa |
| Traditional | Không có cặp traditional tương ứng như CEDICT | Không cấp bằng chứng mới |
| Pinyin | 26/30 khớp | **Nguồn CC-CEDICT**, không phải family đọc thứ hai |
| POS | Code n/v/a/r/x và các entry khác nhau | WordNet `x` không phải explicit interjection; phải giữ sense và taxonomy |
| Sense/definition | Chinese/English definitions, synset/ILI | Có ích, nhưng entry-level origin chưa xuất đủ; definition có thể vắng |
| Vietnamese | Không có | Không xác minh bản dịch Việt |
| Example | Có ở một số synset | Không nhập, không tự nâng optional capability |

[NTU-MC export 2026.10](https://github.com/bond-lab/NTUMC/releases/tag/wn-2026.10)
cũng được tải; compressed SHA
`96f44f36aabdfb669bbea0f66f921010b4c3e9dde7ac81e3bb179c870099a317`
khớp release metadata. Đã đọc code `getwn.py`, `addpinyin.py` ở tag, cùng
`build_cow.py`/corrections ở tag v1.1; không thực thi upstream scripts.

- Bản cũ hợp nhất SEW và Wiktionary. Bản mới có curated NTU-MC data và bỏ sense
  chỉ đến từ bow/sew/wikt; **không hợp lý khi gọi toàn bộ COW mới là Wiki mirror**.
- Tuy nhiên `filter_senses()` giữ cả sense không có source tag. XML export và
  release COW không giữ trường `src` nguyên gốc. Không thể suy “không bị filter”
  thành “đã chứng minh independent”.
- COW 1.1 thêm lại một số sense từ các automatic sources sau LLM review. Ví dụ
  `手表` / cow-04607869-n, đúng nghĩa wristwatch, có correction action `add`,
  source `rescue: 2 blind opus`. Model review không tự tạo một lineage mới.
- `addpinyin.py` lấy CEDICT; dù POS/Chinese definition có thể có origin riêng,
  reading vẫn cùng family cedict. Không đếm cả package thành một family duy nhất
  độc lập cho mọi field.

Các counterexample trực tiếp:

| Dữ liệu đang dạy | COW trả về | Quyết định |
|---|---|---|
| 还 huán, trả lại | verb return-object nhưng `hai2` | Không dùng để sửa huán thành hái |
| 几 jǐ, hỏi số lượng | quantity adjective nhưng `ji1` | Không dùng làm evidence đúng reading/POS |
| 得 de, trợ từ kết cấu | verb `de2` | Không ghép nghĩa de-particle vào verb |
| 了 le, trợ từ | verb/adverb `liao3` | Không chấp nhận làm support cho le |
| 你好/再见, lời chào | entries `n` và `x` | Không tự map `x → interjection` hoặc chọn noun mặc định |
| 很 hěn, rất | adverb/reading, local Chinese definition vắng | Không giả đã đọc definition từ base WordNet |

Đây là nguồn không phù hợp với những trường đang dạy, **không phải các lỗi Pinyin
mới của Jiayou đã được chứng minh**. Giữ nguyên records. Các đề xuất ID49/204 và
POS IDs6/42 vẫn pending/conflict; không đếm lại correction ID173 phiên trước.

## Nguồn Việt bổ sung và concept bridge

[VLSP](https://vlsp.org.vn/index.php/node/146) xác định dự án Vietnamese WordNet,
nhưng trang không cung cấp export/license tái sử dụng cho ứng dụng.
[Toolkit của tác giả](https://github.com/hienvuhuy/NLP-Toolkits-Corpus) yêu cầu
permission cho full data. Không lấy academic citation hoặc source-code license
thay grant dataset.

[UKC Vietnamese 1.0](https://datascientiafoundation.github.io/LiveLanguage/datasets/vie-ukc-lexicon-/)
liệt kê NC-SA, revision 2023-03-28 và mixed provenance gồm Wiktionary, CogNet,
WordNet; 3.437 words theo metadata, **chưa đo coverage bằng export**. Không nhập
restricted data hoặc gọi nó là nguồn Việt độc lập đủ điều kiện. CFDICT vẫn dựa
trên CEDICT; hạn chế CVDICT/MOE/NAER/CWN đã ghi không được giải quyết bằng cách
lặp endpoint hỏng. Không tải lại những export đã biết thiếu rights.

Đã kiểm tra thêm item labels qua P5137: Q283 có Vietnamese `nước`, Q3914
`trường học`, Q5 `người`, Q37226 `giáo viên` với aliases thầy/cô giáo, còn Q89 là
`táo tây`. Đây là **Vietnamese concept-label observations có thật**, tách biệt
với “0 Vietnamese Lexeme gloss”. Chúng không phải hai independent dictionary
definitions; không tự bao quát compound gloss hoặc mọi sense. Không lấy label
này để tự chứng nhận bản dịch do Agent biên soạn.

## Ma trận ngắn cho người review

`khớp*`: reading COW khớp nhưng vẫn có upstream CEDICT. WD là exact Mandarin
Lexeme tìm được; `có` chỉ nói matching P1721 hiện diện, **không nói VERIFIED**.
Số entry/meaning/POS, definition nguyên văn có license và mọi unsupported field
được ghi chi tiết trong JSON; không thu gọn các sense mâu thuẫn thành một vote.

| ID / từ | Reading đang dạy | Reading COW | WD Lexeme IDs | WD reading | Nghĩa Việt |
|---|---|---|---|---|---|
| 1 你好 | nǐ hǎo | khớp* | L496015 | thiếu | draft |
| 6 再见 | zàijiàn | khớp* | không tìm thấy | thiếu | draft |
| 35 苹果 | píngguǒ | khớp* | L986497 | có | draft |
| 34 水 | shuǐ | khớp* | L646252, L646253, L8219 | có | draft |
| 104 学校 | xuéxiào | khớp* | L204160 | có | draft |
| 10 学生 | xuésheng | khớp* | không tìm thấy | thiếu | draft |
| 9 老师 | lǎoshī | khớp* | L312716 | có | draft |
| 19 人 | rén | khớp* | L7971 | có | draft |
| 173 手表 | shǒubiǎo | khớp* | không tìm thấy | thiếu | draft |
| 28 吃 | chī | khớp* | L312662 | có | draft |
| 26 喝 | hē | khớp* | L312669 | có | draft |
| 113 看 | kàn | khớp* | không tìm thấy | thiếu | draft |
| 112 听 | tīng | khớp* | L666483, L666484 | thiếu | draft |
| 94 去 | qù | khớp* | L312722, L666608, L666609, L666610 | có | draft |
| 93 来 | lái | khớp* | L665752, L665753, L665754, L665755 | có | draft |
| 46 是 | shì | khớp* | L642300, L642302, L642304, L642305, L642306, L642307, L642308, L7979 | có | draft |
| 37 有 | yǒu | khớp* | L1412929, L651878, L651879, L651880, L651881, L651882, L651883, L7968 | có | draft |
| 536 不 | bù | khớp* | L1413177, L1413182, L649449, L649450, L649451, L7969 | có | draft |
| 18 很 | hěn | khớp* | L1451956, L1451957, L1451958, L7974 | có | draft |
| 7 好 | hǎo | khớp* | L643813, L643814, L643815, L643816, L7977 | có | draft |
| 480 长 | cháng | khớp* | L1412268, L1412272, L1412273, L1412274, L1412275, L656255, L656256, L656257, L656258 | có | draft |
| 251 还 | huán | **khác** | L669615, L669616, L669617, L669618, L669619 | có | draft |
| 49 几 | jǐ | **khác** | L651262, L651330, L651331, L651332, L651336 | có | draft |
| 204 得 | de | **khác** | L666397, L666398, L666399, L666400 | thiếu | draft |
| 406 会 | huì | khớp* | L312670, L667475, L667476, L667477 | có | draft |
| 421 要 | yào | khớp* | L665045, L665046, L665047, L665048, L665049 | thiếu | draft |
| 184 便宜 | piányi | khớp* | không tìm thấy | thiếu | draft |
| 149 睡觉 | shuìjiào | khớp* | không tìm thấy | thiếu | draft |
| 214 快乐 | kuàilè | khớp* | L648298, L648299 | có | draft |
| 425 了 | le | **khác** | L1320261, L1320263, L1320265, L7970 | có | draft |

## Policy hiện hành và phương án đối chiếu

V1.2 yêu cầu evidence đúng sense và hai independent families; semantic agreement
có thể đạt bằng hai Vietnamese lexical definitions đúng taught text. **Không
bắt buộc external AI assessor cho mọi trường hợp.** Với mẫu này, không có cặp
định nghĩa như vậy. Hai-source POS không phải blocker duy nhất; parser mới không
tạo được evidence còn thiếu.

Trong mẫu, field results hiện hành xác minh traditional cho **30/30** từ bằng
source trực tiếp; word/reading/meaning/POS đều chưa VERIFIED. Các matching spelling,
Pinyin và POS mới được ghi như observations đúng scope, không tự nâng thành kết
quả engine. Như vậy có field đã đạt thật, nhưng chưa có bốn trường core đồng thời
đủ điều kiện. Quyền reuse nguồn không thay thế ngưỡng bằng chứng này.

Có bằng chứng taxonomy khác nhau: COW `x`, Wikidata noun stub cho greeting,
Wikidata numeral cho `几` so với interrogative-pronoun label nội bộ. Chưa có
benchmark chứng minh nên giảm ngưỡng hai-source nói chung. Giải pháp trước mắt là
giữ scope/taxonomy và phát hiện sai sense, không thay “2” bằng “1”.

Counterfactual được version riêng trong matrix:
`POS_SINGLE_SOURCE_COUNTERFACTUAL_V0_NOT_AN_APPROVED_POLICY`. Chỉ giả sử bỏ
điều kiện hai-family POS, giữ nguyên word/reading/meaning, conflict và rights/trust.
**0/30 có thể đạt ngay** vì các core gate còn lại vẫn thiếu. Đây là phép phân
tích giả định, không phải policy release hoặc production PASS.

Không triển khai V1.3/adapter để tạo thêm green tests. Chưa có positive sample
đủ semantic evidence để đánh giá false-approval rate của một policy thay thế.
Nếu sau này nghiên cứu field-specific alternative, tối thiểu phải giữ:

1. Exact language/lemma/reading/sense; không dùng related hit, surname hoặc raw
   code `x` thay explicit POS. Functional labels cho lời chào cần một taxonomy
   được định nghĩa và evidence đúng usage.
2. Field-level lineage: reading từ CEDICT vẫn cùng family; không dùng model
   rescue, source không ghi rõ hoặc declaration JSON để chứng minh độc lập.
3. Vietnamese lexical attestation hoặc bilingual sense link có quyền reuse,
   không phải chỉ concept label/AI paraphrase. Optional fields giữ cách ly.
4. Bộ positive lẫn adversarial negatives, review false approvals và explicit
   policy/catalog version binding trước khi thay behavior; không bỏ public gate.

False-approval risks đã thấy thật: lẫn Japanese/Chinese, match substring 吃苦,
polyphone form–sense cross-product, borrowing POS từ sense khác, WordNet `x`
normalization, dictionary/ontology label equivocation, và LLM review được gọi nhầm
là independence. Một policy chỉ nới POS không xử lý được các rủi ro đó.

## Kiểm chứng và reproducibility

- **87/87** existing Python security/unit regressions PASS, 0 fail/error/skip,
  isolated tracked-source checkout của b12dcc4. Lệnh thực:

```text
python -m unittest scripts.vocabulary_pipeline.test_engine scripts.vocabulary_pipeline.test_unblock scripts.vocabulary_pipeline.test_core_projection scripts.vocabulary_pipeline.test_pending_research -v
```

- **15 evidence replay/invariant checks PASS** trên dữ liệu thật: exact 30 IDs,
  no approval, POS-only counterfactual, exact language/lemma, bốn reading/sense
  hazards, greeting stub, rescued wristwatch lineage, không gán Vietnamese gloss,
  concept-label separation, CEDICT reading family và source/package/license hash.
  Chúng xác nhận tính nhất quán của audit, **không phải semantic assessor PASS
  hoặc chứng nhận policy V0 sẵn sàng**.
- Không sửa application code nên không chạy lại Java/PostgreSQL/frontend/lint/
  build. Không lấy kết quả 513/276 tests của phiên trước để ghi PASS cho lượt này.
  Không mở database hoặc thay target/dist. Spring advisory exception giữ nguyên;
  không chạy CVE scanner và không tuyên bố sạch CVE.
- JSON parse, 30 distinct IDs, source object hashes, exact original file hashes,
  `git diff --check` và cached scope được kiểm tra trước commit.

Private evidence được giữ tại:
`C:\Users\LENOVO\AppData\Local\Temp\jiayou-evidence-recovery-ira3bw0w`.
`objects/<sha256>` có bytes tải thật; locks ghi URLs/time/status/revision. Các file
`cow.xml`, `ntumc.xml`, source code pinned, query/API snapshots và scripts nghiên
cứu ở đây, không thêm full export vào Git. Để tái lập local:

```powershell
$env:PYTHONDONTWRITEBYTECODE='1'
$env:PYTHONPATH='D:\GitHub\heyganba'
python 'C:\Users\LENOVO\AppData\Local\Temp\jiayou-evidence-recovery-ira3bw0w\assemble-matrix.py'
python 'C:\Users\LENOVO\AppData\Local\Temp\jiayou-evidence-recovery-ira3bw0w\validate-matrix.py'
```

Hai script đọc snapshot đã pin; không gọi provider, DB hoặc network. Lệnh assemble
ghi lại hai artifact audit/notice của lượt này; không nên chạy trên checkout đã
có chỉnh sửa riêng ở những artifact đó. Nếu tải lại nguồn, phải dùng COW tag/hash
và Wikidata revisions trong matrix, không coi current JSON mutable là cùng bytes.
Query/discovery lỗi không được thay hash hoặc ghi thành thành công.

## Đề xuất cụ thể để có nội dung verified đầu tiên

Ưu tiên **hai từ đang có `水` và `学校`**, không thêm từ: semantic scope đơn giản,
có CEDICT senses, COW Chinese definitions và Wikidata sense→concept cùng label
Việt có thật. Chúng là mục tiêu nghiên cứu, **chưa phải eligible-to-publish**.

Điều kiện còn thiếu chính xác:

1. Có source/provenance sidecar cho selected COW/NTU-MC sense và origin của core
   assertions Wikidata, hoặc một nguồn lexical độc lập khác cung cấp những field
   đó. Sidecar nguồn/phiên bản là dữ liệu upstream cho batch, không phải yêu cầu
   người dùng duyệt từng từ. Không chỉ dựa vào việc một source không khai dependency.
2. Có dữ liệu lexical Việt/bilingual có quyền reuse và sense alignment thật, đủ
   semantic rule hiện hành. Concept-label `nước`/`trường học` là hướng liên kết
   tiềm năng; nếu muốn coi loại liên kết đó là phương thức mới thì phải chứng minh
   nó trên positive/adversarial benchmark rồi version policy, không tự thay nó
   cho định nghĩa. **Không cần mua API key để giải quyết dependency dữ liệu này.**
3. Khi đủ core: dùng projection/quarantine hiện có, đọc lại effective DB fields/
   revision/digest, tạo unsigned proposal. Publication vẫn cần authorized issuer,
   valid source-rights catalog và signing trust thật, tách khỏi linguistic PASS.

Không có sự điều chỉnh POS đơn giản nào biến cohort này thành verified. Vì vậy
dừng mở rộng implementation và pending batches tại đây; bàn giao những thiếu hụt
cụ thể có thể giải quyết bằng nguồn/dữ liệu, không sản xuất thêm scaffolding.

## Workspace và commit

Baseline đã lưu HEAD/status/diff/index và **1014 file hashes**. Chỉ sửa một file
có sẵn: `docs/Content/automated-source-registry.md`; thêm matrix, license notice,
báo cáo này và validation JSON. Không stage dirty backend/frontend/migrations
của maintainer. Toàn bộ 1013 baseline file còn lại phải giữ nguyên hash; index
trống trước thao tác commit và được kiểm tra phạm vi bằng danh sách path cụ thể.
Commit local chứa đúng năm file trên; hash tra bằng:
`git log -1 --format=%H -- docs/QA/vocabulary-real-evidence-recovery-2026-10-30.md`.
Không push, merge, deploy hoặc mutate production.
