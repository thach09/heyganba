# Vocabulary verification policy — JIAYOU_LEXICAL_V1_1

V1.1 giữ nguyên ngưỡng linguistic verification và receipt/content-digest contract của V1. Thay đổi là parser Mandarin có scope pronunciation rõ hơn, diagnostics theo nguồn, adapter HTTP assessor và correction pending giới hạn theo field; không nới quyền AUTO_VERIFIED/publication.

Không bắt buộc người duyệt từng từ. Không chấp nhận URL, domain, confidence, flag APPROVED hoặc JSON tự khai làm bằng chứng xuất bản.

## Quyết định theo bản ghi

- `AUTO_VERIFIED`: đủ trường bắt buộc, bằng chứng đúng field/sense, hai họ nguồn độc lập cho chữ/cách đọc/nghĩa/POS, không có mâu thuẫn, nguồn có policy reuse phù hợp và notices đi cùng kết quả. Đây là kết quả ngôn ngữ, chưa phải quyền PUBLISHED.
- `NEEDS_RESEARCH`: thiếu dữ kiện, template chưa hỗ trợ, lineage chưa rõ, mạng lỗi hoặc chưa đủ bằng chứng nghĩa Việt. Bổ sung nguồn/adapter/assessor rồi chạy lại, không yêu cầu ký duyệt thủ công từng mục.
- `CONFLICT`: giá trị đang dạy không khớp giá trị nguồn hỗ trợ hoặc có mâu thuẫn ngữ nghĩa chưa giải quyết. Không ghi đè nghĩa xung đột.
- `LICENSE_BLOCKED`: source bytes có nhưng quyền reuse không đủ/không rõ. Không tạo giấy phép thay tác giả.
- `REJECTED`: candidate sai cấu trúc hoặc trùng identity trong batch. Hai nghĩa khác nhau không bị gộp chỉ vì cùng chữ Hán.

Trường tùy chọn có trạng thái riêng. Hán Việt/ví dụ không được suy ra từ một nguồn chỉ có chữ/Pinyin/định nghĩa. Trường đang có nhưng chưa xác minh ngăn AUTO_VERIFIED toàn mục; không tạo receipt khả năng optional. Không sửa backend projection hoặc bật cờ verified để vượt chặn.

Classifier/cross-reference được phân biệt với định nghĩa đang dạy. Nghĩa Anh và lượng từ được ghi ở `supplementalAudit` là extracted/chưa cross-check, không thêm vào capability xuất bản. Candidate khai báo expression bị hạn chế vẫn LICENSE_BLOCKED dù mô hình nhận xét tương đương nghĩa; nguồn thừa không đủ quyền được bỏ khỏi evidence, không khóa các mục đã đủ nguồn hợp lệ khác.

## So khớp và nghĩa Việt

Digest là **VOCAB_CONTENT_V2 hiện có**, chín trường, NFC, phân biệt null/empty, giữ whitespace và dấu thanh. Python được đối chiếu với codec/verifier Java thực. Không dùng normalization của tìm kiếm để tính digest.

Pinyin so sánh dạng đánh dấu thanh, hỗ trợ numbered tones, dấu thanh Unicode, ü/u:/v, neutral 0/5 và từ viết liền. Không bỏ thanh hoặc tự áp sandhi. POS tiếng Việt thông dụng có alias so sánh; không sửa giá trị/digest gốc. Nhãn đặc thù/không biết giữ chưa xác minh. Chữ phồn thể thay thế trong cùng nguồn không tự tạo conflict nếu nguồn cũng hỗ trợ đúng dạng đang dạy.

Nghĩa có thể qua một trong hai đường:

1. Hai **nguồn từ điển tiếng Việt độc lập** cùng hỗ trợ chính xác định nghĩa đang dạy, cùng identity/cách đọc và POS: có thể dùng quy tắc deterministic, không cần AI/human. Chỉ NFC, không làm mất qualifiers hay đổi rộng/hẹp nghĩa. Đường này đã có test synthetic, chưa có batch thật đủ nguồn được phát hành.
2. Assessor do operator cấu hình đánh giá tương đương nghĩa, nghĩa đang chọn và độ tự nhiên tiếng Việt. Response phải gắn SHA-256 của request và chỉ rõ extraction hashes hỗ trợ. AI không tạo cách đọc, POS còn thiếu, quyền sử dụng hoặc một nguồn độc lập mới. Không dùng việc cùng model tự đánh giá lại làm bằng chứng AI độc lập.

