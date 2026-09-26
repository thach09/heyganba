package com.heyganba.controller;

import com.heyganba.common.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> healthCheck() {
        Map<String, Object> healthInfo = Map.of(
                "status", "UP",
                "service", "heyganba-backend",
                "version", "0.0.1-SNAPSHOT",
                "timestamp", Instant.now().toString()
        );
        return ResponseEntity.ok(ApiResponse.success(healthInfo, "HeyGanba backend service is running normally"));
    }
}
