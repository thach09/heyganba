# Báo cáo readiness Heyganba — 2026-10-20

> Số liệu V15 trong báo cáo này là lịch sử. Xem [kết quả bổ sung V23](./readiness-v23-2026-10-20.md) cho corpus, artifact, gate và hiệu năng mới nhất.

## Kết luận

Các kiểm tra local trên source hiện tại đã qua: frontend, backend H2/PostgreSQL, chạy migration mới và nâng cấp, khôi phục backup, API smoke, hành trình trình duyệt và ma trận viewport. Repo vẫn ở commit `220fb25` trên `feat/v2.1-ux-and-stability`; không có thay đổi nào được stage, commit, push hay deploy trong lượt này.

Đây chưa phải xác nhận deploy production. Chưa kiểm tra cấu hình provider, secrets, hostname/TLS, proxy tin cậy, Redis, chính sách quyền truy cập hay backup trên máy đích. Hãy dùng [self-host runbook](../self-host-runbook.md) cho lần diễn tập trên môi trường đích tương đương.

## LCP: đo theo giai đoạn

Đo trên build production local của Dashboard. Kết quả lab và Chrome trực tiếp khác nhau, nên được giữ riêng:

| Phép đo | Thiết lập và kết quả | Ý nghĩa |
|---|---|---|
| Lighthouse CLI 13.5, 3 lần cold | LCP 3015 / 3157 / 3157 ms; median 3157 ms. FCP 2555–2634 ms; TTFB do mô phỏng 452 ms. CLS 0.004–0.015. | Lab mô phỏng còn trên mốc 2.5 giây. |
| Chrome DevTools Protocol, 3 process mới, cache tắt | Viewport 412×823, CPU slowdown 4×, latency 150 ms, tải 200 KiB/s. LCP/FCP 2308 / 2008 / 2012 ms; median 2012 ms. | Các lần đo trực tiếp cục bộ này nằm dưới 2.5 giây. Chúng không đại diện cho dữ liệu field hoặc p75 của người dùng thật. |
| Quan sát trace cục bộ không throttle trong Lighthouse | Candidate LCP là đoạn văn Dashboard `p.text-xs` (“Hệ thống đã sẵn sàng lộ trình HSK 1…”). TTFB quan sát 3.0–3.2 ms; render delay 298–313 ms. | Không có ảnh LCP cần tải; nội dung là text được render phía client. |

Trong lần Chrome cold chậm nhất, TTFB local là 297 ms; hai lần tiếp theo là 2–3 ms. Bundle chính kết thúc tải khoảng 1.34–1.63 giây, sau đó React và tác vụ main thread chạy trước khi đoạn văn xuất hiện tại 2.01–2.31 giây. Bằng chứng nghiêng về thời gian tải/chạy JavaScript và render phía client, không phải API/database chậm. Lighthouse báo CSS chính có 602 ms và stylesheet font 152 ms trong render-blocking insight; đây là một phần của critical path nhưng không giải thích toàn bộ chênh lệch.

