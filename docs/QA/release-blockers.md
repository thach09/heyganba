# Release blockers — 2026-10-26

**NO-GO production; không push hoặc deploy trong phiên recovery.** Code được kiểm chứng: `44a673fda970f70c0b9de9f8f487fd446b60c21d`.

| ID | Trạng thái | Bằng chứng / điều kiện mở |
|---|---|---|
| R1 | BLOCKED — quyền phân phối | Collins observations/V21 chưa có phép reuse; review quyền hoặc thay protected expression. Baseline seed V1–V11 cũng cần hoàn tất lineage/notice cho phân phối. Không sửa checksum SQL đã áp dụng. Inventory phân biệt fact-check, adaptation và quyền phân phối. HUMAN APPROVAL REQUIRED khi cần permission; không áp human review bắt buộc lên mọi lexical cross-check. |
| R2 | BLOCKED — publication vận hành | Chưa có catalog/issuer/rights/objects/receipt thật được cấu hình. 495 quyết định cũ chưa vượt lại audit đầy đủ; phiên này cấp 0 receipt thật. Đối chiếu nguồn/semantic và quyền, cấu hình trust operator ngoài JAR rồi phát hành từng nhóm đủ điều kiện, không nhập flag/URL làm proof. |
| R3 | NOT VERIFIED — Render | Dashboard dừng ở login. Cần đọc nhánh và auto-deploy/Git integration của các service Heyganba thực tế, hoặc chứng minh integration đã được gỡ. Không suy từ blueprint đã xóa hay comment self-host. Không tạo credential/settings để vượt chặn. |
| R4 | NOT VERIFIED — production DB history | Chỉ kiểm chứng DB local. Cần lấy history/version/checksum và backup/role quyền tối thiểu của môi trường thật theo quy trình được phép trước rollout. Nếu đã có V15–V23, allowlist V14 cố ý không bỏ qua future history; cần kế hoạch có kiểm soát, không Flyway repair che mismatch. |
| R5 | INCOMPLETE — phần working tree giữ lại | DTO/entity/provenance UI, generator/import V15–V23, hardcoded coverage, font/routing/deferred companion, self-host và tài liệu lịch sử chưa được commit thành release. Không tuyên bố HSK 1 đầy đủ hoặc HSK 2–6 đã khớp syllabus. Cần evidence/digest/rights và tests theo batch trước khi dùng. |
| R6 | NOT VERIFIED — performance/thiết bị | Không có ba phép đo cold-cache Lighthouse/CDP mới, field INP, browser zoom 200% hay bàn phím mobile thật. Các optimization pending chưa được giữ trong commit; không nhận đạt LCP ≤2,5s bằng số đo cũ. |
| R7 | HISTORICAL ONLY — Japanese PG audit | 23/24 test profile đã chạy; opt-in PG còn cần catalog lịch sử provision sẵn, loader cũ đã purge. Không coi no-op migration còn lại là fresh-import proof. Đây không phải runtime Trung hoặc chặn phải phục hồi corpus Nhật vào production. |
| R8 | NOT PRESERVED BIT-FOR-BIT — generated outputs | 380/878 artifact hash drift (135 missing, 245 changed) trong target classes/test-classes. Không xác định writer; Java IDE servers hoạt động. Source backup 968 file và JAR/dist gốc còn nguyên; snapshot hiện tại đã giữ riêng. Không ghi đè output khác byte, không nói bảo toàn đầy đủ binary. |

Vercel Production Branch **đã xác minh bằng UI là main**; feature thuộc Preview, không có custom domain Preview. Không còn dùng “thiếu Vercel production branch” làm chặn cũ. Tuy nhiên Preview là side effect thực của push; include ngoài root và model-improvement preference đang bật. Không có thay đổi provider trong phiên này.

GitHub main đã xác minh yêu cầu PR + ba CI check, up-to-date, enforce admin, cấm force-push/delete. Local clean-checkout tests không thay thế required checks trên GitHub cho commit chưa push. Không mở PR, merge, promote hoặc deploy.

Spring runtime audit vẫn giữ hai exception (`GHSA-j9f9-w8pj-32f8`, `GHSA-pc63-qcmh-9cmg`), có executable MVC surface guard. Rà lại ngay khi thêm SSE fragments hoặc XSLT/server-rendered view; không báo “không còn CVE”.

Xem [báo cáo](foundation-recovery-final.md) và [inventory](foundation-recovery-inventory.json) để lấy command, exit code, testcase/skip, migration/resource list, hash delta, ACL quarantine và status còn lại. Các chặn này không được giải quyết bằng mở lại toàn bộ corpus, tự khai giấy phép hoặc vô hiệu hóa validation.
