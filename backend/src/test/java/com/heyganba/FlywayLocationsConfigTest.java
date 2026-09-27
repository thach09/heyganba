package com.heyganba;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Guard cho QUYẾT ĐỊNH "nội dung chờ duyệt chỉ ở staging, không promote lên production".
 *
 * Cơ chế: Flyway đọc `classpath:db/migration` (đã duyệt) + `classpath:db/migration-staging` (chờ duyệt) ở
 * local/staging; profile `prod` chỉ đọc `classpath:db/migration`. Test này khoá cả 2 vế lại: nếu ai sửa
 * application-prod.yml để include thư mục staging, hoặc chuyển file chờ duyệt vào `db/migration`, test sẽ đỏ.
 */
class FlywayLocationsConfigTest {

    private static final String STAGING_DIR = "db/migration-staging";
    private static final String MAIN_DIR = "db/migration";

    private static String readResource(String path) throws IOException {
        ClassPathResource resource = new ClassPathResource(path);
        assertTrue(resource.exists(), "Không tìm thấy resource " + path);
        try (InputStream in = resource.getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static String locationsLine(String yamlContent) {
        return yamlContent.lines()
                .map(String::trim)
                .filter(line -> line.startsWith("locations:"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Không có dòng `locations:` trong file cấu hình Flyway"));
    }

    private static List<String> sqlFilesIn(String directory) throws IOException {
        Resource[] resources = new PathMatchingResourcePatternResolver()
                .getResources("classpath:" + directory + "/*.sql");
        return Arrays.stream(resources)
                .map(Resource::getFilename)
                .filter(name -> name != null)
                .sorted()
                .toList();
    }

    private static String versionOf(String fileName) {
        return fileName.substring(0, fileName.indexOf("__"));
    }

    @Test
    @DisplayName("Cấu hình mặc định (local/staging) đọc CẢ migration đã duyệt và migration chờ duyệt")
    void defaultLocationsIncludeStagingContent() throws IOException {
        String locations = locationsLine(readResource("application.yml"));

        assertTrue(locations.contains("classpath:" + MAIN_DIR), "phải đọc thư mục migration chính");
        assertTrue(locations.contains("classpath:" + STAGING_DIR), "phải đọc thư mục nội dung chờ duyệt");
    }

    @Test
    @DisplayName("Profile prod CHỈ đọc migration đã duyệt (không include nội dung chờ duyệt)")
    void productionLocationsExcludeStagingContent() throws IOException {
        String locations = locationsLine(readResource("application-prod.yml"));

        assertEquals("locations: classpath:" + MAIN_DIR, locations,
                "prod phải trỏ đúng 1 thư mục db/migration, không được include db/migration-staging");
    }

    @Test
    @DisplayName("V12/V14 (nội dung chờ duyệt) nằm ở db/migration-staging, không nằm ở db/migration")
    void pendingMigrationsLiveInStagingFolderOnly() {
        assertTrue(new ClassPathResource(STAGING_DIR + "/V12__expand_grammar_exercises.sql").exists(),
                "V12 (96 câu bổ sung) phải ở db/migration-staging để không chạy ở production");
        assertFalse(new ClassPathResource(MAIN_DIR + "/V12__expand_grammar_exercises.sql").exists(),
                "V12 không được nằm ở db/migration trước khi duyệt nội dung");
        assertTrue(new ClassPathResource(MAIN_DIR + "/V13__add_content_review_status.sql").exists(),
                "V13 (cột review_status) là migration hạ tầng, phải chạy ở mọi môi trường");
    }

    @Test
    @DisplayName("Không trùng version giữa db/migration và db/migration-staging (Flyway sẽ fail nếu trùng)")
    void stagingFolderHasNoVersionClashWithMainFolder() throws IOException {
        Set<String> mainVersions = sqlFilesIn(MAIN_DIR).stream().map(FlywayLocationsConfigTest::versionOf)
                .collect(Collectors.toSet());

        for (String stagingFile : sqlFilesIn(STAGING_DIR)) {
            String version = versionOf(stagingFile);
            assertFalse(mainVersions.contains(version),
                    "File " + stagingFile + " trùng version với một migration trong " + MAIN_DIR);
        }
    }
}
