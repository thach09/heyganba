# Foundation recovery — 2026-10-26

**Quyết định: NO-GO production; chưa push.** Các sửa nền tảng có commit local và đã kiểm chứng trên source của commit `44a673fda970f70c0b9de9f8f487fd446b60c21d`. Đây không phải phê duyệt corpus hay xác nhận mọi thay đổi đang dở đều sẵn sàng phát hành.

## Git và phạm vi

- Branch: `feat/v2.1-ux-and-stability`.
- HEAD đầu phiên: `fffcbc924fcbaeda45bf3d3097acc07013954faf`; remote xác nhận sau fetch: `645160671ccefc0db4453f3d3d30bc69ea61655d`.
- HEAD code đã kiểm chứng: `44a673fda970f70c0b9de9f8f487fd446b60c21d`. Commit bàn giao chứa báo cáo nằm sau HEAD code; lấy hash bằng `git log -1 --format=%H -- docs/QA/foundation-recovery-final.md`. Không thể ghi hash của chính commit báo cáo vào nội dung commit đó.
- Đầu phiên có 14 commit local; đã đọc/reconcile chúng cùng 49 modified, 21 deleted, 114 file untracked mở rộng. Index ban đầu trống.
- Không force-push, merge main, deploy, gọi deploy hook hoặc truy cập database thật. CI recovery giữ ba job kiểm thử và bỏ deploy hook đang được maintainer loại bỏ.
- Danh sách file từng commit, toàn bộ status còn lại, hash trước/sau và nguồn evidence nằm trong [inventory](foundation-recovery-inventory.json). Không dùng `git add -A`.

| Commit mới | Kết quả                                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `84083bd`  | Tách frozen V1 digest khỏi graph provenance chưa phát hành; giữ sáu golden/compatibility test, chuyển assertion cho metadata tương lai sang test đang giữ ngoài commit |
| `2b2fbf3`  | Thu hồi checkpoint đúng tài khoản sau logout thành công, đổi tài khoản/mật khẩu; bảo vệ tab cũ và phản hồi logout muộn                                                 |
| `0c0e755`  | Publication authority, ràng buộc receipt/digest/revision/rights, khóa transition và bảo vệ các đường đọc/cache/exam                                                    |
| `00cfef1`  | Tách corpus/helper Nhật khỏi runtime; audit lịch sử bằng fixture ngoài repo được pin hash                                                                              |
| `44a673f`  | Allowlist migration V1–V14, cấu hình fail-closed, kiểm tra JAR và rehearsal PostgreSQL production                                                                      |

## Nguyên nhân và bản sửa

Backend HEAD đầu phiên có test phụ thuộc service/field chỉ tồn tại trong working tree. Dirty snapshot build được không chứng minh HEAD build được. `VocabularyLegacyDigest` giữ nguyên thuật toán V1; code và test của commit hiện độc lập với service provenance chưa phát hành.

Trước đây trạng thái APPROVED, URL và JSON tự khai có thể bị nhầm thành quyền xuất bản; cache và bản sao đề thi còn có thể giữ nội dung đã thu hồi. Authority mới đọc catalog do operator kiểm soát ngoài artifact, xác thực Ed25519 bằng trust/policy server, V2 content digest, installation/record identity, eligibility revision và source objects theo hash. Quyền sử dụng là quyết định riêng theo source/scope/expiry, không được suy ra từ chữ ký. Thiếu hoặc sai dữ liệu thì từ chối. WEB_CROSS_CHECKED hợp lệ không bắt buộc human editorial review.

Admin không có API đăng ký key, cấp quyền nguồn hoặc ký receipt. Tạo/sửa từ trả về PENDING_REVIEW; các transition khóa cùng hàng và ghi audit. Phê duyệt lặp hợp lệ không ghi transition lần nữa. Sửa rồi đổi lại nội dung không hồi sinh receipt cũ. Các cột academic hiện đại/compatibility được đồng bộ khi sửa.

Vocabulary, dictionary, notebook, SRS, Hanzi compounds và word coverage kiểm tra proof hiện hành. SRS cache xây academic fields từ hàng DB hiện tại; các hàng chưa đủ điều kiện ở trang đầu không che các từ hợp lệ phía sau. Review của từ đã thu hồi không làm sai số từ mới khả dụng. Snapshot đề thi mới ràng buộc cả nguồn đáp án/distractor; recovery, submission và detailed result kiểm tra lại. Snapshot lexical cũ không có origin manifest bị từ chối bằng thông báo ngắn. Không xóa tiến độ học hoặc đổi server authority về ownership, hạn bài, chấm điểm và idempotency.

