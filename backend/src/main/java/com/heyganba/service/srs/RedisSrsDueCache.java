package com.heyganba.service.srs;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.dto.flashcard.FlashcardDueResponse;
import com.heyganba.service.StreakService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Implementation Redis của {@link SrsDueCache} — chỉ được tạo khi `app.srs.cache=redis`
 * (env `APP_SRS_CACHE=redis`).
 *
 * ⚠️ TRẠNG THÁI: code đã viết sẵn nhưng **CHƯA kích hoạt** ở bất kỳ môi trường nào (quyết định đã chốt:
 * chưa có Redis managed instance ⇒ staging/production chạy Postgres trực tiếp qua {@link InMemorySrsDueCache}).
 * Khi có Redis managed: đặt `APP_SRS_CACHE=redis` + `REDIS_HOST`/`REDIS_PORT` là xong, không cần sửa code.
 *
 * - Key: `srs:due:{userId}` = JSON danh sách từ cần ôn.
 * - TTL = hết ngày theo `app.streak.zone` (mặc định giờ VN) — khớp mốc ngày dùng cho streak/heatmap.
 * - Mọi lỗi Redis đều bị nuốt + log warn: sự cố cache KHÔNG được làm hỏng chức năng học (coi như cache miss).
 */
@Component
@ConditionalOnProperty(name = "app.srs.cache", havingValue = "redis")
public class RedisSrsDueCache implements SrsDueCache {

    private static final Logger log = LoggerFactory.getLogger(RedisSrsDueCache.class);
    private static final String KEY_PREFIX = "srs:due:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final ZoneId zone;

    public RedisSrsDueCache(StringRedisTemplate redisTemplate,
                            ObjectMapper objectMapper,
                            @Value("${app.streak.zone:" + StreakService.DEFAULT_ZONE + "}") String zoneId) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.zone = ZoneId.of(zoneId);
    }

    @Override
    public Optional<List<FlashcardDueResponse>> get(Long userId) {
        try {
            String payload = redisTemplate.opsForValue().get(key(userId));
            if (payload == null) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(payload, new TypeReference<List<FlashcardDueResponse>>() {
            }));
        } catch (Exception ex) {
            log.warn("Redis SRS cache: đọc lỗi cho user {} ({}) — coi như cache miss", userId, ex.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public void put(Long userId, List<FlashcardDueResponse> items) {
        try {
            redisTemplate.opsForValue().set(key(userId), objectMapper.writeValueAsString(items), ttlUntilEndOfToday());
        } catch (Exception ex) {
            log.warn("Redis SRS cache: ghi lỗi cho user {} ({})", userId, ex.getMessage());
        }
    }

    @Override
    public void invalidate(Long userId) {
        try {
            redisTemplate.delete(key(userId));
        } catch (Exception ex) {
            log.warn("Redis SRS cache: xoá lỗi cho user {} ({})", userId, ex.getMessage());
        }
    }

    @Override
    public void clearAll() {
        try {
            // KEYS là O(N) nhưng chỉ chạy trong job đồng bộ 00:05 với số key nhỏ (1 key/user) — chấp nhận được.
            Set<String> keys = redisTemplate.keys(KEY_PREFIX + "*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        } catch (Exception ex) {
            log.warn("Redis SRS cache: clearAll lỗi ({})", ex.getMessage());
        }
    }

    private static String key(Long userId) {
        return KEY_PREFIX + userId;
    }

    private Duration ttlUntilEndOfToday() {
        Instant endOfToday = Instant.now().atZone(zone).toLocalDate().plusDays(1).atStartOfDay(zone).toInstant();
        return Duration.between(Instant.now(), endOfToday);
    }
}
