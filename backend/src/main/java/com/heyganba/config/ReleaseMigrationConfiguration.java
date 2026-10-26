package com.heyganba.config;

import org.springframework.boot.autoconfigure.flyway.FlywayConfigurationCustomizer;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/** Source/environment overrides cannot silently activate quarantined migration locations. */
@Configuration
public class ReleaseMigrationConfiguration {
    @Bean
    FlywayConfigurationCustomizer validateFutureMigrationHistory() {
        // Flyway otherwise ignores applied future versions missing from this release.
        return configuration -> configuration.ignoreMigrationPatterns(new String[0]);
    }
    @Bean
    FlywayMigrationStrategy controlledReleaseMigrations() {
        return flyway -> {
            var config = flyway.getConfiguration();
            Set<String> locations = Arrays.stream(config.getLocations()).map(location -> location.getDescriptor())
                    .collect(Collectors.toSet());
            if (!locations.equals(Set.of("classpath:db/migration", "classpath:db/migration-release"))
                    || config.getLocations().length != 2 || !org.flywaydb.core.api.MigrationVersion.LATEST.equals(config.getTarget())
                    || config.isBaselineOnMigrate() || !config.isCleanDisabled() || !config.isValidateOnMigrate()
                    || config.getIgnoreMigrationPatterns().length != 0) {
                throw new IllegalStateException("Unsafe migration configuration: controlled release locations and full history validation are required");
            }
            flyway.migrate();
        };
    }
}
