package com.heyganba.service;

import java.time.LocalDate;
import java.util.Map;
import java.util.Set;

/** v1: D7=[7,9], D30=[30,32], completed items irrespective of correctness/streak. */
public final class CohortRetention {
    private CohortRetention() {}
    public record Result(String metricVersion, LocalDate cohortDay, int targetDay,
                         int cohortSize, Integer returningLearners, Double rate, boolean mature) {}

    public static Result calculate(LocalDate cohortDay, int targetDay, LocalDate closedThrough,
                                   Set<Long> learners, Map<Long, Set<LocalDate>> activityDays) {
        if (targetDay != 7 && targetDay != 30) throw new IllegalArgumentException("Only D7 and D30 are defined");
        LocalDate start = cohortDay.plusDays(targetDay);
        LocalDate end = start.plusDays(2);
        if (closedThrough.isBefore(end)) return new Result("v1", cohortDay, targetDay, learners.size(), null, null, false);
        int returned = (int) learners.stream().filter(id -> activityDays.getOrDefault(id, Set.of()).stream()
                .anyMatch(day -> !day.isBefore(start) && !day.isAfter(end))).count();
        return new Result("v1", cohortDay, targetDay, learners.size(), returned,
                learners.isEmpty() ? null : (double) returned / learners.size(), true);
    }
}
