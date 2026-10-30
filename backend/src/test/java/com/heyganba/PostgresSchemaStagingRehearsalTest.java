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
 * Opt-in disposable PostgreSQL rehearsal test for Milestones M2.1 & M2.2.
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

    private String loadStagingMigrationSql(String filename) throws Exception {
        try (InputStream is = getClass().getResourceAsStream("/db/migration-staging/" + filename)) {
            if (is == null) {
                throw new IllegalStateException("Không tìm thấy file db/migration-staging/" + filename + " trên classpath");
            }
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Test
    @Order(1)
    @DisplayName("Case A (Schema chính thức): Chỉ nạp db/migration (V1-V3), không có V4/V5, lessons không chứa bài staging")
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

            // 1. flyway_schema_history has V1, V2, V3 and no V4 or V5
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

                assertThat(rs.next()).isFalse(); // Absolutely NO V4 or V5
            }

            // 2. Lessons table does NOT contain staging lessons (M2.1, M2.2, V6, V7)
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT count(*) FROM lessons WHERE slug IN ('intro-greetings', 'family-members', 'time-calendar', 'dining-shopping', 'school-work-places', 'weather-health-daily', 'transport-directions', 'actions-courtesy-daily')")) {
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
    @DisplayName("Case B: Nạp V1-V23, kiểm tra nội dung HSK, trường tùy chọn và tính lặp an toàn")
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
                .target("12") // Verify legacy curriculum first, then the provenance upgrade below.
                .cleanDisabled(true)
                .load();

        var result = flyway.migrate();
        assertThat(result.success).isTrue();
        assertThat(result.migrationsExecuted).isEqualTo(12); // V1 through V12

        try (Connection conn = DriverManager.getConnection(urlB, user, pass);
             Statement stmt = conn.createStatement()) {

            // 1. flyway_schema_history contains every additive migration through V12.
            try (ResultSet rs = stmt.executeQuery("SELECT version, success FROM flyway_schema_history WHERE version IN ('4', '5', '6', '7', '8', '9', '10', '11', '12') ORDER BY CAST(version AS INTEGER)")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("version")).isEqualTo("4");
                assertThat(rs.getBoolean("success")).isTrue();

                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("version")).isEqualTo("5");
                assertThat(rs.getBoolean("success")).isTrue();

                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("version")).isEqualTo("6");
                assertThat(rs.getBoolean("success")).isTrue();

                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("version")).isEqualTo("7");
                assertThat(rs.getBoolean("success")).isTrue();

                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("version")).isEqualTo("8");
                assertThat(rs.getBoolean("success")).isTrue();
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("version")).isEqualTo("9");
                assertThat(rs.getBoolean("success")).isTrue();
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("version")).isEqualTo("10");
                assertThat(rs.getBoolean("success")).isTrue();
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("version")).isEqualTo("11");
                assertThat(rs.getBoolean("success")).isTrue();
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("version")).isEqualTo("12");
                assertThat(rs.getBoolean("success")).isTrue();
                assertThat(rs.next()).isFalse();
            }

            // 2. M2.1 sample lesson: intro-greetings (10 words)
            long introLessonId;
            try (ResultSet rs = stmt.executeQuery("SELECT id, slug, title FROM lessons WHERE slug = 'intro-greetings'")) {
                assertThat(rs.next()).isTrue();
                introLessonId = rs.getLong("id");
                assertThat(rs.getString("title")).isEqualTo("Chào hỏi và giới thiệu bản thân");
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT count(*) FROM vocabulary WHERE lesson_id = ? AND review_status = 'APPROVED' AND needs_human_check = false")) {
                ps.setLong(1, introLessonId);
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getInt(1)).isEqualTo(10);
                }
            }

            // 3. Staging thematic lessons across M2.2, V6, V7 & V8 (total 12 staging lessons)
            String[] stagingSlugs = {
                "family-members", "time-calendar", "dining-shopping",
                "school-work-places", "weather-health-daily",
                "transport-directions", "actions-courtesy-daily",
                "hsk2-travel-weather", "hsk2-sports-health",
                "hsk2-work-errands", "hsk2-comparisons-feelings"
            };
            int[] expectedCounts = {13, 14, 13, 16, 14, 16, 16, 17, 16, 17, 23};

            for (int i = 0; i < stagingSlugs.length; i++) {
                String slug = stagingSlugs[i];
                int expectedCount = expectedCounts[i];
                long lessonId;
                try (PreparedStatement ps = conn.prepareStatement("SELECT id FROM lessons WHERE slug = ?")) {
                    ps.setString(1, slug);
                    try (ResultSet rs = ps.executeQuery()) {
                        assertThat(rs.next()).as("Lesson %s must exist", slug).isTrue();
                        lessonId = rs.getLong("id");
                    }
                }
                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT count(*) FROM vocabulary WHERE lesson_id = ? AND review_status = 'APPROVED' AND needs_human_check = false")) {
                    ps.setLong(1, lessonId);
                    try (ResultSet rs = ps.executeQuery()) {
                        assertThat(rs.next()).isTrue();
                        assertThat(rs.getInt(1))
                                .as("Lesson %s must contain exactly %d approved words", slug, expectedCount)
                                .isEqualTo(expectedCount);
                    }
                }
            }

            // Milestone M5 auto-approval verification: 0 pending words remain in vocabulary
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT count(*) FROM vocabulary WHERE review_status = 'PENDING_REVIEW' OR needs_human_check = true")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isEqualTo(0);
            }

            // Total approved vocabulary reaches at least 218 (150 HSK 1 + 68 HSK 2)
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT count(*) FROM vocabulary WHERE review_status = 'APPROVED' AND needs_human_check = false")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(218);
            }

            // Total HSK 1 vocabulary reaches full 150 benchmark
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT count(*) FROM vocabulary WHERE hsk_level = 1")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isEqualTo(182);
            }

            // Total HSK 2 vocabulary reaches 68 words
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT count(*) FROM vocabulary WHERE hsk_level = 2")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(68);
            }

            // 4. Pre-existing HSK1 lessons (1, 2, 3) remain APPROVED (38 authentic words)
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT count(*) FROM vocabulary WHERE lesson_id IN (1, 2, 3) AND review_status = 'APPROVED'")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isEqualTo(38);
            }

            // Radicals table verification (20 foundational radicals seeded in V7)
            try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM radicals")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(20);
            }

            // 5. Idempotency Check Part 1: Flyway re-run executes 0 new migrations on already migrated DB
            var reRunResult = flyway.migrate();
            assertThat(reRunResult.success).isTrue();
            assertThat(reRunResult.migrationsExecuted).isEqualTo(0);

            // 6. Idempotency Check Part 2: Re-executing full V4, V5, V6, V7 & V8 SQL scripts directly causes 0 duplicate rows
            String[] tables = {"lessons", "vocabulary", "hanzi", "radicals", "grammar_rules", "grammar_exercises", "reading_passages", "mock_exams", "mock_exam_presets"};
            java.util.Map<String, Long> before = new java.util.HashMap<>();
            for (String table : tables) {
                try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM " + table)) { rs.next(); before.put(table, rs.getLong(1)); }
            }
            String[] migrations = {
                "V4__sample_lesson_greetings.sql", "V5__hsk1_thematic_curriculum_expansion.sql",
                "V6__hsk1_standard_course_grammar_and_exams.sql", "V7__hsk1_complete_150_vocab_and_hanzi_radicals.sql",
                "V8__hsk2_standard_course_and_approve_all_curriculum.sql", "V9__hsk1_to_hsk6_complete_curriculum_and_grammar.sql", "V10__learning_insights_and_sentence_order.sql",
                "V11__align_optional_content_nullability.sql", "V12__performance_indexes_and_constraints.sql"
            };
            for (int repeat = 0; repeat < 2; repeat++) {
                for (String migration : migrations) stmt.execute(loadStagingMigrationSql(migration));
                for (String table : tables) {
                    try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM " + table)) {
                        rs.next(); assertThat(rs.getLong(1)).as("Idempotency: %s", table).isEqualTo(before.get(table));
                    }
                }
            }
            for (int level = 1; level <= 6; level++) {
                for (String table : List.of("vocabulary", "grammar_rules", "hanzi", "reading_passages")) {
                    try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM " + table + " WHERE hsk_level = " + level + " AND review_status = 'APPROVED'")) {
                        rs.next(); assertThat(rs.getInt(1)).as("%s HSK %d", table, level).isPositive();
                        if (level >= 3 && table.equals("vocabulary")) assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(45);
                        if (level >= 3 && table.equals("grammar_rules")) assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(5);
                    }
                }
                try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM grammar_exercises e JOIN grammar_rules r ON r.id=e.grammar_rule_id WHERE r.hsk_level=" + level + " AND e.review_status='APPROVED' AND NOT e.needs_human_check")) {
                    rs.next(); assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(level >= 3 ? 10 : 1);
                }
            }
            for (String table : tables) {
                try (ResultSet rs = stmt.executeQuery("SELECT nextval(pg_get_serial_sequence('" + table + "','id')), COALESCE((SELECT MAX(id) FROM " + table + "),0)")) {
                    rs.next(); assertThat(rs.getLong(1)).as("Sequence: %s", table).isGreaterThan(rs.getLong(2));
                }
            }
            try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM mock_exam_presets WHERE review_status='APPROVED' AND maximum_score=CASE WHEN hsk_level<=2 THEN 200 ELSE 300 END AND passing_score=CASE WHEN hsk_level<=2 THEN 120 ELSE 180 END")) {
                rs.next(); assertThat(rs.getInt(1)).isEqualTo(6);
            }

            // Assert staging lessons still exist as exactly 12 rows (1 M2.1 + 3 M2.2 + 2 V6 + 2 V7 + 4 V8)
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT count(*) FROM lessons WHERE slug IN ('intro-greetings', 'family-members', 'time-calendar', 'dining-shopping', 'school-work-places', 'weather-health-daily', 'transport-directions', 'actions-courtesy-daily', 'hsk2-travel-weather', 'hsk2-sports-health', 'hsk2-work-errands', 'hsk2-comparisons-feelings')")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isEqualTo(12);
            }

            // Assert total pending words remain 0 after idempotent re-run
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT count(*) FROM vocabulary WHERE review_status = 'PENDING_REVIEW' OR needs_human_check = true")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isEqualTo(0);
            }

            // Assert total HSK 1 vocabulary still strictly 150 rows
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT count(*) FROM vocabulary WHERE hsk_level = 1")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isEqualTo(182);
            }

            // Assert total HSK 2 vocabulary still strictly at least 68 rows
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT count(*) FROM vocabulary WHERE hsk_level = 2")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(68);
            }

            // Assert V6 & V8 grammar rules and reading passages exist and are idempotent
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT count(*) FROM grammar_rules WHERE review_status = 'APPROVED'")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(12);
            }
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT count(*) FROM reading_passages WHERE review_status = 'APPROVED'")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(5);
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
                ps.setLong(9, introLessonId);
                ps.setString(10, "APPROVED");
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

            // Hanzi sequence safety test
            long maxHanziIdBefore;
            try (ResultSet rs = stmt.executeQuery("SELECT COALESCE(MAX(id), 0) FROM hanzi")) {
                assertThat(rs.next()).isTrue();
                maxHanziIdBefore = rs.getLong(1);
            }

            long generatedHanziId;
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO hanzi (character, traditional, pinyin, han_viet, radical, stroke_count, hsk_level, meaning_vi, review_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS)) {
                ps.setString(1, "龘");
                ps.setString(2, "試");
                ps.setString(3, "shì");
                ps.setString(4, "thí");
                ps.setString(5, "讠");
                ps.setInt(6, 8);
                ps.setInt(7, 1);
                ps.setString(8, "Thử, kiểm tra");
                ps.setString(9, "APPROVED");
                ps.executeUpdate();
                try (ResultSet generatedKeys = ps.getGeneratedKeys()) {
                    assertThat(generatedKeys.next()).isTrue();
                    generatedHanziId = generatedKeys.getLong(1);
                    assertThat(generatedHanziId).isGreaterThan(maxHanziIdBefore);
                }
            }

            try (PreparedStatement ps = conn.prepareStatement("DELETE FROM hanzi WHERE id = ?")) {
                ps.setLong(1, generatedHanziId);
                ps.executeUpdate();
            }

            try (PreparedStatement ps = conn.prepareStatement("DELETE FROM lessons WHERE id = ?")) {
                ps.setLong(1, generatedLessonId);
                ps.executeUpdate();
            }
        }
        // Upgrade the preserved legacy curriculum to the current publication policy.
        Flyway current = Flyway.configure().dataSource(urlB, user, pass)
                .locations("classpath:db/migration", "classpath:db/migration-staging").target("13").cleanDisabled(true).load();
        assertThat(current.migrate().migrationsExecuted).isEqualTo(1); // additive V13, no seed rewrite
        try (Connection conn = DriverManager.getConnection(urlB, user, pass); Statement stmt = conn.createStatement()) {
            try (ResultSet rs = stmt.executeQuery("SELECT count(*), count(*) FILTER (WHERE review_status='PENDING_REVIEW' AND needs_human_check), count(*) FILTER (WHERE review_status='APPROVED'), count(*) FILTER (WHERE curriculum_version='INTERNAL_SIX_LEVEL_SELECTION_V9') FROM vocabulary")) {
                rs.next(); assertThat(rs.getInt(1)).isEqualTo(560);
                assertThat(rs.getInt(2)).isEqualTo(560); assertThat(rs.getInt(3)).isZero();
                assertThat(rs.getInt(4)).isEqualTo(560);
            }
        }
        assertThat(current.migrate().migrationsExecuted).isZero();
        Flyway webPolicy = Flyway.configure().dataSource(urlB, user, pass)
                .locations("classpath:db/migration", "classpath:db/migration-staging").target("20").cleanDisabled(true).load();
        assertThat(webPolicy.migrate().migrationsExecuted).isEqualTo(7);
        try (Connection conn = DriverManager.getConnection(urlB, user, pass); Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT count(*), count(*) FILTER (WHERE review_status='APPROVED'), count(*) FILTER (WHERE review_status='PENDING_REVIEW'), count(*) FILTER (WHERE reviewed_by IS NOT NULL), count(*) FILTER (WHERE han_viet_verified OR example_verified), count(*) FILTER (WHERE han_viet IS NOT NULL OR sino_vietnamese IS NOT NULL OR example_zh IS NOT NULL OR example_sentence IS NOT NULL OR example_pinyin IS NOT NULL OR example_reading IS NOT NULL OR example_vi IS NOT NULL OR example_meaning IS NOT NULL) FROM vocabulary")) {
            assertThat(rs.next()).isTrue();
            assertThat(rs.getInt(1)).isEqualTo(627);
            assertThat(rs.getInt(2)).isEqualTo(558);
            assertThat(rs.getInt(3)).isEqualTo(69);
            assertThat(rs.getInt(4)).isZero(); // Web verification does not invent a human identity.
            assertThat(rs.getInt(5)).isZero(); // No unsupported optional field is marked verified.
            assertThat(rs.getInt(6)).isZero(); // V17 removes unsupported values and normalizes blank fields to NULL.
        }
        assertThat(webPolicy.migrate().migrationsExecuted).isZero();
        // Replaying the unpublished release scripts after later batches must
        // preserve all content, even when they share a curriculum version.
        try (Connection conn = DriverManager.getConnection(urlB, user, pass);
             Statement stmt = conn.createStatement()) {
            String fingerprintSql = "SELECT md5(string_agg(row_to_json(v)::text, E'\\n' ORDER BY v.id)) FROM vocabulary v";
            String beforeReplay;
            try (ResultSet rs = stmt.executeQuery(fingerprintSql)) {
                assertThat(rs.next()).isTrue();
                beforeReplay = rs.getString(1);
            }
            String[] replayScripts = {
                    "V17__clear_unverified_vocabulary_optional_fields.sql",
                    "V18__publish_hsk1_web_cross_checked_batch_02.sql",
                    "V19__publish_hsk1_web_cross_checked_batch_03.sql",
                    "V20__publish_hsk1_web_cross_checked_batch_04.sql"
            };
            for (int replay = 0; replay < 2; replay++) {
                for (String script : replayScripts) {
                    stmt.execute(loadStagingMigrationSql(script));
                }
            }
            try (ResultSet rs = stmt.executeQuery(fingerprintSql)) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString(1)).isEqualTo(beforeReplay);
            }
            try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM vocabulary_syllabus_classification")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).isEqualTo(63);
            }
        }
        Flyway resolution = Flyway.configure().dataSource(urlB, user, pass)
                .locations("classpath:db/migration", "classpath:db/migration-staging").cleanDisabled(true).load();
        assertThat(resolution.migrate().migrationsExecuted).isEqualTo(3);
        try (Connection conn = DriverManager.getConnection(urlB, user, pass); Statement stmt = conn.createStatement()) {
            String fingerprintSql = "SELECT md5(string_agg(row_to_json(v)::text, E'\\n' ORDER BY v.id)) FROM vocabulary v";
            String beforeReplay;
            try (ResultSet rs = stmt.executeQuery(fingerprintSql)) {
                assertThat(rs.next()).isTrue(); beforeReplay = rs.getString(1);
            }
            stmt.execute(loadStagingMigrationSql("V21__resolve_verified_pending_vocabulary.sql"));
            stmt.execute(loadStagingMigrationSql("V21__resolve_verified_pending_vocabulary.sql"));
            stmt.execute(loadStagingMigrationSql("V22__repair_hsk1_batch_text_encoding.sql"));
            stmt.execute(loadStagingMigrationSql("V22__repair_hsk1_batch_text_encoding.sql"));
            stmt.execute(loadStagingMigrationSql("V23__publish_hsk2_web_cross_checked_batch_01.sql"));
            stmt.execute(loadStagingMigrationSql("V23__publish_hsk2_web_cross_checked_batch_01.sql"));
            try (ResultSet rs = stmt.executeQuery(fingerprintSql)) {
                assertThat(rs.next()).isTrue(); assertThat(rs.getString(1)).isEqualTo(beforeReplay);
            }
            try (ResultSet rs = stmt.executeQuery("SELECT count(*),count(*) FILTER(WHERE review_status='APPROVED'),count(*) FILTER(WHERE review_status='PENDING_REVIEW') FROM vocabulary")) {
                assertThat(rs.next()).isTrue(); assertThat(rs.getInt(1)).isEqualTo(648);
                assertThat(rs.getInt(2)).isEqualTo(584); assertThat(rs.getInt(3)).isEqualTo(64);
            }
            try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM lessons l JOIN vocabulary v ON v.lesson_id=l.id WHERE l.slug='cti-hsk3-level2-verified-batch-01' AND v.review_status='APPROVED' AND v.hsk_level=2")) {
                assertThat(rs.next()).isTrue(); assertThat(rs.getInt(1)).isEqualTo(20);
            }
            try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM vocabulary WHERE curriculum_version='INTERNAL_WEB_SUPPLEMENT_2026_10_20' AND (position('?' in meaning_vi)>0 OR position('?' in part_of_speech)>0 OR traditional='?')")) {
                assertThat(rs.next()).isTrue(); assertThat(rs.getInt(1)).isZero();
            }
            try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM vocabulary WHERE word='只' AND pinyin='zhī' AND traditional='隻' AND meaning_vi='con (lượng từ cho động vật)' AND review_status='APPROVED'")) {
                assertThat(rs.next()).isTrue(); assertThat(rs.getInt(1)).isEqualTo(1);
            }
            try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM vocabulary_syllabus_classification WHERE official_level=2 AND syllabus_version='CTI_HSK_3.0_2025-11'")) {
                assertThat(rs.next()).isTrue(); assertThat(rs.getInt(1)).isEqualTo(20);
            }
        }
        assertThat(resolution.migrate().migrationsExecuted).isZero();
    }

    @Test
    @Order(3)
    @DisplayName("Case C: PostgreSQL Hibernate validation và kiểm tra policy/digest cho vocabulary đã đối chiếu")
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
            var vocabulary = context.getBean(com.heyganba.repository.VocabularyRepository.class);
            var policy = context.getBean(com.heyganba.service.VocabularyProvenanceService.class);
            var approved = vocabulary.findAll().stream()
                    .filter(v -> v.getReviewStatus() == com.heyganba.model.enums.ReviewStatus.APPROVED).toList();
            assertThat(approved).hasSize(584).allSatisfy(v -> {
                assertThat(policy.complete(v)).as("Policy and digest for vocabulary %s", v.getId()).isTrue();
                assertThat(v.getReviewedBy()).isNull();
                assertThat(v.publishedHanViet()).isNull();
                assertThat(v.publishedExampleSentence()).isNull();
                assertThat(v.publishedExampleReading()).isNull();
                assertThat(v.publishedExampleMeaning()).isNull();
            });
            try (var connection = context.getBean(javax.sql.DataSource.class).getConnection();
                 var statement = connection.createStatement();
                 var rows = statement.executeQuery("SELECT count(*) FROM vocabulary_syllabus_classification WHERE syllabus_version='CTI_HSK_3.0_2025-11' AND official_level=1")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getLong(1)).isEqualTo(66);
            }

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
