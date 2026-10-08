package com.heyganba.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;
import java.util.Map;

@Validated
@ConfigurationProperties(prefix = "app.rollout")
public record FeatureFlagProperties(Map<String, @Valid Flag> flags) {
    public FeatureFlagProperties { flags = flags == null ? Map.of() : Map.copyOf(flags); }
    public record Flag(boolean enabled, @Min(0) @Max(100) int percentage) {}
}