Request chứa source text dưới dạng dữ liệu không tin cậy, yêu cầu giữ sense và qualifiers. Hai field cốt lõi không được lấy từ hai nghĩa khác nhau. Cần cấu hình assessor độc lập phù hợp trước khi nhận semantic assessment thực; provider/model/rationale và raw response được giữ riêng để audit. Chữ ký chỉ xác thực issuer, không chứng minh nhận định ngữ nghĩa đúng.

## Adapter assessor

[assessors.py](../../scripts/vocabulary_pipeline/assessors.py) định nghĩa protocol `run(bytes) -> bytes`, command adapter không qua shell và registry factory cho provider mới.

Mặc định `JIAYOU_ASSESSOR_PROVIDER=disabled`. `command` với `JIAYOU_ASSESSOR_COMMAND` là JSON argv cho wrapper do operator quản lý. Wrapper nhận JSON trên stdin và trả JSON trên stdout.

Adapter REST stdlib hỗ trợ `JIAYOU_ASSESSOR_PROVIDER=openai` hoặc `gemini`, với `OPENAI_API_KEY` hoặc `GEMINI_API_KEY`, `JIAYOU_ASSESSOR_MODEL` và `JIAYOU_ASSESSOR_AUTHOR_MODEL` bắt buộc. Không có default model hoặc key được tạo sẵn. Không dùng credential Codex/ChatGPT thay API key. Thiếu cấu hình trả NEEDS_RESEARCH có reason, không dừng toàn batch. Key chỉ nằm trong header gửi endpoint chính thức qua HTTPS; không theo redirect, không ghi key vào argv/Git/evidence. OpenAI dùng Responses API với `store=false`; các nghĩa được gửi vẫn chịu chính sách provider do operator lựa chọn.

