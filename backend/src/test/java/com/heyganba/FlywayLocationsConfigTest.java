package com.heyganba;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Guards the production Flyway allowlist and its byte-preserving migration copies. */
class FlywayLocationsConfigTest {

    private static final String STAGING_DIR = "db/migration-staging";
    private static final String RELEASE_DIR = "db/migration-release";
    private static final String MAIN_DIR = "db/migration";
    private static final List<String> RELEASE_FILES = List.of(
            "V4__sample_lesson_greetings.sql",
            "V5__hsk1_thematic_curriculum_expansion.sql",
            "V6__hsk1_standard_course_grammar_and_exams.sql",
            "V7__hsk1_complete_150_vocab_and_hanzi_radicals.sql",
            "V8__hsk2_standard_course_and_approve_all_curriculum.sql",
            "V9__hsk1_to_hsk6_complete_curriculum_and_grammar.sql",
            "V10__learning_insights_and_sentence_order.sql",
            "V11__align_optional_content_nullability.sql",
            "V12__performance_indexes_and_constraints.sql",
            "V13__vocabulary_provenance_review_gate.sql",
            "V14__web_cross_check_evidence_policy.sql");

    private static String readResource(String path) throws IOException {
        ClassPathResource resource = new ClassPathResource(path);
        assertTrue(resource.exists(), "Missing resource " + path);
        try (InputStream in = resource.getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static String sha256(String path) throws IOException, NoSuchAlgorithmException {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(in.readAllBytes()));
        }
    }

    private static List<String> sqlFilesIn(String directory) throws IOException {
        Resource[] resources = new PathMatchingResourcePatternResolver()
                .getResources("classpath:" + directory + "/*.sql");
        return Arrays.stream(resources)
                .map(Resource::getFilename)
                .filter(name -> name != null && name.matches("V[0-9].*__.*\\.sql"))
                .sorted()
                .toList();
    }

    @Test
    @DisplayName("Default and prod Flyway locations use only the release allowlist")
    void productionLocationsUseReleaseAllowlist() throws IOException {
        for (String config : List.of("application.yml", "application-prod.yml")) {
            String content = readResource(config);
            String line = content.lines().map(String::trim).filter(value -> value.startsWith("locations:"))
                    .findFirst().orElseThrow(() -> new AssertionError("Missing Flyway locations in " + config));
            assertTrue(line.contains("classpath:" + MAIN_DIR), config + " must include baseline migrations");
            assertTrue(line.contains("classpath:" + RELEASE_DIR), config + " must include release migrations");
            assertFalse(line.contains(STAGING_DIR), config + " must never load staging SQL");
            assertFalse(line.contains("${SPRING_FLYWAY_LOCATIONS"), config + " must not silently accept a staging override");
        }
    }

    @Test
    @DisplayName("The release directory is an exact, checksummed allowlist")
    void releaseMigrationsMatchAllowlistAndStagingSources() throws IOException, NoSuchAlgorithmException {
        assertEquals(RELEASE_FILES.stream().sorted().toList(), sqlFilesIn(RELEASE_DIR));
        assertEquals(Set.of("V1", "V2", "V3"), sqlFilesIn(MAIN_DIR).stream()
                .map(FlywayLocationsConfigTest::versionOf).collect(Collectors.toSet()));

        for (String file : RELEASE_FILES) {
            String releaseHash = sha256(RELEASE_DIR + "/" + file);
            assertEquals(sha256(STAGING_DIR + "/" + file), releaseHash,
                    file + " must be copied byte-for-byte from its reviewed source");
        }
    }

    @Test
    @DisplayName("Staging migrations remain available for rehearsal tests")
    void stagingResourcesAreAvailableToTests() {
        assertTrue(new ClassPathResource(STAGING_DIR).exists(), "Test classpath must contain staging sources");
        assertTrue(new ClassPathResource(MAIN_DIR + "/V1__init_chinese_schema.sql").exists());
    }

    private static String versionOf(String fileName) {
        return fileName.substring(0, fileName.indexOf("__"));
    }
}
