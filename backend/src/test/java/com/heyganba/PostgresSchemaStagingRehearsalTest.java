package com.heyganba;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;

import javax.sql.DataSource;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Opt-in disposable PostgreSQL rehearsal test for Milestone M2.1.1.
 * Only runs when -Dpostgres.rehearsal=true is provided to prevent touching local developer DB.
 * Validates isolated rehearsal databases without DROP DATABASE or flyway.clean().
 */
@EnabledIfSystemProperty(named = "postgres.rehearsal", matches = "true")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PostgresSchemaStagingRehearsalTest {

    private static final String DEFAULT_URL_A = "jdbc:postgresql://127.0.0.1:15432/heyganba_rehearsal_a";
    private static final String DEFAULT_URL_B = "jdbc:postgresql://127.0.0.1:15432/heyganba_rehearsal_b";
    private static final String DEFAULT_USER = "postgres";
    private static final String DEFAULT_PASS = "postgres";

    private String getUrlA() {
        return System.getProperty("postgres.rehearsal.urlA", DEFAULT_URL_A);
    }

    private String getUrlB() {
        return System.getProperty("postgres.rehearsal.urlB", DEFAULT_URL_B);
    }

    private String getDbUser() {
        return System.getProperty("postgres.rehearsal.user", DEFAULT_USER);
    }

    private String getDbPassword() {
        return System.getProperty("postgres.rehearsal.password", DEFAULT_PASS);
    }

    private String extractDatabaseName(String url) {
        int lastSlash = url.lastIndexOf('/');
        if (lastSlash < 0) {
            throw new IllegalArgumentException("Không thể trích xuất tên database từ URL: " + url);
        }
        String dbPart = url.substring(lastSlash + 1);
        int questionMark = dbPart.indexOf('?');
        return questionMark >= 0 ? dbPart.substring(0, questionMark) : dbPart;
    }

    private void validateRehearsalDatabaseUrl(String url, String expectedDbPrefix) {
        assertThat(url)
                .as("Rehearsal URL must be non-null")
                .isNotNull();
        assertThat(url)
                .as("Rehearsal URL must point to local loopback (127.0.0.1 or localhost) and match prefix: " + expectedDbPrefix)
                .matches("^jdbc:postgresql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/" + expectedDbPrefix + "[a-zA-Z0-9_]*$");
    }

    private void assertDatabaseEmpty(String url, String user, String pass) throws SQLException {
        try (Connection conn = DriverManager.getConnection(url, user, pass);
             Statement stmt = conn.createStatement()) {

            try (ResultSet rs = stmt.executeQuery("SELECT current_database()")) {
                assertThat(rs.next()).isTrue();
                String currentDb = rs.getString(1);
                assertThat(currentDb)
                        .as("Connected database must be a rehearsal database")
                        .startsWith("heyganba_rehearsal_");
            }

            // Kiểm tra TOÀN BỘ bảng trong schema public trước lần migrate đầu tiên
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")) {
                List<String> foundTables = new ArrayList<>();
                while (rs.next()) {
                    foundTables.add(rs.getString("table_name"));
                }
                if (!foundTables.isEmpty()) {
                    throw new IllegalStateException("Database " + url + " is NOT empty. Tìm thấy " + foundTables.size()
                            + " bảng trong schema 'public': " + foundTables + ". Dừng rehearsal để bảo vệ dữ liệu hiện có.");
                }
            }
        }
    }

    private String loadV4MigrationSql() throws Exception {
        try (InputStream is = getClass().getResourceAsStream("/db/migration-staging/V4__sample_lesson_greetings.sql")) {
            if (is == null) {
                throw new IllegalStateException("Không tìm thấy file db/migration-staging/V4__sample_lesson_greetings.sql trên classpath");
            }
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Test
    @Order(1)
    @DisplayName("Case A (Schema chính thức): Chỉ nạp db/migration (V1-V3), không có V4, lessons không có intro-greetings")
    void caseA_officialSchemaOnly() throws Exception {
        String urlA = getUrlA();
        String user = getDbUser();
        String pass = getDbPassword();

        validateRehearsalDatabaseUrl(urlA, "heyganba_rehearsal_a");
        assertDatabaseEmpty(urlA, user, pass);

        // Run Flyway with classpath:db/migration ONLY, cleanDisabled = true
        Flyway flyway = Flyway.configure()
                .dataSource(urlA, user, pass)
                .locations("classpath:db/migration")
                .cleanDisabled(true)
                .load();

        var result = flyway.migrate();
        assertThat(result.success).isTrue();
        assertThat(result.migrationsExecuted).isEqualTo(3);

        try (Connection conn = DriverManager.getConnection(urlA, user, pass);
             Statement stmt = conn.createStatement()) {

            // 1. flyway_schema_history has V1, V2, V3 and no V4
            try (ResultSet rs = stmt.executeQuery("SELECT version, success FROM flyway_schema_history ORDER BY installed_rank")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("version")).isEqualTo("1");
                assertThat(rs.getBoolean("success")).isTrue();

                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("version")).isEqualTo("2");
                assertThat(rs.getBoolean("success")).isTrue();

                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("version")).isEqualTo("3");
                assertThat(rs.getBoolean("success")).isTrue();

                assertThat(rs.next()).isFalse(); // Absolutely NO V4
            }

            // 2. Lessons table does NOT contain intro-greetings
            try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM lessons WHERE slug = 'intro-greetings'")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isEqualTo(0);
            }

            // 3. Pre-existing HSK1 lessons (1, 2, 3) contain 38 approved words
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT count(*) FROM vocabulary WHERE lesson_id IN (1, 2, 3) AND review_status = 'APPROVED'")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isEqualTo(38);
            }
        }
    }

    @Test
    @Order(2)
    @DisplayName("Case B (Schema local/staging): Nạp db/migration + db/migration-staging, V4 có 10 từ pending, sequence đồng bộ, SQL idempotent")
    void caseB_stagingSchemaWithV4() throws Exception {
        String urlB = getUrlB();
        String user = getDbUser();
        String pass = getDbPassword();

        validateRehearsalDatabaseUrl(urlB, "heyganba_rehearsal_b");
        assertDatabaseEmpty(urlB, user, pass);

        // Run Flyway with BOTH classpath:db/migration and classpath:db/migration-staging, cleanDisabled = true
        Flyway flyway = Flyway.configure()
                .dataSource(urlB, user, pass)
                .locations("classpath:db/migration", "classpath:db/migration-staging")
                .cleanDisabled(true)
                .load();

        var result = flyway.migrate();
        assertThat(result.success).isTrue();
        assertThat(result.migrationsExecuted).isEqualTo(4);

        try (Connection conn = DriverManager.getConnection(urlB, user, pass);
             Statement stmt = conn.createStatement()) {

            // 1. flyway_schema_history contains V1, V2, V3, and V4
            try (ResultSet rs = stmt.executeQuery("SELECT version, success FROM flyway_schema_history WHERE version = '4'")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getBoolean("success")).isTrue();
            }

            // 2. intro-greetings lesson exists
            long lessonId;
            try (ResultSet rs = stmt.executeQuery("SELECT id, slug, title FROM lessons WHERE slug = 'intro-greetings'")) {
                assertThat(rs.next()).isTrue();
                lessonId = rs.getLong("id");
                assertThat(rs.getString("title")).isEqualTo("Chào hỏi và giới thiệu bản thân");
            }

            // 3. Exactly 10 words for intro-greetings, all PENDING_REVIEW and needs_human_check = true
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT count(*) FROM vocabulary WHERE lesson_id = ? AND review_status = 'PENDING_REVIEW' AND needs_human_check = true")) {
                ps.setLong(1, lessonId);
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getInt(1)).isEqualTo(10);
                }
            }

            // Total words for intro-greetings is strictly 10
            try (PreparedStatement ps = conn.prepareStatement("SELECT count(*) FROM vocabulary WHERE lesson_id = ?")) {
                ps.setLong(1, lessonId);
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getInt(1)).isEqualTo(10);
                }
            }

            // 4. Pre-existing HSK1 lessons (1, 2, 3) remain APPROVED (38 authentic words unaffected by V4)
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT count(*) FROM vocabulary WHERE lesson_id IN (1, 2, 3) AND review_status = 'APPROVED'")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isEqualTo(38);
            }
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT count(*) FROM vocabulary WHERE lesson_id IN (1, 2, 3) AND review_status != 'APPROVED'")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isEqualTo(0);
            }

            // 5. Idempotency Check Part 1: Flyway re-run executes 0 new migrations on already migrated DB
            var reRunResult = flyway.migrate();
            assertThat(reRunResult.success).isTrue();
            assertThat(reRunResult.migrationsExecuted).isEqualTo(0);

            // 6. Idempotency Check Part 2: Re-executing full V4 SQL script directly causes 0 duplicate rows
            String fullV4Sql = loadV4MigrationSql();
            stmt.execute(fullV4Sql);

            // Assert lesson still exists as exactly 1 row
            try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM lessons WHERE slug = 'intro-greetings'")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isEqualTo(1);
            }

            // Assert vocabulary for this lesson is still strictly 10 rows
            try (PreparedStatement ps = conn.prepareStatement("SELECT count(*) FROM vocabulary WHERE lesson_id = ?")) {
                ps.setLong(1, lessonId);
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getInt(1)).isEqualTo(10);
                }
            }

            // 7. Sequence safety test: insert a new lesson without explicit ID; generated key must exceed MAX(id)
            long maxLessonIdBefore;
            try (ResultSet rs = stmt.executeQuery("SELECT COALESCE(MAX(id), 0) FROM lessons")) {
                assertThat(rs.next()).isTrue();
                maxLessonIdBefore = rs.getLong(1);
            }

            long generatedLessonId;
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO lessons (slug, title, description, curriculum_level, order_index) VALUES (?, ?, ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS)) {
                ps.setString(1, "auto-seq-test-lesson");
                ps.setString(2, "Bài Tự Sinh Sequence");
                ps.setString(3, "Mô tả test sequence");
                ps.setString(4, "HSK1");
                ps.setInt(5, 99);
                ps.executeUpdate();
                try (ResultSet generatedKeys = ps.getGeneratedKeys()) {
                    assertThat(generatedKeys.next()).isTrue();
                    generatedLessonId = generatedKeys.getLong(1);
                    assertThat(generatedLessonId).isGreaterThan(maxLessonIdBefore);
                }
            }

            // Vocabulary sequence safety test
            long maxVocabIdBefore;
            try (ResultSet rs = stmt.executeQuery("SELECT COALESCE(MAX(id), 0) FROM vocabulary")) {
                assertThat(rs.next()).isTrue();
                maxVocabIdBefore = rs.getLong(1);
            }

            long generatedVocabId;
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO vocabulary (word, traditional, pinyin, pinyin_normalized, han_viet, part_of_speech, meaning_vi, lesson_number, lesson_id, review_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS)) {
                ps.setString(1, "测试");
                ps.setString(2, "測試");
                ps.setString(3, "cèshì");
                ps.setString(4, "ceshi");
                ps.setString(5, "trắc thí");
                ps.setString(6, "Động từ");
                ps.setString(7, "Kiểm tra");
                ps.setInt(8, 1);
                ps.setLong(9, lessonId);
                ps.setString(10, "PENDING_REVIEW");
                ps.executeUpdate();
                try (ResultSet generatedKeys = ps.getGeneratedKeys()) {
                    assertThat(generatedKeys.next()).isTrue();
                    generatedVocabId = generatedKeys.getLong(1);
                    assertThat(generatedVocabId).isGreaterThan(maxVocabIdBefore);
                }
            }

            // Clean up the 2 test records generated by the sequence test
            try (PreparedStatement ps = conn.prepareStatement("DELETE FROM vocabulary WHERE id = ?")) {
                ps.setLong(1, generatedVocabId);
                ps.executeUpdate();
            }
            try (PreparedStatement ps = conn.prepareStatement("DELETE FROM lessons WHERE id = ?")) {
                ps.setLong(1, generatedLessonId);
                ps.executeUpdate();
            }
        }
    }

    @Test
    @Order(3)
    @DisplayName("Case C (Hibernate Validation): Thực sự khởi động Spring với PostgreSQL và ddl-auto=validate")
    void caseC_hibernateSchemaValidation() throws Exception {
        String urlB = getUrlB();
        String user = getDbUser();
        String pass = getDbPassword();

        validateRehearsalDatabaseUrl(urlB, "heyganba_rehearsal_b");
        String expectedDbNameB = extractDatabaseName(urlB);

        // Đảm bảo schema đã được migrate trên database B trước khi Spring Boot validate
        Flyway.configure()
                .dataSource(urlB, user, pass)
                .locations("classpath:db/migration", "classpath:db/migration-staging")
                .cleanDisabled(true)
                .load()
                .migrate();

        // Không dùng SpringApplicationBuilder.properties(...) làm cơ chế khoá datasource:
        // Truyền cấu hình rehearsal bắt buộc qua command-line arguments của .run(...) để có độ ưu tiên cao nhất.
        String[] cmdArgs = new String[] {
                "--spring.datasource.url=" + urlB,
                "--spring.datasource.username=" + user,
                "--spring.datasource.password=" + pass,
                "--spring.datasource.driver-class-name=org.postgresql.Driver",
                "--spring.jpa.hibernate.ddl-auto=validate",
                "--spring.jpa.open-in-view=false",
                "--spring.flyway.enabled=false",
                "--app.jwt.secret=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970",
                "--logging.level.org.hibernate.SQL=WARN"
        };

        // Initializer kiểm tra effective properties trước khi context refresh:
        // Bắt buộc datasource đúng urlB, ddl-auto=validate và Flyway tắt.
        // Bất kỳ sai lệch nào sẽ dừng ngay trước khi khởi tạo database beans.
        try (ConfigurableApplicationContext context = new SpringApplicationBuilder(HeyGanbaApplication.class)
                .web(WebApplicationType.NONE)
                .initializers(ctx -> {
                    Environment env = ctx.getEnvironment();
                    String effectiveUrl = env.getProperty("spring.datasource.url");
                    String effectiveDdlAuto = env.getProperty("spring.jpa.hibernate.ddl-auto");
                    String effectiveFlywayEnabled = env.getProperty("spring.flyway.enabled");

                    if (!urlB.equals(effectiveUrl)) {
                        throw new IllegalStateException("Effective spring.datasource.url không khớp với urlB đã xác thực: " + effectiveUrl);
                    }
                    if (!"validate".equalsIgnoreCase(effectiveDdlAuto)) {
                        throw new IllegalStateException("Effective spring.jpa.hibernate.ddl-auto bắt buộc là 'validate', nhưng thực tế là: " + effectiveDdlAuto);
                    }
                    if ("true".equalsIgnoreCase(effectiveFlywayEnabled)) {
                        throw new IllegalStateException("Flyway bắt buộc phải tắt trong rehearsal Hibernate validation, nhưng spring.flyway.enabled=true");
                    }
                })
                .run(cmdArgs)) {

            assertThat(context.isRunning()).isTrue();
            assertThat(context.containsBean("entityManagerFactory")).isTrue();

            // Kiểm tra database thực tế qua DataSource thực sự là database B
            DataSource dataSource = context.getBean(DataSource.class);
            try (Connection dsConn = dataSource.getConnection();
                 Statement dsStmt = dsConn.createStatement()) {

                try (ResultSet rs = dsStmt.executeQuery("SELECT current_database()")) {
                    assertThat(rs.next()).isTrue();
                    String actualDb = rs.getString(1);
                    assertThat(actualDb)
                            .as("DataSource connection must point directly to database B")
                            .isEqualTo(expectedDbNameB);
                }

                String metadataUrl = dsConn.getMetaData().getURL();
                assertThat(metadataUrl)
                        .as("DataSource JDBC URL must match validated urlB")
                        .isEqualTo(urlB);
            }
        }
    }
}