Structured output gồm các checks meaning/vietnamese/reading/partOfSpeech/classifiers/context/sourceDisagreements. CONFLICT luôn thắng verdict tương đương; UNKNOWN giữ nghiên cứu lại. Model/version/response ID lấy từ metadata API, request binding và evidence hashes phải hợp lệ. Tên author model do operator khai báo là điều kiện vận hành, không phải bằng chứng độc lập được chứng thực; cùng model hoặc alias bị từ chối. Không đếm model thành source family. Timeout tối đa 60 giây/lần, tối đa 3 attempts, response tối đa 1 MiB; chỉ retry lỗi mạng/429/5xx hữu hạn và tôn trọng cooldown dài bằng cách dừng. Xem [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [Gemini structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).

Chưa có credentials/model độc lập thật trong môi trường phiên 2026-10-28. Kiểm thử HTTP mock chứng minh protocol, không chứng minh tính đúng ngữ nghĩa hoặc kết nối provider thật.

Response gồm `requestSha256`, `verdict` (`EQUIVALENT`/`CONFLICT`/`UNCERTAIN`), `vietnameseNatural`, `provider`, `modelVersion`, `rationale`, `supportingExtractions` (tối đa 8 hash hợp lệ). Lỗi process/timeout/JSON hoặc binding trả về nghiên cứu lại.

`JIAYOU_ASSESSOR_PROVIDER=mock` chỉ kiểm tra protocol. Engine đổi verdict thực về UNCERTAIN, giữ `simulatedVerdict` và lý do `MOCK_IS_NOT_SEMANTIC_EVIDENCE`. Mock không thể xác minh nghĩa thật. Fixture synthetic trong unit/integration test không được tính vào corpus hoặc số từ đã duyệt.

## Ingestion và publication

Ledger SQLite private dùng transaction và optimistic concurrency cho cả content lẫn kết quả evidence. Rerun không đổi dữ liệu không ghi lại; writer dùng digest/revision cũ bị từ chối, batch lỗi rollback. Candidate ID/sense identity và vocabulary ID là hai khái niệm riêng.

[ingestion.py](../../scripts/vocabulary_pipeline/ingestion.py) có thể tạo **candidate SQL cho migration Flyway mới**, chỉ từ kết quả AUTO_VERIFIED hiện hành. Không tự apply hoặc thêm vào release allowlist. SQL:

- Binding sense identity với vocabulary ID, advisory lock theo chữ và row lock khi sửa.
- Mục mới luôn PENDING_REVIEW, không gán HSK/lesson chính thức; không tự APPROVED.
- Sửa mục cũ cần đủ before-content, V2 digest và eligibility revision. Giữ ID, lesson và các quan hệ học viên. Đồng bộ cột modern/compatibility, xóa search index có thể cũ, hạ pending và tăng audit revision.
- Source-ref cũ được xóa khi correction; `source_version` trỏ evidence bundle, còn dataset version/revision thực được giữ trong attribution metadata. Audit lưu digest trước/sau.
- Không tự mở lại mục ARCHIVED/REJECTED; việc hòa giải nội dung không thay quyền của chính sách thu hồi/phát hành.
- Rerun đúng nội dung/binding không thêm từ/audit. Import cũ, correction cũ hoặc homograph chưa hòa giải bị từ chối. Không merge/xóa record hay learner relationship.
- Attribution/license obligations đi theo metadata; optional import hiện chỉ hỗ trợ các trường optional vắng mặt. Optional còn draft cần batch xử lý riêng, không tự loại bỏ để ký receipt.

Candidate này cần rehearsal và một release được kiểm soát sau đó; chưa thay schema/manifest V14 đang phát hành. Mọi migration lịch sử V1–V23 được giữ nguyên.

`--pending-corrections-output` là opt-in riêng: chỉ bản ghi có ID/before-content/digest/revision và decision NEEDS_RESEARCH, chỉ thay traditional/POS đã có kết quả VERIFIED theo ngưỡng field hiện có. Không đổi word/reading/meaning, không nhận CONFLICT/LICENSE_BLOCKED, không tạo từ mới hoặc cấp AUTO_VERIFIED. Giữ nguyên optional draft bytes và quan hệ học viên, hạ pending/verified flags và vô hiệu hóa digest publication cũ. POS vẫn cần hai family độc lập và semantic verdict EQUIVALENT cho đúng sense; traditional theo policy hiện có cần bằng chứng nguồn trực tiếp. Đây là sửa draft theo field, không phải phát hành một record đã duyệt. Rerun cả import/correction kiểm tra audit thu hồi mới hơn trước khi nhận no-op.

`receipt_payload()` xuất đúng unsigned V1 contract cho vocabulary đã có ID. Sau ingestion phải đọc lại effective fields và revision từ DB, xác minh lại rồi mới dùng issuer được operator cho phép. Thiếu catalog/rights/key trust thì publication vẫn chặn. Pipeline không tạo key/rights grant, không đăng ký issuer và không ký receipt production.

## Chạy lại

Từ repository root, dùng `python -m scripts.vocabulary_pipeline --help`. Chọn `--private-dir` ngoài repo.

1. Export chỉ đọc từ DB snapshot local bằng `export-vocabulary.sql`; chuyển thành candidate có sense identity rõ, không suy HSK chính thức từ nhãn nội bộ.
2. `acquire` hoặc `acquire-batch` lấy nguồn trong registry, lưu lock và object. Batch giới hạn 1–100; `--retry-failed` tiếp tục checkpoint sau cooldown.
3. `verify --candidates <json> --locks <json> --output <private-manifest>` chạy kiểm tra, ghi ledger và SQL TEMP research staging. `--pending-import-output` chỉ tạo candidate migration private nếu có mục đủ điều kiện; không có mục đạt thì không tạo SQL approvals.
4. Chỉ đưa batch đủ evidence/rights qua quy trình release hiện có. Research manifest không phải publication catalog.

Giới hạn hiện tại: chưa có parser syllabus/official-ID release mới trong engine; mọi syllabusClaims để rỗng. Không quảng bá bộ chọn lọc nội bộ thành HSK 1–6 đã hoàn chỉnh. Không tự sinh Hán Việt/ví dụ được duyệt, audio hay curriculum mapping.
