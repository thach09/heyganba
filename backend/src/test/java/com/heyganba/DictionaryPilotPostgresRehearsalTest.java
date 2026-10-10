package com.heyganba;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import java.sql.*;
import static org.assertj.core.api.Assertions.*;

/** Opt-in disposable PostgreSQL ONLY. This migration is test-source code, never packaged/deployed. */
@EnabledIfSystemProperty(named = "dictionary.pilot.rehearsal", matches = "true")
class DictionaryPilotPostgresRehearsalTest {
    @Test void rehearsePendingEnrichmentThroughFlywayWithoutCurriculumMutation() throws Exception {
        String url = System.getProperty("dictionary.pilot.jdbc", "jdbc:postgresql://127.0.0.1:15439/dictionary_pilot");
        assertThat(url).matches("jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/dictionary_pilot(?:_clean)?");
        String user = "pilot", password = "local-dictionary-pilot";
        try (var connection = DriverManager.getConnection(url, user, password)) {
            String before = curriculumFingerprint(connection);
            String canonicalBefore = canonicalFingerprint(connection);
            var flyway = Flyway.configure().dataSource(url,user,password).locations("classpath:db/migration")
                    .javaMigrations(new R__zz_dictionary_pilot_rehearsal()).load();
            var result = flyway.migrate();
            assertThat(result.success).isTrue();
            assertThat(flyway.validateWithResult().validationSuccessful).isTrue();
            assertThat(curriculumFingerprint(connection)).isEqualTo(before);
            assertThat(canonicalFingerprint(connection)).isEqualTo(canonicalBefore);
            try (var statement=connection.createStatement(); var rows=statement.executeQuery("SELECT count(*) FROM dictionary_entries WHERE active=true")) {
                assertThat(rows.next()).isTrue(); assertThat(rows.getInt(1)).isEqualTo(218867);
            }
        }
    }
    private static String canonicalFingerprint(Connection connection) throws SQLException {
        try (var query=connection.createStatement(); var rows=query.executeQuery("""
                SELECT md5(string_agg(id::text || word || reading || meaning || common_rank::text || active::text, '' ORDER BY id))
                FROM dictionary_entries
                """)) { rows.next(); return rows.getString(1); }
    }
    private static String curriculumFingerprint(Connection connection) throws SQLException {
        // Covers full values, not only row counts: enrichment must not touch learning content/progress.
        StringBuilder result = new StringBuilder();
        for (String table : new String[]{"vocabulary","grammar_rules","mock_exams","srs_reviews","study_activities"}) {
            try (var query=connection.createStatement(); var rows=query.executeQuery(
                    "SELECT md5(COALESCE(string_agg(row_to_json(t)::text, '' ORDER BY row_to_json(t)::text), '')) FROM " + table + " t")) {
                rows.next(); result.append(table).append(':').append(rows.getString(1));
            }
        }
        return result.toString();
    }
    public static class R__zz_dictionary_pilot_rehearsal extends BaseJavaMigration {
        @Override public Integer getChecksum() {
            try (var input = getClass().getResourceAsStream(DictionaryCurationIntegrityTest.PILOT)) {
                var crc = new java.util.zip.CRC32();
                crc.update("pilot-rehearsal-v2".getBytes(java.nio.charset.StandardCharsets.UTF_8));
                // A canonical index refresh clears the overlay, so rehearse again for every transformer revision.
                crc.update(new db.migration.R__refresh_jmdict_catalog().getChecksum().toString()
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8));
                crc.update(input.readAllBytes()); return (int) crc.getValue();
            } catch (java.io.IOException e) { throw new IllegalStateException(e); }
        }
        @Override public void migrate(Context context) throws Exception {
            // Start each changed rehearsal from the same canonical refresh; never accumulate aliases.
            new db.migration.R__refresh_jmdict_catalog().migrate(context);
            // Deliberately only test rehearsal. C entries and PENDING_REVIEW must never enter a release.
            var data = DictionaryCurationIntegrityTest.pilot();
            try (var update=context.getConnection().prepareStatement("""
                    UPDATE dictionary_entries SET vietnamese_meaning=?, vietnamese_search_text=?, search_text=search_text || ' | ' || ?
                    WHERE id=? AND active=true
                    """)) {
                for (var concept : data.path("concepts")) {
                    var row = DictionaryCurationIntegrityTest.row(concept);
                    update.setString(1,row.vietnamese()); update.setString(2,row.vietnameseSearchText());
                    update.setString(3,row.additionalSearchText()); update.setLong(4,row.id());
                    assertThat(update.executeUpdate()).isEqualTo(1);
                }
            }
        }
    }
}
