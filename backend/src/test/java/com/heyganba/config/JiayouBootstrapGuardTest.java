package com.heyganba.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.mock.env.MockEnvironment;

import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

class JiayouBootstrapGuardTest {
    static final String TARGET = "c76ee7c8-66ec-4c70-a818-8f9daee088a3";

    static Map<String, String> settings(String url, String mode) {
        var uri = java.net.URI.create(url.substring(5));
        Map<String, String> p = new LinkedHashMap<>();
        p.put("JIAYOU_PRODUCT", "Jiayou");
        p.put("JIAYOU_ENVIRONMENT", "production");
        p.put("JIAYOU_TARGET_ID", TARGET);
        p.put("JIAYOU_BOOTSTRAP_MODE", mode);
        p.put("JIAYOU_BOOTSTRAP_AUTHORIZATION", mode + ":Jiayou:production:" + TARGET);
        p.put("JIAYOU_DATABASE_URL", url);
        p.put("JIAYOU_DATABASE_HOST", uri.getHost());
        p.put("JIAYOU_DATABASE_PORT", String.valueOf(uri.getPort()));
        p.put("JIAYOU_DATABASE_NAME", uri.getPath().substring(1));
        p.put("JIAYOU_DATABASE_USER", "postgres"); // Disposable local container only.
        p.put("JIAYOU_DATABASE_PASSWORD", "local_jiayou_rehearsal");
        byte[] key = new byte[48];
        new java.security.SecureRandom().nextBytes(key);
        p.put("JIAYOU_JWT_SECRET", Base64.getEncoder().encodeToString(key));
        p.put("JIAYOU_CORS_ALLOWED_ORIGINS", "https://frontend.invalid"); // Test-only origin; never provisioned.
        p.put("spring.datasource.url", url);
        p.put("spring.datasource.username", p.get("JIAYOU_DATABASE_USER"));
        p.put("spring.datasource.password", p.get("JIAYOU_DATABASE_PASSWORD"));
        p.put("spring.flyway.url", url);
        p.put("spring.flyway.user", p.get("JIAYOU_DATABASE_USER"));
        p.put("spring.flyway.password", p.get("JIAYOU_DATABASE_PASSWORD"));
        p.put("spring.flyway.locations", JiayouBootstrapGuard.LOCATION);
        p.put("spring.flyway.enabled", "true");
        p.put("spring.flyway.baseline-on-migrate", "false");
        p.put("spring.flyway.clean-disabled", "true");
        p.put("spring.jpa.hibernate.ddl-auto", "validate");
        p.put("spring.sql.init.mode", "never");
        p.put("app.jwt.secret", p.get("JIAYOU_JWT_SECRET"));
        p.put("app.cors.allowed-origins", p.get("JIAYOU_CORS_ALLOWED_ORIGINS"));
        return p;
    }

    static MockEnvironment environment(Map<String, String> properties) {
        MockEnvironment e = new MockEnvironment();
        e.setActiveProfiles("jiayou-prod");
        properties.forEach(e::setProperty);
        return e;
    }

    static Map<String, String> valid() {
        return settings("jdbc:postgresql://127.0.0.1:54321/jiayou_unit", "initialize");
    }

