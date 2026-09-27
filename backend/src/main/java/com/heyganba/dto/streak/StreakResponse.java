package com.heyganba.dto.streak;

import java.time.LocalDate;

/**
 * Tổng quan streak của user (không kèm heatmap — heatmap có endpoint riêng để phân trang theo số ngày).
 *
 * Kèm tiến độ hôm nay so với ngưỡng tính streak để UI hiển thị "hôm nay cần thêm bao nhiêu lượt ôn".
 */
public record StreakResponse(
        int currentStreak,
        int longestStreak,
        LocalDate lastActiveDate,
        long activeDays,
        String zone,
        int todaySrsReviews,
        int minSrsReviewsForStreak,
        boolean todayQualified
) {
}
