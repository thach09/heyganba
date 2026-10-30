package com.heyganba.config;

import com.heyganba.HeyGanbaApplication;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.boot.builder.SpringApplicationBuilder;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import static org.assertj.core.api.Assertions.*;

/** Explicitly opt-in; every URL checked before opening a connection. No shared DBs. */
@EnabledIfSystemProperty(named = "jiayou.bootstrap.rehearsal", matches = "true")
class JiayouBootstrapPostgresTest {
    private String url(String suffix) {
        String base = System.getProperty("jiayou.bootstrap.url", "");
        assertThat(base).matches("^jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/jiayou_bootstrap_[a-z0-9]+_a$");
        return base.substring(0, base.length() - 1) + suffix;
    }

    private Connection connection(String db) throws Exception {
        return DriverManager.getConnection(url(db), "postgres", password());
    }

    private String password() { return System.getProperty("jiayou.bootstrap.password", "local_jiayou_rehearsal"); }

    private Map<String, String> settings(String db, String mode) {
        var p = JiayouBootstrapGuardTest.settings(url(db), mode);
        for (String key : new String[]{"JIAYOU_DATABASE_PASSWORD", "spring.datasource.password", "spring.flyway.password"}) p.put(key, password());
        return p;
    }

    private Flyway flyway(String db) {
        return Flyway.configure().dataSource(url(db), "postgres", password())
                .locations(JiayouBootstrapGuard.LOCATION).defaultSchema("public").schemas("public")
                .table("jiayou_schema_history").createSchemas(false).baselineOnMigrate(false).cleanDisabled(true)
                .placeholders(Map.of("jiayouTargetId", JiayouBootstrapGuardTest.TARGET)).load();
    }

    private void run(String db, String mode) {
        new JiayouBootstrapGuard(JiayouBootstrapGuardTest.environment(settings(db, mode))).run(flyway(db));
    }

    private String scalar(String db, String sql) throws Exception {
        try (var c = connection(db); var s = c.createStatement(); var r = s.executeQuery(sql)) {
            assertThat(r.next()).isTrue(); return r.getString(1);
        }
    }

    private void sql(String db, String sql) throws Exception {
        try (var c = connection(db); var s = c.createStatement()) { s.execute(sql); }
    }

    private Map<String, List<String>> snapshot(String db) throws Exception {
        Map<String, List<String>> result = new TreeMap<>();
        try (var c = connection(db); var s = c.createStatement(); var tables = s.executeQuery("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")) {
            while (tables.next()) {
                String name = tables.getString(1); List<String> rows = new ArrayList<>();
                try (var q = c.createStatement(); var values = q.executeQuery("SELECT row_to_json(t)::text FROM public.\"" + name + "\" t ORDER BY row_to_json(t)::text")) {
                    while (values.next()) rows.add(values.getString(1));
                }
                result.put(name, rows);
            }
        }
        result.put("columns", List.of(String.valueOf(scalar(db, "SELECT string_agg(table_name||'.'||column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,''),',' ORDER BY table_name,ordinal_position) FROM information_schema.columns WHERE table_schema='public'"))));
        result.put("sequences", List.of(String.valueOf(scalar(db, "SELECT string_agg(sequencename||':'||coalesce(last_value::text,''),',' ORDER BY sequencename) FROM pg_sequences WHERE schemaname='public'"))));
        return result;
    }

    private void startApplication(String db, String mode) {
        var settings = settings(db, mode);
        // CLI properties outrank application.yml; actual jiayou-prod YAML is loaded.
        var args = new ArrayList<String>();
        for (var entry : settings.entrySet()) if (entry.getKey().startsWith("JIAYOU_")) args.add("--" + entry.getKey() + "=" + entry.getValue());
        args.addAll(List.of("--spring.profiles.active=jiayou-prod", "--server.port=0", "--server.address=127.0.0.1", "--spring.main.banner-mode=off",
                "--app.tts.enabled=false", "--logging.level.root=WARN"));
        try (var context = new SpringApplicationBuilder(HeyGanbaApplication.class).run(args.toArray(String[]::new))) {
            assertThat(context.getBean(jakarta.persistence.EntityManagerFactory.class).isOpen()).isTrue();
        }
    }

    @Test
    void actualApplicationInitializesAndValidatesAgainWithoutWrites() throws Exception {
        assertThat(scalar("a", "SELECT count(*) FROM pg_tables WHERE schemaname='public'")).isEqualTo("0");
        startApplication("a", "initialize");
        assertThat(scalar("a", "SELECT count(*) FROM roles")).isEqualTo("2");
        for (String table : new String[]{"users", "lessons", "vocabulary", "hanzi", "radicals", "grammar_rules", "grammar_exercises", "reading_passages", "mock_exam_presets", "kana", "dictionary_entries"}) {
            assertThat(scalar("a", "SELECT count(*) FROM " + table)).as(table).isEqualTo("0");
        }
        assertThat(scalar("a", "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND column_name='review_status' AND column_default NOT LIKE '%PENDING_REVIEW%'")).isEqualTo("0");
        // Raw SQL cannot silently publish via a default or the legacy admin shortcut.
        try (var c = connection("a")) {
            c.setAutoCommit(false);
            try (var s = c.createStatement()) {
                s.execute("INSERT INTO vocabulary(word) VALUES ('local_fixture_only')");
                try (var row = s.executeQuery("SELECT review_status FROM vocabulary")) {
                    assertThat(row.next()).isTrue(); assertThat(row.getString(1)).isEqualTo("PENDING_REVIEW");
                }
                assertThatThrownBy(() -> s.execute("UPDATE vocabulary SET review_status='APPROVED'")).isInstanceOf(java.sql.SQLException.class);
            } finally { c.rollback(); }
        }
        Map<String, List<String>> before = snapshot("a");
        startApplication("a", "validate");
        assertThat(snapshot("a")).isEqualTo(before);
        assertThatThrownBy(() -> run("a", "initialize")).hasMessageContaining("nonempty");
        assertThat(snapshot("a")).isEqualTo(before);
    }

