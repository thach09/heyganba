package com.heyganba;

import com.heyganba.config.FeatureFlagProperties;
import com.heyganba.service.FeatureFlagService;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static com.heyganba.service.FeatureFlagService.Feature.*;

class FeatureFlagTest {
    @Test void springBindingValidatesConfigurationAndMissingFlagsStayOff() {
        var runner = new org.springframework.boot.test.context.runner.ApplicationContextRunner()
                .withUserConfiguration(FeatureFlagService.class);
        runner.run(context -> {
            assertNull(context.getStartupFailure());
            assertFalse(context.getBean(FeatureFlagService.class).enabled(DAILY_PLAN, 1L));
        });
        runner.withPropertyValues("app.rollout.flags.dailyplan.enabled=true", "app.rollout.flags.dailyplan.percentage=100")
                .run(context -> {
                    assertNull(context.getStartupFailure());
                    assertTrue(context.getBean(FeatureFlagService.class).enabled(DAILY_PLAN, 1L));
                    assertFalse(context.getBean(FeatureFlagService.class).enabled(PLACEMENT_TEST, 1L));
                });
        runner.withPropertyValues("app.rollout.flags.dailyplan.enabled=true", "app.rollout.flags.dailyplan.percentage=101")
                .run(context -> assertNotNull(context.getStartupFailure()));
    }
    FeatureFlagService service(boolean enabled, int percentage) {
        return new FeatureFlagService(new FeatureFlagProperties(Map.of("dailyplan", new FeatureFlagProperties.Flag(enabled,percentage))));
    }
    @Test void missingDisabledUnknownLearnerAndInvalidConfigFailClosed() {
        assertFalse(new FeatureFlagService(new FeatureFlagProperties(null)).enabled(DAILY_PLAN,1L));
        assertFalse(service(false,100).enabled(DAILY_PLAN,1L));
        assertFalse(service(true,0).enabled(DAILY_PLAN,1L));
        assertFalse(service(true,101).enabled(DAILY_PLAN,1L));
        assertFalse(service(true,100).enabled(DAILY_PLAN,null));
        assertFalse(service(true,100).enabled(DAILY_PLAN,-1L));
        assertFalse(service(true,100).enabled(MISTAKE_NOTEBOOK,1L));
        assertThrows(com.heyganba.common.exception.ResourceNotFoundException.class, () -> service(false,100).requireEnabled(DAILY_PLAN,1L));
    }
    @Test void rolloutIsDeterministicFeatureSpecificAndMonotonic() {
        int included = 0;
        for (long id=1;id<=1000;id++) {
            int bucket = FeatureFlagService.bucket(DAILY_PLAN,id);
            assertTrue(bucket>=0 && bucket<10000);
            assertEquals(bucket,FeatureFlagService.bucket(DAILY_PLAN,id));
            assertTrue(service(true,100).enabled(DAILY_PLAN,id));
            if (service(true,10).enabled(DAILY_PLAN,id)) { included++; assertTrue(service(true,50).enabled(DAILY_PLAN,id)); }
        }
        assertTrue(included>50 && included<150);
        assertNotEquals(FeatureFlagService.bucket(DAILY_PLAN,1L),FeatureFlagService.bucket(MISTAKE_NOTEBOOK,1L));
    }
    @Test void configurationRejectsOutOfRangePercentage() {
        try (var validator = jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            assertFalse(validator.getValidator().validate(new FeatureFlagProperties(Map.of("dailyplan",new FeatureFlagProperties.Flag(true,101)))).isEmpty());
        }
    }
}