Catalog được chụp nhất quán trong một HTTP request; request tiếp theo đọc lại revocation. Không tuyên bố thu hồi giữa chừng là atomic. Audit/DB superuser và operator filesystem vẫn là trust boundary. Hướng dẫn vận hành và giới hạn kích thước: [publication contract](../../backend/docs/vocabulary-publication.md).

Logout chỉ xóa recovery của owner sau xác nhận máy chủ; lỗi logout giữ input. Marker generation chặn checkpoint của phiên cũ, kể cả legacy checkpoint xuất hiện sau thu hồi. Account khác và preference được giữ. localStorage không có compare-and-swap; concurrent writes và browser từ chối storage vẫn có giới hạn đã mô tả trong code/test. Không coi checkpoint là trạng thái thi có thẩm quyền.

## Kiểm thử thực chạy

Source xuất từ Git commit code vào thư mục `final-committed` trong backup riêng; không dùng working tree bẩn để tuyên bố HEAD xanh.

| Lệnh / phạm vi                                                         | Kết quả thực                                                            |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `mvn -o -B clean verify`, H2                                           | exit 0; 509 total, **502 passed, 0 failures, 0 errors, 7 skipped**      |
| `mvn -o -B test`, PostgreSQL 16, env CI, DB local riêng                | exit 0; **509 / 502 / 0 / 0 / 7**                                       |
| `ProductionMigrationSafetyTest`, opt-in                                | exit 0; **4/4 passed**                                                  |
| `PostgresSchemaStagingRehearsalTest`, opt-in                           | exit 0; **3/3 passed**                                                  |
| `-Plegacy-japanese-audit test` với fixture đã materialize              | exit 0; **24 total, 23 passed, 0 failures/errors, 1 skipped**           |
| `npm ci` trên checkout commit                                          | exit 0                                                                  |
| `npm test`                                                             | exit 0; **276/276 Vitest, 31 files; 8/8 Node tests**                    |
| `npm run lint`, `npm run build`                                        | đều exit 0; không có lint/build warning trong log cuối                  |
| `npm audit --audit-level=moderate`                                     | exit 0; không có advisory npm được báo tại lần chạy                     |
| Runtime Maven dependency audit                                         | exit 0; **104 dependencies**, giữ hai exception Spring bên dưới         |
| Artifact audit, kể cả `python -O` và bốn artifact giả lập không hợp lệ | exit 0; từ chối V21, corpus Nhật, QA fixture và trust catalog chèn thêm |
| `git diff --check`, staged check                                       | exit 0 sau ngoại lệ whitespace hẹp được giải thích bên dưới             |

Bảy skip default là ba rehearsal schema và bốn rehearsal production cần DB trống riêng; cả bảy testcase này đã chạy riêng và pass, không được cộng lại để tăng tổng testcase. Skip duy nhất của profile Nhật là `dictionary.pilot.rehearsal`: cần catalog lịch sử đã provision. Loader cũ đã bị purge; phần test còn lại không chứng minh fresh import 218.867 mục. Không chạy nó và không giả tạo dataset để nhận PASS.

Baseline sửa build là 499 test. Security thêm 22 thành 521; tách 24 test Nhật và thêm hai boundary test thành 499 default; thêm 7 guard test + 4 production rehearsal và gộp 4 config test cũ thành 3 config test mở rộng thành 509 default. Tổng unique default + historical là 533: 38 testcase mới, 4 tên config được thay thế, không bỏ testcase nghiệp vụ tiếng Trung. Inventory liệt kê từng testcase mới/chuyển/thay thế và từng skip.

Backend còn warning compiler deprecated/unchecked và Mockito dynamic agent cho JDK tương lai. Không coi chúng là failure. Runtime audit giữ `GHSA-j9f9-w8pj-32f8` và `GHSA-pc63-qcmh-9cmg` theo điều kiện không có SSE view fragments/XSLT view; `MvcViewSurfaceTest` kiểm tra surface này. Giữ memo advisory hiện có và rà lại trước khi thêm các surface đó; không tuyên bố scanner hết CVE.

## PostgreSQL và artifact

Chỉ dùng container audit có label `heyganba.audit=foundation-20261026`, PostgreSQL 16.15, bind loopback và database riêng. Sau Docker restart, port động đổi từ 49977 sang 58039; lần rehearsal đầu sau restart lỗi connection-refused đã được ghi nhận, sau đó đọc binding thực và chạy lại thành công. Không thay đổi container/database của sản phẩm khác.

