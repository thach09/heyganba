# Bảo mật và vận hành

Cập nhật 17/10/2026. Các kiểm soát trong repo cần đi kèm cấu hình môi trường thực tế. Test cục bộ không xác nhận DNS, chứng chỉ, WAF, firewall, lịch backup hoặc cảnh báo production đã được bật.

## Cấu hình triển khai

Mặc định backend là `prod`, JWT secret và mật khẩu DB phải lấy từ secret manager. `.env.example` chỉ chứa tên biến và ô trống. Profile `dev` là lựa chọn tường minh cho máy cục bộ, có secret phát triển công khai và cookie HTTP để chạy localhost; không dùng profile này trên Internet.

`docker-compose.yml` chỉ mở PostgreSQL, Redis và backend trên `127.0.0.1`. Mật khẩu khởi tạo Postgres, role ứng dụng, role migration và JWT phải được cung cấp trước khi chạy Compose. Đổi biến mật khẩu không tự đổi mật khẩu bên trong volume PostgreSQL đã có: thực hiện đổi role có kiểm soát trước khi cập nhật secret ứng dụng. Không xoá volume để đổi mật khẩu.

Ứng dụng dùng tài khoản DB riêng. Chạy `scripts/create-app-db-role.sql` bằng chủ sở hữu migration, truyền biến psql `app_role`, `app_password`, `migration_role` qua kênh bí mật. Role ứng dụng có CONNECT, USAGE schema, CRUD bảng, USAGE/SELECT sequence; không có quyền tạo DB/role, superuser hay CREATE schema. `SPRING_FLYWAY_USER/PASSWORD` dùng role migration riêng. Trên DB cũ phải kiểm tra cả quyền PUBLIC và quyền thừa kế trước khi coi role đã bị giới hạn.

Không có endpoint tải tệp lên. Multipart/Tomcat giới hạn 2MB; bộ lọc JSON có giới hạn chặt hơn là 64KB. Nếu thêm upload sau này, phải kiểm định magic bytes và định dạng; cấu hình dung lượng không thay thế kiểm định tệp.

## Reverse proxy và Cloudflare

`server.forward-headers-strategy=framework`. `TrustedProxyFilter` chạy trước `ForwardedHeaderFilter`; chỉ tin peer vật lý trong `TRUSTED_PROXY_CIDRS` hoặc dải Cloudflare đã lưu. Mặc định chỉ tin loopback. Khai báo chính xác IP/CIDR của proxy mà bạn kiểm soát, không dùng `0.0.0.0/0` hoặc toàn bộ mạng private một cách tuỳ tiện.

