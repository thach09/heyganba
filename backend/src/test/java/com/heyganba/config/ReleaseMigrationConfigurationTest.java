package com.heyganba.config;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.configuration.FluentConfiguration;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReleaseMigrationConfigurationTest {
    private final ReleaseMigrationConfiguration policy = new ReleaseMigrationConfiguration();
    private FluentConfiguration safe() {
        return Flyway.configure().locations("classpath:db/migration", "classpath:db/migration-release")
                .ignoreMigrationPatterns(new String[0]).cleanDisabled(true).baselineOnMigrate(false).validateOnMigrate(true);
    }
    @Test void correctReleaseConfigurationMigrates() {
        Flyway flyway = mock(Flyway.class); when(flyway.getConfiguration()).thenReturn(safe());
        policy.controlledReleaseMigrations().migrate(flyway); verify(flyway).migrate();
    }
    @Test void environmentOverrideToStagingCannotMigrate() {
        assertDenied(safe().locations("classpath:db/migration", "classpath:db/migration-staging"));
    }
    @Test void automaticBaselineCannotSilentlyAdoptAnUnknownDatabase() { assertDenied(safe().baselineOnMigrate(true)); }
    @Test void futureHistoryCannotBeIgnored() { assertDenied(safe().ignoreMigrationPatterns("*:future")); }
    @Test void targetOverrideCannotSkipRequiredSafetyMigrations() { assertDenied(safe().target("11")); }
    @Test void cleanupAndValidationCannotBeDisabled() {
        assertDenied(safe().cleanDisabled(false)); assertDenied(safe().validateOnMigrate(false));
    }
    @Test void bootCustomizerRemovesFlywaysDefaultFutureIgnorePattern() {
        var config = Flyway.configure(); policy.validateFutureMigrationHistory().customize(config);
        assertThat(config.getIgnoreMigrationPatterns()).isEmpty();
    }
    private void assertDenied(FluentConfiguration config) {
        Flyway flyway = mock(Flyway.class); when(flyway.getConfiguration()).thenReturn(config);
        assertThatThrownBy(() -> policy.controlledReleaseMigrations().migrate(flyway)).isInstanceOf(IllegalStateException.class);
        verify(flyway, never()).migrate();
    }
}
