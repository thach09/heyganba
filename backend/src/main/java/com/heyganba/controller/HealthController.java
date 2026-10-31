package com.heyganba.controller;

import com.heyganba.common.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.actuate.health.Status;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@org.springframework.validation.annotation.Validated
@RestController
public class HealthController {

    private final HealthEndpoint healthEndpoint;

    public HealthController(HealthEndpoint healthEndpoint) {
        this.healthEndpoint = healthEndpoint;
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> healthCheck() {
        // Only aggregate UP is ready; unknown and custom statuses fail closed.
        boolean ready = Status.UP.equals(healthEndpoint.health().getStatus());
        Map<String, Object> healthInfo = Map.of(
                "status", ready ? "UP" : "DOWN",
                "service", "jiayou-backend",
                "version", "0.0.1-SNAPSHOT",
                "timestamp", Instant.now().toString()
        );
        return ResponseEntity.status(ready ? 200 : 503)
                .cacheControl(org.springframework.http.CacheControl.noStore())
                .body(ApiResponse.<Map<String, Object>>builder()
                        .success(ready)
                        .data(healthInfo)
                        .message(ready ? "Dịch vụ sẵn sàng." : "Dịch vụ tạm thời chưa sẵn sàng.")
                        .build());
    }
}
