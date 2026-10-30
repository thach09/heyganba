# Sửa Backend Migration Check — PR #39 / f6c9ea7

Ngày kiểm chứng: 18/10/2026. Nền mã: `f6c9ea70101e473ccf4e760bfb3a53e6972a399a`.

## Lỗi tái hiện được

Job `backend-migration-check` thực tế chạy **`mvn -B test`**, không có `-Dtest`. Các biến môi trường của job được giữ nguyên trong bản sửa:

```powershell
$env:SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:5432/heyganba_migrationcheck'
$env:SPRING_DATASOURCE_USERNAME='postgres'
$env:SPRING_DATASOURCE_PASSWORD='postgres'
$env:SPRING_DATASOURCE_DRIVER_CLASS_NAME='org.postgresql.Driver'
$env:SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT='org.hibernate.dialect.PostgreSQLDialect'
$env:SPRING_JPA_HIBERNATE_DDL_AUTO='validate'
$env:SPRING_FLYWAY_ENABLED='true'
$env:SPRING_FLYWAY_LOCATIONS='classpath:db/migration,classpath:db/migration-staging'
$env:SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE='5'
mvn -B test
```

Username/password ở trên là thông tin của PostgreSQL service dùng riêng cho CI, không phải credential triển khai.

Tái hiện trên PostgreSQL **16.15** (`postgres:16-alpine`), Java 21, Maven 3.9.16, database mới và worktree riêng để IDE không ghi đè bytecode trong `target`. Không thêm cờ Maven thay đổi output hoặc bỏ test. Biến DEBUG riêng của máy được bỏ khỏi process để khớp CI.

Lượt trước sửa: **BUILD FAILURE**, 254 test, 4 failure, 73 error, 4 skip. Flyway áp V1–V10 được và các Spring context khởi động được. Lỗi xảy ra ở INSERT thực tế, PostgreSQL SQLSTATE `23502`:

| Bảng | Cột optional trong entity nhưng NOT NULL trong V1 |
| --- | --- |
| vocabulary | pinyin, pinyin_normalized, han_viet, meaning_vi |
| hanzi | pinyin, han_viet, meaning_vi |
| grammar_rules | examples_json |

Hibernate gửi `NULL` tường minh cho trường bị bỏ qua; `DEFAULT ''` / `DEFAULT '[]'` trong SQL không thay thế giá trị NULL đó. Hibernate schema validation kiểm kiểu/cột nhưng không phát hiện sai lệch nullability này. H2 tạo schema theo entity nullable nên không gặp lỗi. Bốn lỗi API 500 trong dictionary là hệ quả của INSERT vocabulary thất bại, không phải lỗi xác thực.

## Đối chiếu ba giả thuyết

- **A — override môi trường:** không phải nguyên nhân của lượt lỗi này. `FlywayLocationsConfigTest` đọc resource YAML trực tiếp và cả 4 ca đã pass với nguyên env CI. Rehearsal cũ bị skip vì thiếu `-Dpostgres.rehearsal=true`. Khi bật đúng, Case A dùng `.locations("classpath:db/migration")` trực tiếp; Case C khoá datasource/Flyway bằng command-line arguments và kiểm tra effective properties. Cả A/B/C đã chạy thành công ngay cả khi env job vẫn chỉ định cả hai locations.
- **B — schema/entity:** nguyên nhân là nullability ở bảng trên. V9/V10 đã dùng `IF NOT EXISTS` cho các cột/bảng trùng với V1; không tái hiện duplicate-column/table hay type mismatch ở commit này. Hibernate validation toàn bộ entity pass trên schema V1–V11.
- **C — thiếu cấu hình startup:** không tái hiện. API suite dùng JWT/CORS từ profile test; Case C cung cấp JWT test qua arguments và dùng CORS/trusted-proxy defaults hợp lệ. Không cần thêm secret production vào CI.

## Bản sửa

1. Thêm **V11__align_optional_content_nullability.sql**: cho phép NULL đúng tám trường optional đang được entity cho phép. Giữ nguyên dữ liệu, giá trị DEFAULT và ràng buộc bắt buộc như word/character/title/structure/explanation. Không sửa V1–V10, không dùng Flyway repair/clean và không thay đổi trạng thái duyệt nội dung.
2. Thêm `ContentPersistenceContractTest`: ba ca INSERT/đọc lại vocabulary compatibility, Hanzi draft và grammar draft thiếu trường optional. Chạy trên cả H2 và PostgreSQL; kiểm dữ liệu vẫn `PENDING_REVIEW` và getter fallback được giữ nguyên.
3. Giữ nguyên toàn bộ API suite PostgreSQL và lệnh `mvn -B test`; không thu hẹp test để né lỗi. CI thêm hai database rehearsal riêng, bật A/B/C và upload Surefire artifact khi thành công hoặc thất bại.
4. Cập nhật rehearsal nhận V11, kiểm history và chạy lại V4–V11 hai lần. Script PowerShell cập nhật nhãn V11, giữ UTF-8 BOM cho PS5.

Lệnh rehearsal bổ sung trong job (sau khi tạo hai database rỗng bằng `createdb` trong PostgreSQL service):

```bash
mvn -B test -Dtest=PostgresSchemaStagingRehearsalTest \
  -Dpostgres.rehearsal=true \
  -Dpostgres.rehearsal.urlA=jdbc:postgresql://localhost:5432/heyganba_rehearsal_a_ci \
  -Dpostgres.rehearsal.urlB=jdbc:postgresql://localhost:5432/heyganba_rehearsal_b_ci \
  -Dpostgres.rehearsal.user=postgres \
  -Dpostgres.rehearsal.password=postgres
```

## Kết quả cuối

| Kiểm tra | Kết quả |
| --- | --- |
| Exact CI `mvn -B test` + nguyên env, PostgreSQL mới | BUILD SUCCESS, exit 0; 257 test, 0 failure/error, 4 opt-in skip |
| Exact rehearsal command + nguyên env CI | BUILD SUCCESS, exit 0; 3 test, 0 failure/error/skip |
| Case A | Chỉ V1–V3; không nạp seed staging |
| Case B | V1–V11; seed/sequence/history, migrate lại 0 migration mới, chạy lại SQL hai lần không tăng dữ liệu |
| Case C | Spring khởi động thật, đúng database B, Flyway tắt theo argument và Hibernate ddl-auto=validate |
| H2 `mvn -B clean verify` | BUILD SUCCESS, exit 0; 257 test, 0 failure/error, 4 opt-in skip |

Bốn skip trong full suite gồm ba ca PostgreSQL rehearsal (đã chạy riêng đủ 3/3 ở bước sau) và một pilot dictionary lịch sử chưa bật. Job PostgreSQL mới vì thế thực thi cả API suite lẫn rehearsal, không coi rehearsal bị skip là bằng chứng migration đã được kiểm tra.

Log và Surefire XML được lưu trong `backups/ci-migration-f6c9ea7-*` (Git ignore). Database kiểm thử và worktree tạm đã được dọn sau kiểm chứng; không sửa dữ liệu ứng dụng hiện có và không dừng container PostgreSQL của workspace. Không sửa frontend. Chưa commit/push hoặc chạy lại Actions trên GitHub; kết quả trên là chạy cục bộ đúng command/env của job.
