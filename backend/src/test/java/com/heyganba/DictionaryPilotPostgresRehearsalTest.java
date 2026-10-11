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
            var flyway = Flyway.configure().dataSource(url,user,password).locations("classpath:db/migration")
                    .javaMigrations(new R__zz_dictionary_pilot_rehearsal()).load();
            var result = flyway.migrate();
            assertThat(result.success).isTrue();
            assertThat(flyway.validateWithResult().validationSuccessful).isTrue();
            assertThat(curriculumFingerprint(connection)).isEqualTo(before);
            try (var statement=connection.createStatement(); var rows=statement.executeQuery("SELECT count(*) FROM dictionary_entries WHERE active=true")) {
                assertThat(rows.next()).isTrue(); assertThat(rows.getInt(1)).isEqualTo(218867);
            }
            try (var statement=connection.createStatement(); var rows=statement.executeQuery("SELECT vietnamese_status, count(*) FROM dictionary_entries GROUP BY vietnamese_status")) {
                var counts = new java.util.HashMap<String, Integer>();
                while (rows.next()) counts.put(rows.getString(1), rows.getInt(2));
                assertThat(counts.get("VERIFIED")).isEqualTo(204);
                assertThat(counts.get("ASSISTED")).isEqualTo(343);
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
            try (var input = getClass().getResourceAsStream("/db/migration-staging/vietnamese-assisted-batch-a.tsv")) {
                var crc = new java.util.zip.CRC32();
                crc.update("assisted-batch-rehearsal-v2".getBytes(java.nio.charset.StandardCharsets.UTF_8));
                // A canonical index refresh clears the overlay, so rehearse again for every transformer revision.
                crc.update(new db.migration.R__refresh_jmdict_catalog().getChecksum().toString()
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8));
                crc.update(input.readAllBytes()); return (int) crc.getValue();
            } catch (java.io.IOException e) { throw new IllegalStateException(e); }
        }
        @Override public void migrate(Context context) throws Exception {
            // Start each changed rehearsal from the same canonical refresh; never accumulate aliases.
            String canonicalBefore = canonicalFingerprint(context.getConnection());
            new db.migration.R__refresh_jmdict_catalog().migrate(context);
            assertThat(canonicalFingerprint(context.getConnection())).isEqualTo(canonicalBefore);
            // Local disposable rehearsal applies only the high-confidence, identity-pinned staging batch.
            var rows = com.heyganba.service.AssistedDictionaryCuration.read(
                    getClass().getResourceAsStream("/db/migration-staging/vietnamese-assisted-batch-a.tsv"));
            try (var update=context.getConnection().prepareStatement("""
                    UPDATE dictionary_entries SET vietnamese_meaning=?, vietnamese_search_text=?, vietnamese_status='ASSISTED', search_text=search_text || ' | ' || ?
                    WHERE id=? AND word=? AND reading=? AND meaning=? AND active=true AND vietnamese_status='NONE'
                    """)) {
                for (var row : rows) {
                    var search = row.asSearchRow();
                    update.setString(1,row.vietnameseMeaning()); update.setString(2,search.vietnameseSearchText());
                    update.setString(3,search.additionalSearchText()); update.setLong(4,row.id());
                    update.setString(5,row.word()); update.setString(6,row.reading()); update.setString(7,row.englishSense());
                    assertThat(update.executeUpdate()).isEqualTo(1);
                }
            }
        }
    }
}
