package com.heyganba.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ProductMetricsService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final JdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public CohortRetention.Result retention(LocalDate cohortDay, int targetDay, LocalDate closedThrough) {
        if (targetDay != 7 && targetDay != 30) throw new IllegalArgumentException("Only D7 and D30 are defined");
        Timestamp from = Timestamp.from(cohortDay.atStartOfDay(ZONE).toInstant());
        Timestamp until = Timestamp.from(cohortDay.plusDays(1).atStartOfDay(ZONE).toInstant());
        Set<Long> learners = new HashSet<>(jdbc.queryForList(
                "SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id "
                        + "WHERE u.created_at >= ? AND u.created_at < ? AND r.name='ROLE_USER'",
                Long.class, from, until));
        Map<Long, Set<LocalDate>> days = new HashMap<>();
        jdbc.query("SELECT DISTINCT a.user_id, a.activity_date FROM study_activities a "
                        + "JOIN users u ON u.id=a.user_id JOIN roles r ON r.id=u.role_id "
                        + "WHERE u.created_at >= ? AND u.created_at < ? AND r.name='ROLE_USER' "
                        + "AND a.item_count > 0 AND a.activity_date >= ? AND a.activity_date <= ?",
                row -> { days.computeIfAbsent(row.getLong(1), key -> new HashSet<>())
                        .add(row.getDate(2).toLocalDate()); },
                from, until, cohortDay.plusDays(targetDay), cohortDay.plusDays(targetDay + 2L));
        return CohortRetention.calculate(cohortDay, targetDay, closedThrough, learners, days);
    }
}
