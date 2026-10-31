package com.heyganba;

import com.heyganba.controller.HealthController;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;

import static org.hamcrest.Matchers.aMapWithSize;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class HealthReadinessTest {
    @Test
    void readyHealthReturns200WithSuccessWithoutComponentDetails() throws Exception {
        performHealthCheck(Health.up().withDetail("private-detail", "do-not-expose").build())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"))
                .andExpect(jsonPath("$.message").value("Dịch vụ sẵn sàng."))
                .andExpect(content().string(not(containsString("do-not-expose"))));
    }

    @Test
    void mockedAggregateDownReturns503WithFailureWithoutLeakingDiagnostics() throws Exception {
        // Mocked Actuator diagnostics, not an integration test of a PostgreSQL outage.
        var health = Health.down(new IllegalStateException("PSQLException private-host"))
                .withDetail("db", Map.of(
                        "url", "jdbc:postgresql://private-host/internal-db",
                        "username", "private-user",
                        "password", "private-password"))
                .build();
        performHealthCheck(health)
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data.status").value("DOWN"))
                .andExpect(jsonPath("$.message").value("Dịch vụ tạm thời chưa sẵn sàng."))
                .andExpect(content().string(not(containsString("IllegalStateException"))))
                .andExpect(content().string(not(containsString("PSQLException"))))
                .andExpect(content().string(not(containsString("private-host"))))
                .andExpect(content().string(not(containsString("internal-db"))))
                .andExpect(content().string(not(containsString("private-user"))))
                .andExpect(content().string(not(containsString("private-password"))))
                .andExpect(content().string(not(containsString("jdbc:postgresql"))));
    }

    @ParameterizedTest
    @ValueSource(strings = {"UNKNOWN", "OUT_OF_SERVICE", "DEGRADED"})
    void nonUpAggregateStatusFailsClosed(String aggregateStatus) throws Exception {
        performHealthCheck(Health.status(aggregateStatus)
                .withDetail("private-detail", "do-not-expose").build())
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data.status").value("DOWN"))
                .andExpect(jsonPath("$.message").value("Dịch vụ tạm thời chưa sẵn sàng."))
                .andExpect(content().string(not(containsString("do-not-expose"))))
                .andExpect(content().string(not(containsString(aggregateStatus))));
    }

    private ResultActions performHealthCheck(Health health) throws Exception {
        var endpoint = mock(HealthEndpoint.class);
        when(endpoint.health()).thenReturn(health);
        return MockMvcBuilders.standaloneSetup(new HealthController(endpoint)).build().perform(get("/health"))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.data").value(aMapWithSize(4)))
                .andExpect(jsonPath("$.data.service").value("jiayou-backend"))
                .andExpect(jsonPath("$.data.version").value("0.0.1-SNAPSHOT"))
                .andExpect(jsonPath("$.data.timestamp").isNotEmpty())
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                .andExpect(jsonPath("$.error").doesNotExist())
                .andExpect(jsonPath("$.details").doesNotExist())
                .andExpect(jsonPath("$.components").doesNotExist());
    }
}