    @Test
    void rejectsNonemptyLegacyAndWrongTargetWithoutChanges() throws Exception {
        sql("legacy", "CREATE TABLE flyway_schema_history(version text, checksum int); INSERT INTO flyway_schema_history VALUES ('31',123); CREATE TABLE users(id bigint)");
        sql("nonempty", "CREATE SEQUENCE unrelated_sequence");
        for (String db : new String[]{"legacy", "nonempty"}) {
            var before = snapshot(db);
            assertThatThrownBy(() -> run(db, "initialize")).hasMessageContaining("nonempty");
            assertThat(snapshot(db)).isEqualTo(before);
        }
        var bad = settings("wrong", "initialize");
        bad.put("JIAYOU_DATABASE_NAME", "jiayou_something_else");
        assertThatThrownBy(() -> new JiayouBootstrapGuard(JiayouBootstrapGuardTest.environment(bad)).run(flyway("wrong"))).hasMessageContaining("database name");
        assertThat(scalar("wrong", "SELECT count(*) FROM pg_tables WHERE schemaname='public'")).isEqualTo("0");
        var correct = JiayouBootstrapGuardTest.environment(settings("wrong", "initialize"));
        var before = snapshot("legacy");
        assertThatThrownBy(() -> new JiayouBootstrapGuard(correct).run(flyway("legacy"))).hasMessageContaining("actual datasource URL");
        assertThat(snapshot("legacy")).isEqualTo(before);
    }

    @Test
    void rejectsForeignObjectsAndUnknownLineageOnRestart() throws Exception {
        sql("schema", "CREATE SCHEMA unrelated");
        sql("function", "CREATE FUNCTION public.unrelated() RETURNS int LANGUAGE sql AS 'SELECT 1'");
        for (String db : new String[]{"schema", "function"}) assertThatThrownBy(() -> run(db, "initialize")).isInstanceOf(IllegalStateException.class);
        run("tampered", "initialize");
        sql("tampered", "UPDATE jiayou_database_identity SET target_id='7cf4d792-1a12-4c89-949a-19ddf75e043d'");
        var before = snapshot("tampered");
        assertThatThrownBy(() -> run("tampered", "validate")).hasMessageContaining("lineage");
        assertThat(snapshot("tampered")).isEqualTo(before);
        sql("tampered", "UPDATE jiayou_database_identity SET target_id='" + JiayouBootstrapGuardTest.TARGET + "'; UPDATE jiayou_schema_history SET checksum=1");
        before = snapshot("tampered");
        assertThatThrownBy(() -> run("tampered", "validate")).hasMessageContaining("Validate failed");
        assertThat(snapshot("tampered")).isEqualTo(before);
        sql("tampered", "INSERT INTO users(email,password_hash,full_name,role_id) VALUES ('admin@heyganba.vn','not-a-credential','local fixture',2)");
        before = snapshot("tampered");
        assertThatThrownBy(() -> run("tampered", "validate")).hasMessageContaining("administrator");
        assertThat(snapshot("tampered")).isEqualTo(before);
    }

    @Test
    void rejectsAlternateLocationsCallbacksAndUnapprovedResourcesBeforeWriting() throws Exception {
        var env = JiayouBootstrapGuardTest.environment(settings("manifest", "initialize"));
        Flyway alternate = Flyway.configure().dataSource(url("manifest"), "postgres", password()).locations("classpath:db/migration-staging").load();
        assertThatThrownBy(() -> new JiayouBootstrapGuard(env).run(alternate)).hasMessageContaining("locations");
        Flyway callback = Flyway.configure().configuration(flyway("manifest").getConfiguration())
                .callbacks(new org.flywaydb.core.api.callback.BaseCallback() {
                    @Override public boolean supports(org.flywaydb.core.api.callback.Event event, org.flywaydb.core.api.callback.Context context) { return true; }
                    @Override public void handle(org.flywaydb.core.api.callback.Event event, org.flywaydb.core.api.callback.Context context) { throw new AssertionError("Callback must never execute"); }
                }).load();
        assertThatThrownBy(() -> new JiayouBootstrapGuard(env).run(callback)).hasMessageContaining("custom initialization");
        var path = java.nio.file.Files.createTempDirectory("jiayou-unapproved-test");
        var migration = path.resolve("db/jiayou-production/V2__unapproved_content.sql");
        java.nio.file.Files.createDirectories(migration.getParent());
        java.nio.file.Files.writeString(migration, "INSERT INTO vocabulary(word) VALUES ('unapproved')");
        ClassLoader original = Thread.currentThread().getContextClassLoader();
        try (var loader = new java.net.URLClassLoader(new java.net.URL[]{path.toUri().toURL()}, original)) {
            Thread.currentThread().setContextClassLoader(loader);
            assertThatThrownBy(() -> new JiayouBootstrapGuard(env).run(flyway("manifest"))).hasMessageContaining("unapproved");
        } finally { Thread.currentThread().setContextClassLoader(original); }
        assertThat(scalar("manifest", "SELECT count(*) FROM pg_tables WHERE schemaname='public'")).isEqualTo("0");
    }
}
