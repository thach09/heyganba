package com.heyganba.service;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.*;

class DictionaryLegacyProfileTest {
    private DictionaryService dictionary(boolean enabled, String... profiles) {
        var service = new DictionaryService(null, null, null, null);
        var environment = new MockEnvironment();
        environment.setActiveProfiles(profiles);
        ReflectionTestUtils.setField(service, "legacyCatalogEnabled", enabled);
        ReflectionTestUtils.setField(service, "environment", environment);
        return service;
    }

    @Test void aFlagAloneCannotEnableTheJapaneseCatalogInJiayou() {
        assertThatThrownBy(() -> dictionary(true, "jiayou-prod").requireExplicitLegacyProfile())
                .isInstanceOf(IllegalStateException.class);
    }

    @Test void disabledLegacyCatalogDoesNotRequireTheHistoricalProfile() {
        assertThatCode(() -> dictionary(false, "jiayou-prod").requireExplicitLegacyProfile())
                .doesNotThrowAnyException();
    }

    @Test void explicitHistoricalProfileCanRunItsIsolatedAudit() {
        assertThatCode(() -> dictionary(true, "test", "legacy-japanese").requireExplicitLegacyProfile())
                .doesNotThrowAnyException();
    }
}