Đã thử nghiệm riêng, không giữ thay đổi thử nghiệm trong source: inline CSS với API proxy đúng đưa Lighthouse xuống 3019 ms (vẫn trong dải đo cuối); trì hoãn tải companion 3D ba giây cho kết quả 3162 ms; `content-visibility:auto` cho khu vực analytics cho kết quả 3162 ms. Các thử nghiệm này không cho thấy cải thiện ổn định đủ lớn để biện minh cho thay đổi giao diện. Vì vậy chưa có sửa source mới chỉ để ép điểm Lighthouse. Lần tối ưu tiếp theo nên nhắm vào nội dung HTML ban đầu/chi phí khởi động client, rồi đo lại cùng cấu hình. Cách tách TTFB, resource delay và render delay theo [hướng dẫn LCP của web.dev](https://web.dev/articles/optimize-lcp) đã được áp dụng.

Không có CrUX hoặc RUM của production, nên chưa thể tuyên bố Core Web Vitals field đạt. Báo cáo Lighthouse mô phỏng 3.0–3.16 giây vẫn là một giới hạn lab cần theo dõi.

## Nội dung và curriculum

Quy trình kiểm tra bằng chứng đã mở lại đúng nhóm đủ điều kiện thay vì chặn toàn bộ. Migrations V14–V15 phát hành 491 mục từ batch legacy đã đối chiếu và 4 mục mới có nguồn; tổng cộng 495 mục. 69 mục legacy và một đề xuất khác vẫn pending. Không đưa Han-Viet hoặc ví dụ tùy chọn từ batch này vào nội dung đã phát hành. Luồng admin vẫn kiểm tra lại nguồn sau khi sửa mục đã phát hành; sửa nội dung làm mục rời khỏi learner visibility cho tới khi evidence được cập nhật và duyệt lại.

Checkpoint CTI HSK 3.0 bản 2025-11 ghi nhận 5,400 entry ở level 1–6; 412 identity được đối chiếu theo level chính và 4,988 ID chính thức chưa khớp. Các số nội bộ theo lesson không được gọi là phân bố HSK chính thức. Đây là checkpoint coverage, không phải tuyên bố curriculum đã đầy đủ; 42 mục chỉ map vào level 7–9 không tính vào tổng level 1–6. Dữ liệu checkpoint và hạn chế được ghi tại [curriculum coverage JSON](../Content/curriculum-coverage-checkpoint-2026-10-20.json).

## Kiểm chứng kỹ thuật

| Phạm vi | Kết quả |
|---|---|
| Frontend cài sạch | `npm ci` thành công, 161 package được cài, npm audit báo 0 vulnerability. |
| Frontend tests | `npm test`: 23 file Vitest, 170 test pass; Node test suite thêm 8 pass. |
| Frontend lint/build | `npm run lint` và `npm run build` đều pass. Bundle chính 351.19 KB (110.61 KB gzip), vendor Three 527.15 KB (130.65 KB gzip); build không báo chunk vượt 600 KB. 286 file trong `frontend/dist` trùng hash giữa repo và source snapshot dùng để chạy lệnh clean. |
| Backend H2 | 250 test, 0 fail/error, 3 skip có điều kiện; `BUILD SUCCESS`. |
| Backend PostgreSQL 16 | 250 test, 0 fail/error/skip, bao gồm ba rehearsal test; `BUILD SUCCESS`. |
| Migration và binary production | Fresh DB áp dụng V1–V15; DB nâng từ V13 áp dụng V14–V15. Hibernate validation, health HTTP 200 và API smoke 34 kiểm tra qua. Dùng locations mặc định, không thêm override chỉ để làm test pass. |
| Restore | Custom PostgreSQL dump được restore sang DB cô lập mới; 33 bảng đối chiếu fingerprint, Flyway có 15 migration thành công; SHA-256 dump `2c26cdbc620c978a8f9d49ffd979de710009bff57706c68bb08de9b1c54f1df6`. App production cũng khởi động và health 200 trên DB đã restore. |
| Browser | 15/15 hành trình pass; account switch không làm rò notebook giữa hai user; speech được hủy khi đổi route. Admin source-review flow pass và khôi phục dữ liệu kiểm thử. Ma trận gồm 108 ca (9 route × 6 nhãn viewport × 2 theme), không có lỗi JS hoặc horizontal overflow; đã lưu 36 ảnh. Nhãn “desktop 200% equivalent” là viewport reflow 720 px, không phải browser zoom 200%. |

Log và trace chi tiết nằm trong thư mục evidence local bị ignore `backups/evidence-recovery-2026-10-20/`; danh sách kết quả chính gồm `perf/cdp-mobile-lcp-cold-process.json`, `perf/FINAL-cold-{1,2,3}.json`, `backend-h2-verified.log`, `backend-pg-verified-2.log`, `api-verified-results.json`, `journeys/results.json`, `viewport-matrix/results.json`, `admin-evidence/results.json` và `account-audio/results.json`.

## Advisory và các cổng còn mở

Runtime hiện dùng Spring Framework 6.2.19 theo BOM Spring Boot 3.5. [CVE-2026-47884](https://spring.io/security/cve-2026-47884/) (Medium) và [CVE-2026-47890](https://spring.io/security/cve-2026-47890/) (Low) được ghi nhận trong [memo đánh giá](./spring-advisory-exception-2026-10-20.md). Test surface và route inventory hiện không thấy điều kiện MVC/XSLT hoặc SSE view cần để kích hoạt hai đường ảnh hưởng đã mô tả. Đây là ngoại lệ có thời hạn tới 2026-10-27, không phải tuyên bố không có CVE; đánh giá lại khi đổi BOM, MVC surface hoặc khi Spring phát hành bản vá phù hợp.

Trước deploy thật, cần hoàn tất kiểm tra trên máy đích tương đương: domain/TLS và security headers; allowlist CORS, trusted proxy và cookie secure; JWT/DB/Redis secrets trong secret store; DB/Redis private network và quyền tối thiểu; deploy/rollback; guest smoke trên hostname thật; log/alert; và backup/restore theo lịch. Provider settings không được đọc hoặc thay đổi trong lượt này.