IP giới hạn tốc độ lấy từ hop không được tin cậy ở bên phải chuỗi X-Forwarded-For. Chỉ dùng CF-Connecting-IP khi đã xác minh hop Cloudflare. Header Forwarded, X-Real-IP và forwarded host bị loại; scheme chỉ nhận `http`/`https` từ peer được tin. Proxy gần ứng dụng phải ghi đè scheme và nối địa chỉ peer thật vào XFF. Đường đi thực tế Render/VPS cần kiểm tra trước khi mở public. Các danh sách [IPv4](https://www.cloudflare.com/ips-v4/) và [IPv6](https://www.cloudflare.com/ips-v6/) có thể đổi: rà lại khi thay ingress.

Ở Cloudflare: bật proxy DNS, SSL/TLS Full (strict), chứng chỉ hợp lệ ở origin; firewall chỉ cho Cloudflare/ingress được phép đến origin. Bật managed WAF rules, hạn chế bot và quy tắc rate limit cho `/api/v1/auth/login`, `/auth/register`, `/dictionary/search`. Bắt đầu bằng log/challenge để tránh chặn nhầm lớp học dùng chung NAT. Test rate limit theo tài khoản và IP qua chính domain public, gồm header giả. Không chỉ dựa vào việc ẩn IP origin.

Ứng dụng vẫn giữ limiter admin 30 lần ghi/phút/admin. Bộ giới hạn trong bộ nhớ chỉ áp dụng cho một instance; nếu mở rộng nhiều replica cần giới hạn chia sẻ hoặc WAF trước ingress. Redis SRS chưa tự động biến limiter thành limiter phân tán.

## Trình duyệt, phiên và lỗi

API trả CSP chỉ cho JSON (`default-src 'none'`), DENY, nosniff, referrer policy và Permissions-Policy. Frontend giữ script-src 'self', không thêm quyền script inline. Cập nhật connect-src trong `frontend/vercel.json` nếu đổi domain API. HSTS 1 năm + includeSubDomains + preload được cấu hình; chỉ đăng ký preload sau khi mọi subdomain thực sự hỗ trợ HTTPS. Header HSTS chỉ gửi qua HTTPS.

Refresh cookie HttpOnly, Secure ở prod, SameSite=Lax. Luồng refresh/logout bằng cookie tiếp tục kiểm tra Origin và header vận chuyển riêng; không bỏ bảo vệ này khi dùng JWT stateless. CORS chỉ nhận origin HTTP(S) tường minh trong danh sách. CORS không thay thế xác thực và không chặn các HTTP client bên ngoài trình duyệt.

SQL/DataAccess và lỗi chưa xử lý trả thông báo chung cùng `X-Correlation-ID`; chi tiết lỗi chỉ ở log máy chủ và Sentry. Cấu hình `SENTRY_DSN` backend, DSN public frontend nếu cần; không gửi PII/body theo mặc định. Chỉ người vận hành được xem log, đặt thời hạn lưu và lọc secret. Không bật DEBUG, Hibernate SQL/bind logging hoặc Spring request body logging ở production.

## Backup và phục hồi

PowerShell: `scripts/backup-postgres.ps1`, biến `PGDATABASE`, `PGUSER`, `PGHOST`, `PGPORT`, thông tin xác thực libpq. Có thể dùng `-ContainerName` với container cục bộ đã cấu hình xác thực. Unix: `scripts/backup-postgres.sh` dùng cùng biến libpq, `BACKUP_DIR`, `BACKUP_RETENTION_DAYS` (1–365, mặc định 14). Không đưa mật khẩu vào dòng lệnh hoặc repo; ưu tiên `.pgpass` với quyền chỉ chủ sở hữu hoặc secret manager.

Cả hai tạo dump custom có timestamp UTC, kiểm tra `pg_restore --list`, đổi tên từ `.partial` khi thành công; chỉ dọn file dump đúng mẫu của DB tương ứng trong thư mục backup đã xác định. PowerShell không dùng chuyển hướng stdout nhị phân của PS5. Script không tự cài lịch. Cài Task Scheduler hoặc cron chạy mỗi ngày, kiểm tra exit code, tuổi bản backup mới nhất và dung lượng đĩa; chuyển bản mã hoá sang lưu trữ ngoài máy. Tự đặt RPO/RTO và thời gian lưu theo nhu cầu thực tế.

Diễn tập mỗi tháng: tạo DB phục hồi mới, `pg_restore --no-owner --no-privileges --dbname=<DB mới> <dump>`, so số bảng/bản ghi, đăng nhập test và kiểm tra SRS/thi thử. Không restore đè production để thử. Dump custom cần phiên bản pg_restore tương thích. Backup role, cấu hình secret và tài nguyên ngoài DB riêng; pg_dump không chứa toàn bộ chúng.

Theo dõi tối thiểu: `/actuator/health`, tỷ lệ 5xx/latency, lỗi kết nối DB, failed login/429, backup age, CPU/RAM/disk, chứng chỉ sắp hết hạn. Thiết lập kênh cảnh báo và người nhận ở hệ thống vận hành; repo không tự gửi thông báo cho bất kỳ ai.

## Tài liệu nền

[OWASP HTTP headers](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html), [OWASP HSTS](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html), [Spring forwarded header trust boundary](https://docs.spring.io/spring-framework/docs/6.1.8/javadoc-api/org/springframework/web/filter/ForwardedHeaderFilter.html), [Vite 8 migration](https://vite.dev/guide/migration.html). Vite 8 dùng Rolldown `dropConsole/dropDebugger`; cấu hình esbuild.drop cũ trong prompt đã được thay bằng cấu hình tương đương cho phiên bản đang cài.