Đã kiểm tra fresh V1–V14, nâng cấp V11→V14, fingerprint academic fields và dữ liệu users/notebook/items/SRS/exam, checksum history thực so với manifest, index/FK/uniqueness, hai Flyway runner đồng thời, re-run không thêm migration, termination của chính connection migration, rollback DDL/history và roll-forward bằng fixture test. Tamper checksum bị từ chối; history của version tương lai không được bỏ qua. Context dùng profile prod thực và Hibernate validate; DB health indicator tồn tại và UP.

Chạy chính executable JAR bằng prod profile trên DB mới riêng: health **200 → 503 → 200** khi khóa kết nối/terminate session của duy nhất DB audit rồi mở lại. Response giữ `success`, `data.status`, `Cache-Control: no-store`, không chứa tên DB, JDBC URL, credential hoặc exception. Đây là test outage PostgreSQL thật, tách khỏi inspection cấu hình và browser mock.

Maven chỉ đóng gói 14 migration theo tên file cụ thể: V1–V3 trong `db/migration`, V4–V14 trong `db/migration-release`, callback cũ và manifest; không lấy staging bằng wildcard. V12 index, V13 quarantine metadata/trạng thái, V14 verification schema. V15–V23 bị giữ ngoài artifact, đặc biệt V21. Startup từ chối staging override, tự baseline database không rõ history, target bỏ qua safety migration, tắt validate/clean guard và bỏ qua future history.

Git blob của V1–V11 và checksum đã áp dụng không bị viết lại. Bản sao giữ nội dung lịch sử; manifest phân biệt SHA-256 canonical LF, raw packaged hash và Flyway CRC32. Năm bản sao V4–V8 có whitespace lịch sử: staged check ban đầu exit 2. `.gitattributes` chỉ miễn whitespace đúng năm file này; source/copy hash, artifact allowlist và PostgreSQL checksum vẫn bắt buộc. Không sửa SQL đã áp dụng để làm đẹp whitespace.

JAR cuối không chứa corpus Nhật, curation helper, fixture, tài khoản QA theo marker kiểm tra, receipt catalog hoặc V15–V23. Inventory có toàn bộ resource list và hash JAR/migration. Artifact gate không cấp bản quyền: SQL seed V1–V11 được giữ để tương thích history, chưa được tuyên bố mọi lineage/notice đã đủ cho phân phối production.

## Legacy, corpus và quyền sử dụng

Trong 21 đường dẫn bị xóa đầu phiên: 20 là legacy Nhật (18 resource, hai helper), một là `render.yaml` còn giữ ngoài commit. Một gzip nguyên byte; 18 đường dẫn tương đương sau CRLF normalization; assisted TSV thay đổi thực chất, còn một dòng chú thích. Mapping và hai hash từng đường dẫn có trong inventory. Không khôi phục legacy vào runtime.

Tool materialize pin commit `fffcbc9` và SHA-256 của đủ 18 resource, chỉ ghi thư mục mới ngoài repo; profile audit chạy với dữ liệu lịch sử nguyên bản, gồm kiểm tra 4.796 dòng. Bản lưu maintainer bị rỗng không bị ghi đè. Đây không phải phê duyệt dữ liệu Nhật để phân phối.

**Không có từ thật nào được thêm/được cấp receipt tin cậy trong phiên này.** Không tuyên bố 495 quyết định cũ đã vượt audit mới; chúng chưa được tái xác minh toàn bộ semantic evidence và quyền phân phối. Fresh V14 có 560 từ legacy ở PENDING_REVIEW trong DB local; đó là quarantine mechanics, không phải thao tác thu hồi trên server thật. Không có catalog thật nên không dùng các APPROVED flag lịch sử để tuyên bố độ phủ đang xuất bản. HSK 1 chưa được xác nhận đầy đủ; số official ID thiếu của HSK 2–6 chưa được tái đối chiếu độc lập trong foundation run. Các checkpoint v23 cũ không trở thành bằng chứng nghiệm thu mới.

