package com.heyganba.service.srs;

import com.heyganba.service.StreakService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Job 2.5 — rebuild cache "từ cần ôn hôm nay".
 *
 * SRS due date tính theo timestamp, nhưng cache được "khoá theo ngày" nên sang ngày mới (theo múi giờ
 * "ngày học" = `app.streak.zone`, mặc định giờ VN) cache cũ không còn ý nghĩa. Job chạy 00:05 **theo múi giờ đó**
 * (không phải giờ server) và xoá cache; lần request kế tiếp của user sẽ nạp lại từ Postgres
 * (fallback luôn hoạt động kể cả khi job fail — endpoint không phụ thuộc job).
 */
@Component
@RequiredArgsConstructor
public class SrsCacheSyncJob {

    private static final Logger log = LoggerFactory.getLogger(SrsCacheSyncJob.class);

    private final SrsDueCache srsDueCache;

    @Scheduled(
            cron = "${app.srs.cache-sync-cron:0 5 0 * * *}",
            zone = "${app.streak.zone:" + StreakService.DEFAULT_ZONE + "}"
    )
    public void rebuildDueCache() {
        try {
            srsDueCache.clearAll();
            log.info("SRS due-today cache cleared — sẽ được nạp lại theo từng user khi có request.");
        } catch (Exception ex) {
            log.error("SRS cache sync job failed; endpoint /flashcard/due-today vẫn hoạt động bằng Postgres.", ex);
        }
    }
}
