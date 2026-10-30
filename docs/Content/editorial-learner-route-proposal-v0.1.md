# Editorial-content adoption and learner route — proposal V0.1

**PROPOSAL ONLY — NOT AUTHORIZED, NOT IMPLEMENTED, NOT ACTIVE.** Không sửa
trusted lexical policy, VOCAB_CONTENT_V2, vocabulary receipts hoặc publication
authority hiện hành. Benchmark mới chưa chứng minh có validator tổng quát.

## Quyết định hiện tại

Cho phép tiếp tục chuẩn bị EDITORIAL_DRAFT offline với nguồn và examples có scope
rõ. Chưa adopt EDITORIAL_VALIDATED cho 10 từ mới; không tạo endpoint, migration,
key, issuer hoặc signed receipt. Frozen V0.1 chỉ biết hai seed 水/学校; 36 new-word
cases đều bị từ chối trước khi kiểm tra chất lượng. Không mở rộng whitelist rồi
gọi lại chính bộ này là held-out evidence.

Muốn phục vụ editorial content chưa có CORE_VERIFIED cần quyết định product/
security **cấp policy và content type**. Không phải duyệt tay từng vocabulary
record. Cho tới quyết định đó, các vocabulary/dictionary/notebook/SRS/exam API
hiện tại phải giữ nguyên mọi gate.

## Contract cần thống nhất trước adoption

| Thành phần | Ràng buộc cần có |
|---|---|
| Product authorization | Operator-controlled approval cho content type EDITORIAL_LESSON, audience, intended use, scope/risk tier và policy version; draft không thể tự khai authorization |
| State axes | Field SOURCE_ATTESTED; authoring EDITORIAL_DRAFT; quality EDITORIAL_VALIDATED; lexical CORE_VERIFIED riêng; release PUBLISHED_EDITORIAL riêng nếu được cho phép. Không map vào Vocabulary APPROVED |
| Identity | Stable editorial artifact ID + optional existing vocabulary reference ID; không merge word/senses hoặc đổi learner IDs |
| Semantic scope | Exact language, simplified/traditional, reading, source sense/concept, Vietnamese meaning scope và prerequisites; polyphone/collision/unsupported case → abstain |
| Quality decision | Adopted policy version, scope, check outcomes, evaluator version, source hashes, abstention reasons, evaluation-set version. Không nhận confidence hoặc author boolean thay evidence |
| Rights | Source expression reuse grants phù hợp intended use/audience, license version, notices, attribution, limitations, expiry/revocation. NC không tự động sai cho mọi use; phải đối chiếu intended use thực tế |
| Source lineage | Theo field/sense; shared CEDICT reading không thành hai family; synthetic/mock/Agent self-review không là independent adjudication |
| Integrity | Full editorial artifact digest + DB revision + policy/decision/source/rights binding; thay bất cứ field hiển thị, example, source binding hoặc attribution đều invalidate decision cũ |
| Trust | Release authorization do operator/trusted configuration cấp; không dùng vocabulary receipt V1 giả danh editorial proof. Không tái sử dụng key/issuer ngoài approved scope |
| Audit | Actor, artifact ID, before/after revision/digest, policy/decision/source/rights IDs, timestamp, reason cho author/evaluate/release/revoke; tránh secrets và learner PII |
| Revocation | Thu hồi riêng artifact/dependency bị ảnh hưởng; giữ draft và learning history, không xóa toàn corpus |

Tên `EDITORIAL_CONTENT_V1` chỉ là đề xuất cho một digest contract mới, **chưa có
implementation**. Cần định nghĩa canonical UTF-8, normalization, nullable fields,
newline handling và ordered collections tường minh rồi có cross-platform vectors.
Không đổi checksum/digest đã áp dụng. Fixture B cũ pin bytes CRLF nhưng Git giữ LF
đã cho thấy tại sao không được để chuyện này ngầm định.

## Điều kiện evidence trước khi adopt scope mới

1. Có bộ positive/negative semantic cases từ nguồn phù hợp không dùng construct/
   tune rule. Cần tách exact external facts khỏi Vietnamese/example judgments của
   cùng Agent; không gọi việc khớp oracle tự soạn là independent validation.