Inventory bản quyền có 12 nhóm nguồn, phương thức extraction, phạm vi/attribution, trạng thái và hash các file tham chiếu. [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cedict) cho phép dùng có điều kiện BY-SA; nghĩa Việt biên soạn là adaptation/editorial, không giả là bản dịch sẵn trong nguồn. [MOE](https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/dict_concised_download.html) cho phép phân phối nguyên trạng theo BY-ND, không suy ra quyền dịch/đổi định nghĩa. [Collins](https://www.collinsdictionary.com/terms-and-conditions) không có quyền reuse được ghi nhận: **HUMAN APPROVAL REQUIRED** cho quyền cần thiết, hoặc thay protected expression bằng nguồn/biên soạn phù hợp. Chữ ký receipt không giải quyết việc này. Không biến yêu cầu bản quyền thành bắt buộc human review cho mọi từ.

35 file nghiên cứu/SQL chưa đủ điều kiện được giữ local, quyền file chỉ owner/SYSTEM/Administrators; bytes không đổi, ACL cũ được lưu riêng để có thể hoàn tác. Không đưa raw evidence vào commit bàn giao. Các nguồn/fonts/stroke data có license riêng, không gộp license code Hanzi Writer với dữ liệu Arphic.

## Frontend và provider

Browser fixture journeys tại 1440/390: vocabulary, dictionary save/notebook, Hanzi, Pinyin, Dashboard, Admin; không overflow/page error. Reconnect manual/online giữ cùng DOM card, đáp án/checkpoint và không navigation. Logout thật qua AuthProvider/client với HTTP fixture xóa cả hai storage copy/lesson của owner, giữ account khác và preference. Đã tự xem screenshot desktop/mobile. Browser fixture không được trình bày thành test API production thật. Không có thay đổi layout/theme/lồng đèn trong phiên này.

Chưa commit lazy/eager/font/deferred companion đang dở; không có tuyên bố LCP cải thiện. Không chạy bộ ba cold-cache Lighthouse/CDP mới, không dùng TBT thay INP hoặc local thay field. Zoom browser 200% và bàn phím mobile thật chưa được xác minh ở phiên foundation này.

Đã đọc UI provider đăng nhập hiện có: Vercel project ID khớp local, repo `thach09/heyganba`, Production tracking **main**, auto-assign production domains bật. Preview tracking **All unassigned branches**, không có custom domain gắn Preview; feature push có thể tạo/cập nhật Preview. Root `frontend`, npm ci, npm run build, dist, Node 24.x; include files ngoài root và skip unaffected đều bật, ignored build Automatic. Không có project deployment checks hay deploy hooks. Data preference cải thiện model đang bật; không thay đổi setting. MCP vẫn 403/list zero teams sau grant nên bằng chứng ở đây đến từ UI, không giả là MCP thành công.

GitHub repo public; classic rule main yêu cầu PR, ba status check đúng tên job, up-to-date và áp dụng cho admin; không cho force push/delete. Không thay đổi rule. Render chỉ đến trang Sign In: branch/auto-deploy thực tế **NOT VERIFIED**. Không suy ra từ `render.yaml` hoặc ý định self-host.

## Bảo toàn và phần còn giữ

Snapshot source/untracked trước sửa gồm **968 file**, kiểm tra hash backup không sai khác. File không liên quan trong baseline giữ hash; delta có inventory. Không chạy Maven/npm build trong repo gốc và không reset/clean/restore các thay đổi của maintainer.

**Giới hạn bảo toàn generated output:** 878 artifact được ghi hash đầu phiên, nhưng bản backup đầu phiên không sao lưu đủ mọi binary generated. So cuối có 380 drift: 135 thiếu, 245 khác byte, tại backend target/classes và target/test-classes. JAR và frontend dist gốc giữ hash. Có Java language server VS Code/Antigravity đang chạy; chưa chứng minh được tiến trình nào ghi/xóa nên không quy nguyên nhân chắc chắn. Đã giữ snapshot generated hiện có và tái dựng baseline riêng (compile exit 0), chỉ 50/380 file tái dựng khớp hash; không giả là đã phục hồi toàn bộ và không ghi đè output mới. Kiểm tra bảo toàn generated bit-for-bit **không đạt**.

Các entity/DTO/provenance editor, source imports/publication V15–V23, nội dung/coverage labels, performance/self-host và tài liệu cũ chưa được phê duyệt vẫn ngoài commit. Dirty workspace toàn phần không được tuyên bố xanh; các test cũ coi URL/self-JSON là đủ không còn là contract xuất bản hợp lệ. Graph tương lai vẫn cần review đồng bộ entity→schema→service→DTO→editor→tests trước khi release.

**Draft PR:** phần code đã commit đủ để review riêng, có local gates tái lập; chưa có GitHub Actions run cho HEAD mới vì chưa push. **Production: NO-GO.** Chặn cụ thể và hành động tiếp theo: [release blockers](release-blockers.md). Hash và log local cho từng kết luận có trong inventory; log thô giữ private vì có thể chứa token test.
