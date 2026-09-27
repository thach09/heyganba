package com.heyganba.service;

import com.heyganba.dto.leaderboard.LeaderboardEntryResponse;
import com.heyganba.dto.leaderboard.LeaderboardResponse;
import com.heyganba.model.entity.Streak;
import com.heyganba.model.entity.User;
import com.heyganba.repository.ExamResultRepository;
import com.heyganba.repository.SrsReviewRepository;
import com.heyganba.repository.StreakRepository;
import com.heyganba.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Bảng xếp hạng chạy trực tiếp trên PostgreSQL (có index), thay vì Redis Sorted Set như roadmap.
 *
 * Lý do (hướng an toàn): staging/production chưa có Redis managed, thêm dependency Redis lúc này sẽ làm local dev
 * và CI phụ thuộc hạ tầng chưa tồn tại. API giữ nguyên khi chuyển sang Redis ở phase sau.
 *
 * Công thức điểm (minh bạch, trả về cho client):
 *   points = số từ đã thuộc + (streak dài nhất × 2) + (điểm thi thử cao nhất ÷ 10)
 */
@Service
@RequiredArgsConstructor
public class LeaderboardService {

    static final String POINTS_FORMULA = "points = số từ đã thuộc + (streak dài nhất x 2) + (điểm thi thử cao nhất / 10)";

    private static final int MAX_LIMIT = 100;

    private final SrsReviewRepository srsReviewRepository;
    private final StreakRepository streakRepository;
    private final ExamResultRepository examResultRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public LeaderboardResponse getLeaderboard(int limit, String classCode) {
        int resolvedLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
        String normalizedClass = (classCode == null || classCode.isBlank()) ? null : classCode.trim();

        Set<Long> allowedUserIds = null;
        if (normalizedClass != null) {
            allowedUserIds = userRepository.findByClassCodeIgnoreCase(normalizedClass).stream()
                    .map(User::getId)
                    .collect(Collectors.toSet());
            if (allowedUserIds.isEmpty()) {
                return new LeaderboardResponse("CLASS:" + normalizedClass, POINTS_FORMULA, List.of());
            }
        }

        Map<Long, Long> learnedWords = new HashMap<>();
        for (Object[] row : srsReviewRepository.countLearnedPerUser()) {
            learnedWords.put((Long) row[0], (Long) row[1]);
        }

        Map<Long, Integer> longestStreaks = new HashMap<>();
        for (Streak streak : streakRepository.findAll()) {
            longestStreaks.put(streak.getUser().getId(), streak.getLongestStreak());
        }

        Map<Long, Double> bestScores = new HashMap<>();
        for (Object[] row : examResultRepository.findBestScorePerUser()) {
            bestScores.put((Long) row[0], ((Number) row[1]).doubleValue());
        }

        Set<Long> userIds = new LinkedHashSet<>();
        userIds.addAll(learnedWords.keySet());
        userIds.addAll(longestStreaks.keySet());
        userIds.addAll(bestScores.keySet());
        if (allowedUserIds != null) {
            userIds.retainAll(allowedUserIds);
        }

        String scope = normalizedClass != null ? "CLASS:" + normalizedClass : "ALL";
        if (userIds.isEmpty()) {
            return new LeaderboardResponse(scope, POINTS_FORMULA, List.of());
        }

        Map<Long, String> fullNames = new HashMap<>();
        for (User user : userRepository.findAllById(userIds)) {
            fullNames.put(user.getId(), user.getFullName());
        }

        List<LeaderboardEntryResponse> entries = new ArrayList<>();
        for (Long userId : userIds) {
            long learned = learnedWords.getOrDefault(userId, 0L);
            int longest = longestStreaks.getOrDefault(userId, 0);
            double best = bestScores.getOrDefault(userId, 0.0);
            long points = learned + (long) longest * 2 + Math.round(best / 10);

            entries.add(new LeaderboardEntryResponse(0, userId, fullNames.getOrDefault(userId, "Học viên"),
                    learned, longest, best, points));
        }

        entries.sort(Comparator.comparingLong(LeaderboardEntryResponse::points).reversed());

        List<LeaderboardEntryResponse> ranked = new ArrayList<>();
        for (int index = 0; index < Math.min(entries.size(), resolvedLimit); index += 1) {
            LeaderboardEntryResponse entry = entries.get(index);
            ranked.add(new LeaderboardEntryResponse(index + 1, entry.userId(), entry.fullName(), entry.learnedWords(),
                    entry.longestStreak(), entry.bestExamScore(), entry.points()));
        }

        return new LeaderboardResponse(scope, POINTS_FORMULA, ranked);
    }
}
