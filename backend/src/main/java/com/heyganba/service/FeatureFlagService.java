package com.heyganba.service;

import com.heyganba.common.exception.ResourceNotFoundException;
import com.heyganba.config.FeatureFlagProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Service
@RequiredArgsConstructor
@EnableConfigurationProperties(FeatureFlagProperties.class)
public class FeatureFlagService {
    private final FeatureFlagProperties config;
    public enum Feature {
        DAILY_PLAN("dailyplan"), MISTAKE_NOTEBOOK("mistakenotebook"), STREAK_REMINDER("streakreminder"),
        PLACEMENT_TEST("placementtest"), LEARNING_FEEDBACK("learningfeedback");
        private final String key;
        Feature(String key) { this.key = key; }
    }
    public boolean enabled(Feature feature, Long learner) {
        if (feature == null || learner == null || learner <= 0) return false;
        var flag = config.flags().get(feature.key);
        return flag != null && flag.enabled() && flag.percentage() >= 0 && flag.percentage() <= 100
                && bucket(feature, learner) < flag.percentage() * 100;
    }
    public void requireEnabled(Feature feature, Long learner) {
        if (!enabled(feature, learner)) throw new ResourceNotFoundException("Feature is not available");
    }
    /** Stable v1 bucket, 0..9999. Feature-specific cohorts expand monotonically with percentage. */
    public static int bucket(Feature feature, Long learner) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(
                    ("heyganba-rollout-v1|" + feature.key + "|" + learner).getBytes(StandardCharsets.UTF_8));
            return (int) (Integer.toUnsignedLong(ByteBuffer.wrap(digest).getInt()) % 10000);
        } catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException("SHA-256 unavailable", impossible); }
    }
}
