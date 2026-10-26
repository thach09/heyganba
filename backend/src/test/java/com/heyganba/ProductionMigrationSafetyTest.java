package com.heyganba;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

/** Opt-in only; no clean/drop/reset and no non-loopback or non-audit database URLs. */
@EnabledIfSystemProperty(named="postgres.production-rehearsal", matches="true",
        disabledReason="Requires three empty loopback heyganba_release_* databases; never uses a default datasource")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ProductionMigrationSafetyTest {
    private String fresh, upgrade, failure, user, password;
    private JsonNode manifest;
    @BeforeAll void guardAndCheckEmptyDatabases() throws Exception {
        fresh = guarded("fresh"); upgrade = guarded("upgrade"); failure = guarded("failure");
        assertThat(Set.of(fresh, upgrade, failure)).hasSize(3);
        user = System.getProperty("postgres.rehearsal.user"); password = System.getProperty("postgres.rehearsal.password");
        assertThat(user).isNotBlank(); assertThat(password).isNotNull();
        for (String url : List.of(fresh, upgrade, failure))
            assertThat(scalar(url, "SELECT count(*)::text FROM information_schema.tables WHERE table_schema='public'"))
                    .as("Audit database must be empty before initial migration").isEqualTo("0");
        try (var in = getClass().getResourceAsStream("/db/release-migrations-manifest.json")) {
            manifest = new ObjectMapper().readTree(in);
        }
    }
    private String guarded(String kind) {
        String value = System.getProperty("postgres.release." + kind);
        assertThat(value).matches("jdbc:postgresql://(?:127[.]0[.]0[.]1|localhost):[0-9]+/heyganba_release_" + kind + "(?:_[a-zA-Z0-9_]+)?");
        return value;
    }
    private Flyway migrations(String url, String... locations) {
        return Flyway.configure().dataSource(url, user, password).locations(locations).cleanDisabled(true)
                .baselineOnMigrate(false).ignoreMigrationPatterns(new String[0]).load();
    }
    private Flyway release(String url) { return migrations(url, "classpath:db/migration", "classpath:db/migration-release"); }
    private Connection connect(String url) throws SQLException { return DriverManager.getConnection(url, user, password); }
    private String scalar(String url, String sql) throws SQLException {
        try (var connection=connect(url); var statement=connection.createStatement(); var rows=statement.executeQuery(sql)) {
            assertThat(rows.next()).isTrue(); return rows.getString(1);
        }
    }
    private void execute(String url, String sql) throws SQLException {
        try (var connection=connect(url); var statement=connection.createStatement()) { statement.execute(sql); }
    }
    private void assertHistory(String url) throws Exception {
        Map<String,Integer> expected = new HashMap<>();
        for (JsonNode item : manifest.path("migrations")) expected.put(item.path("version").asText(), item.path("flywayChecksum").asInt());
        Map<String,Integer> actual = new HashMap<>();
        try (var connection=connect(url); var statement=connection.createStatement();
             var rows=statement.executeQuery("SELECT version, checksum FROM flyway_schema_history WHERE success=true AND version IS NOT NULL")) {
            while (rows.next()) actual.put(rows.getString(1), rows.getInt(2));
        }
        assertThat(actual).containsExactlyInAnyOrderEntriesOf(expected);
        assertThat(release(url).validateWithResult().validationSuccessful).isTrue();
    }
    private void productionContext(String url) {
        byte[] secret = new byte[64]; new java.security.SecureRandom().nextBytes(secret);
        try (var context = new SpringApplicationBuilder(HeyGanbaApplication.class).web(WebApplicationType.SERVLET)
                .run("--spring.profiles.active=prod", "--server.address=127.0.0.1", "--server.port=0",
                     "--management.server.address=127.0.0.1", "--management.server.port=0", "--sentry.dsn=",
                     "--spring.datasource.url=" + url, "--spring.datasource.username=" + user,
                     "--spring.datasource.password=" + password, "--spring.datasource.driver-class-name=org.postgresql.Driver",
                     "--spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect", "--spring.jpa.hibernate.ddl-auto=validate",
                     "--spring.jpa.open-in-view=false", "--spring.flyway.enabled=true",
                     "--app.jwt.secret=" + Base64.getEncoder().encodeToString(secret), "--app.srs.cache=memory",
                     "--app.vocabulary.publication.catalog=", "--app.cors.allowed-origins=https://audit.invalid",
                     "--logging.level.org.hibernate.SQL=WARN")) {
            assertThat(context.getEnvironment().getActiveProfiles()).containsExactly("prod");
            assertThat(context.getEnvironment().getProperty("spring.datasource.url")).isEqualTo(url);
            assertThat(context.getEnvironment().getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("validate");
            var indicator = context.getBean(org.springframework.boot.actuate.health.HealthContributorRegistry.class).getContributor("db");
            assertThat(indicator).isInstanceOf(org.springframework.boot.actuate.health.HealthIndicator.class);
            assertThat(((org.springframework.boot.actuate.health.HealthIndicator) indicator).health().getStatus())
                    .isEqualTo(org.springframework.boot.actuate.health.Status.UP);
            assertThat(context.getBean(com.heyganba.service.VocabularyService.class).getLessons()).isEmpty();
        }
    }
    @Test @Order(1) void freshProductionInstallChecksumsConstraintsAndConcurrentReruns() throws Exception {
        assertThat(release(fresh).migrate().migrationsExecuted).isEqualTo(14); assertHistory(fresh);
        assertThat(scalar(fresh, "SELECT count(*)::text FROM vocabulary WHERE review_status='APPROVED'")).isEqualTo("0");
        assertThat(scalar(fresh, "SELECT count(*)::text FROM pg_indexes WHERE indexname IN ('idx_vocab_hsk_status','idx_vocab_pinyin_norm','idx_daily_quest_claims_user_date')")).isEqualTo("3");
        assertThat(scalar(fresh, "SELECT count(*)::text FROM pg_constraint WHERE conname IN ('uq_daily_quest_claim','uq_notebook_vocab','uq_exam_result_exam')")).isEqualTo("3");
        assertThat(Integer.parseInt(scalar(fresh, "SELECT count(*)::text FROM pg_constraint WHERE conrelid='vocabulary'::regclass AND contype='f'"))).isGreaterThan(0);
        String count = scalar(fresh, "SELECT count(*)::text FROM vocabulary");
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> release(fresh).migrate().migrationsExecuted);
            var b = executor.submit(() -> release(fresh).migrate().migrationsExecuted);
            assertThat(a.get(30, TimeUnit.SECONDS)).isZero(); assertThat(b.get(30, TimeUnit.SECONDS)).isZero();
        }
        assertThat(scalar(fresh, "SELECT count(*)::text FROM vocabulary")).isEqualTo(count);
        productionContext(fresh);
    }
    @Test @Order(2) void upgradeFromV11PreservesAuthoritativeLearningDataAndAcademicFields() throws Exception {
        var baseline = Flyway.configure().dataSource(upgrade, user, password)
                .locations("classpath:db/migration", "classpath:db/migration-release").target("11")
                .cleanDisabled(true).baselineOnMigrate(false).load();
        assertThat(baseline.migrate().migrationsExecuted).isEqualTo(11);
        execute(upgrade, "INSERT INTO users(email,password_hash,full_name,role_id) SELECT 'release-audit@fixture.invalid','NOT_A_REAL_CREDENTIAL','Fixture',id FROM roles WHERE name='ROLE_USER'");
        execute(upgrade, "INSERT INTO vocab_notebooks(user_id,title,is_public_sample) SELECT id,'Fixture',false FROM users WHERE email='release-audit@fixture.invalid'");
        execute(upgrade, "INSERT INTO vocab_notebook_items(notebook_id,vocabulary_id) SELECT (SELECT id FROM vocab_notebooks WHERE title='Fixture'),min(id) FROM vocabulary");
        execute(upgrade, "INSERT INTO srs_reviews(user_id,vocabulary_id,due_date) SELECT (SELECT id FROM users WHERE email='release-audit@fixture.invalid'),min(id),now() FROM vocabulary");
        execute(upgrade, "INSERT INTO mock_exams(user_id,total_questions,duration_minutes,status,questions_json,started_at) SELECT id,1,10,'IN_PROGRESS','[]',now() FROM users WHERE email='release-audit@fixture.invalid'");
        Map<String,String> fingerprints = new HashMap<>();
        for (String table : List.of("users","vocab_notebooks","vocab_notebook_items","srs_reviews","mock_exams"))
            fingerprints.put(table, scalar(upgrade, "SELECT md5(COALESCE(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) FROM " + table + " t"));
        String academicSql = "SELECT md5(string_agg(jsonb_build_array(id,word,traditional,pinyin,reading,han_viet,sino_vietnamese,part_of_speech,meaning_vi,meaning,example_zh,example_sentence,example_pinyin,example_reading,example_vi,example_meaning,hsk_level,lesson_number,lesson_id,created_at)::text,'' ORDER BY id)) FROM vocabulary";
        String academic = scalar(upgrade, academicSql);
        assertThat(release(upgrade).migrate().migrationsExecuted).isEqualTo(3); assertHistory(upgrade);
        assertThat(scalar(upgrade, academicSql)).isEqualTo(academic);
        for (var entry : fingerprints.entrySet()) assertThat(scalar(upgrade,
                "SELECT md5(COALESCE(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) FROM " + entry.getKey() + " t")).isEqualTo(entry.getValue());
        assertThat(scalar(upgrade, "SELECT count(*)::text FROM srs_reviews")).isEqualTo("1");
        assertThat(scalar(upgrade, "SELECT count(*)::text FROM vocabulary WHERE review_status='APPROVED'")).isEqualTo("0");
        productionContext(upgrade);
    }
    @Test @Order(3) void interruptedUpgradeRollsBackAndAllowsForwardRecovery() throws Exception {
        release(failure).migrate();
        Path folder = Files.createTempDirectory("heyganba-interrupted-migration-");
        Path broken = folder.resolve("V999__synthetic_interruption.sql");
        Files.writeString(broken, "CREATE TABLE synthetic_interruption(id INT PRIMARY KEY); SELECT pg_terminate_backend(pg_backend_pid());");
        var interrupted = migrations(failure,"classpath:db/migration","classpath:db/migration-release","filesystem:" + folder.toString().replace('\\','/'));
        assertThatThrownBy(interrupted::migrate).isInstanceOf(FlywayException.class)
                .hasStackTraceContaining("terminating connection");
        assertThat(scalar(failure,"SELECT to_regclass('public.synthetic_interruption') IS NULL")).isEqualTo("t");
        assertThat(scalar(failure,"SELECT count(*)::text FROM flyway_schema_history WHERE version='999'")).isEqualTo("0");
        Files.delete(broken); // failed/unapplied synthetic fixture only, never applied release history
        assertThat(release(failure).migrate().migrationsExecuted).isZero();
        Files.writeString(folder.resolve("V1000__synthetic_forward_recovery.sql"),"CREATE TABLE synthetic_recovered(id INT PRIMARY KEY);");
        assertThat(migrations(failure,"classpath:db/migration","classpath:db/migration-release","filesystem:" + folder.toString().replace('\\','/')).migrate().migrationsExecuted).isEqualTo(1);
        assertThat(scalar(failure,"SELECT to_regclass('public.synthetic_recovered') IS NOT NULL")).isEqualTo("t");
        assertThat(release(failure).validateWithResult().validationSuccessful).isFalse();
    }
    @Test @Order(4) void changedChecksumIsRejectedWithoutChangingDatabaseHistory() throws Exception {
        Path folder = Files.createTempDirectory("heyganba-migration-checksum-");
        for (JsonNode item : manifest.path("migrations")) {
            try (var in = getClass().getResourceAsStream("/" + item.path("packagedPath").asText())) {
                Files.write(folder.resolve(item.path("fileName").asText()), in.readAllBytes());
            }
        }
        Path changed=folder.resolve("V12__performance_indexes_and_constraints.sql");
        Files.writeString(changed, "\n-- synthetic tamper fixture", StandardOpenOption.APPEND);
        var invalid = migrations(fresh,"filesystem:" + folder.toString().replace('\\','/')).validateWithResult();
        assertThat(invalid.validationSuccessful).isFalse();
        assertThat(invalid.invalidMigrations).anySatisfy(item -> assertThat(item.errorDetails.errorCode.toString()).contains("CHECKSUM"));
        assertHistory(fresh);
    }
}