    @Test
    void validExplicitConfigurationPassesWithoutOpeningADatabase() {
        assertThatCode(() -> JiayouBootstrapGuard.validateEnvironment(environment(valid()))).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @ValueSource(strings = {"JIAYOU_PRODUCT", "JIAYOU_ENVIRONMENT", "JIAYOU_TARGET_ID", "JIAYOU_BOOTSTRAP_MODE",
            "JIAYOU_BOOTSTRAP_AUTHORIZATION", "JIAYOU_DATABASE_URL", "JIAYOU_DATABASE_HOST", "JIAYOU_DATABASE_PORT",
            "JIAYOU_DATABASE_NAME", "JIAYOU_DATABASE_USER", "JIAYOU_DATABASE_PASSWORD", "JIAYOU_JWT_SECRET", "JIAYOU_CORS_ALLOWED_ORIGINS"})
    void everyRequiredOperatorInputFailsClosedWhenMissing(String key) {
        var p = valid();
        p.remove(key);
        assertThatThrownBy(() -> JiayouBootstrapGuard.validateEnvironment(environment(p))).isInstanceOf(RuntimeException.class);
    }

    @Test
    void rejectsUnsafeOverridesBeforeBeanConstruction() {
        Map<String, String> bad = Map.ofEntries(
                Map.entry("JIAYOU_PRODUCT", "Ganbarou"), Map.entry("JIAYOU_ENVIRONMENT", "staging"),
                Map.entry("JIAYOU_BOOTSTRAP_AUTHORIZATION", "true"), Map.entry("JIAYOU_DATABASE_NAME", "heyganba"),
                Map.entry("JIAYOU_DATABASE_HOST", "different.invalid"), Map.entry("JIAYOU_TARGET_ID", "not-a-uuid"),
                Map.entry("spring.flyway.enabled", "false"), Map.entry("spring.flyway.locations", "classpath:db/migration-staging"),
                Map.entry("spring.flyway.baseline-on-migrate", "true"), Map.entry("spring.flyway.clean-disabled", "false"),
                Map.entry("spring.jpa.hibernate.ddl-auto", "create"), Map.entry("spring.sql.init.mode", "always"),
                Map.entry("spring.datasource.hikari.connection-init-sql", "CREATE TABLE unsafe(id int)"),
                Map.entry("spring.flyway.url", "jdbc:postgresql://other.invalid:5432/legacy"),
                Map.entry("JIAYOU_ADMIN_PASSWORD", "admin123"), Map.entry("JIAYOU_ADMIN_EMAIL", "admin@heyganba.vn"));
        bad.forEach((key, value) -> {
            var properties = valid(); properties.put(key, value);
            try (var context = new AnnotationConfigApplicationContext()) {
                context.setEnvironment(environment(properties));
                context.register(JiayouBootstrapConfiguration.class);
                assertThatThrownBy(context::refresh).as(key).isInstanceOf(RuntimeException.class);
            }
        });
    }

    @Test
    void mixedProfilesRejectedAndLegacyProfilesHaveNoNewStrategy() {
        var e = environment(valid()); e.setActiveProfiles("jiayou-prod", "prod");
        assertThatThrownBy(() -> JiayouBootstrapGuard.validateEnvironment(e)).hasMessageContaining("exclusive");
        for (String profile : new String[]{"prod", "staging", "test"}) {
            try (var context = new AnnotationConfigApplicationContext()) {
                context.getEnvironment().setActiveProfiles(profile);
                context.register(JiayouBootstrapConfiguration.class); context.refresh();
                assertThat(context.getBeansOfType(org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy.class)).isEmpty();
            }
        }
    }

    @Test
    void weakSharedKeysAndUnsafeBrowserOriginsAreRejected() {
        for (String key : new String[]{"bad", Base64.getEncoder().encodeToString(new byte[8]),
                "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"}) {
            var p = valid(); p.put("JIAYOU_JWT_SECRET", key); p.put("app.jwt.secret", key);
            assertThatThrownBy(() -> JiayouBootstrapGuard.validateEnvironment(environment(p))).isInstanceOf(RuntimeException.class);
        }
        for (String origin : new String[]{"*", "http://frontend.invalid", "https://heyganba.site", "https://www.heyganba.site", "https://frontend.invalid/path"}) {
            var p = valid(); p.put("JIAYOU_CORS_ALLOWED_ORIGINS", origin); p.put("app.cors.allowed-origins", origin);
            assertThatThrownBy(() -> JiayouBootstrapGuard.validateEnvironment(environment(p))).isInstanceOf(RuntimeException.class);
        }
    }

    @Test
    void jiayouInputsWithMissingOrMisspelledProfileCannotFallBackToLegacy() {
        for (String profile : new String[]{"prod", "jiayou-production"}) {
            try (var context = new AnnotationConfigApplicationContext()) {
                var e = environment(valid()); e.setActiveProfiles(profile);
                context.setEnvironment(e); context.register(JiayouBootstrapConfiguration.class);
                assertThatThrownBy(context::refresh).hasMessageContaining("exclusive");
            }
        }
    }
}
