package com.heyganba.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Bật @Scheduled cho các job định kỳ (Phase 2: đồng bộ cache SRS due-today lúc 00:05). */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