2. Chứng minh conditional acceptance trên một số positive đúng scope mới, cùng
   semantic/Pinyin/translation/concept/license rejection thực sự. Chặn tất cả ở
   ID guard không chứng minh các capabilities này.
3. Kiểm thử rights-compatible và rights-incompatible cases ở cùng input scope,
   gồm expiry/revocation và stale decision; không chỉ source-hash tamper check.
4. Báo accepted/abstained counts, false acceptance/abstention theo ground-truth
   provenance, unknown labels, undefined precision và failure reasons. Không dùng
   aggregate accuracy che bộ all-reject. Threshold/claim phải được chốt theo risk
   và evidence, không tự đặt một tỷ lệ chất lượng không có dữ liệu hỗ trợ.
5. Sau khi dùng bộ mới để tune, chuyển nó sang development và có bộ untouched
   khác. Không bắt buộc paid API hoặc routine human approval từng từ; có thể lấy
   independent expected facts/meaning từ licensed bilingual/pedagogical material
   và deterministic checks đã được chứng minh phù hợp. Không chế tạo một judge
   độc lập khi chỉ có cùng Agent.

## Optional dedicated API — chỉ thiết kế

Nếu product/security authorization được cấp, có thể cân nhắc:

- `GET /api/v1/editorial-lessons`: chỉ list artifacts được phép release theo
  current policy/rights snapshot. Draft hoặc unadopted-policy artifacts không
  xuất hiện; không lấy toàn authoring store rồi lọc bằng frontend.
- `GET /api/v1/editorial-lessons/{artifactId}`: trả approved revision và những
  fields thuộc approved scope, attribution, learner disclosure và quality-policy
  label. Không trả raw draft/evidence payload hoặc technical diagnostics.

Endpoint names chưa được đăng ký. Không reuse các existing lexical read APIs để
lách provenance. Authentication/audience/ownership theo product decision và
existing security conventions; client không tự chọn policy version hoặc quyết
định rights. Admin limits, CORS, backend health và deployment giữ nguyên.

Mỗi request quan sát một current authorization/catalog snapshot nhất quán. Catalog
malformed, missing policy, source unavailable theo freshness policy, rights revoked,
digest/revision mismatch, unsupported sense/example/enrichment → reject an toàn,
không fallback sang draft. Không dùng warmed cache hoặc client-side status để bỏ
qua revalidation; request kế tiếp phải thấy withdrawal. In-flight semantics cần
được công bố rõ và kiểm thử. UI chỉ hiện thông báo ngắn, không stack trace hay
nguồn technical details; không spinner vô hạn hoặc success giả.

Learner disclosure phải phân biệt “học liệu biên soạn cho ngữ cảnh này” với
dictionary certification/HSK completeness. Optional fields chỉ hiện khi chính
chúng được authorized; không tự thêm audio/Hán Việt hoặc cached exam answers.

## Data/history preservation và rollout có điều kiện

1. **Hiện tại:** draft JSON offline, no DB writes, 10 existing IDs tham chiếu.
2. **Sau authorization:** thiết kế riêng authoring/release records và immutable
   revisions, forward-only migration mới nếu cần; không sửa historical Flyway SQL
   hoặc đánh dấu vocabulary rows APPROVED bằng editorial quality marker.
3. **Isolated rehearsal:** fresh/upgrade, idempotency/rollback, stale writes,
   auth/audience, source/licensing withdrawal, unsupported content, concurrent
   publish/revoke, digest/newline vectors và no draft leakage.
4. **Preview/release:** rollout chỉ artifacts có release authorization thật;
   audit và revocation hoạt động trước khi learner access. Task này không cấp
   authorization và không yêu cầu deploy.
5. **Progress nếu được product cho phép:** dùng stable artifact/revision references,
   revalidate ownership và grading/source assumptions; không đổi notebook/SRS/exam
   history hiện có. Không suy vocabulary mastery/certification từ một editorial view.

Không có một flag, human per-word approval hoặc paid-model verdict đơn lẻ nào
thay được contract trên. Hiện chỉ nên tiếp tục bounded draft authoring; chưa có
căn cứ kích hoạt learner route hoặc mở general free-text semantic validation.
