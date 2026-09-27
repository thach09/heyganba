package com.heyganba.service;

import com.heyganba.dto.streak.StreakResponse;
import com.heyganba.dto.streak.StudyActivityDayResponse;
import com.heyganba.model.entity.Streak;
import com.heyganba.model.entity.StudyActivity;
import com.heyganba.model.entity.User;
import com.heyganba.repository.StreakRepository;
import com.heyganba.repository.StudyActivityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Nhật ký hoạt động học theo ngày + heatmap.
 *
 * Đây là nguồn dữ liệu cho Streak Heatmap ở Trạm Thi thử; bảng `streaks` chỉ giữ số tổng hợp nên không đủ
 * để dựng lịch sử từng ngày.
 */
@Service
@RequiredArgsConstructor
public class StudyActivityService {

    public static final String SOURCE_FLASHCARD = "FLASHCARD";
    public static final String SOURCE_EXAM = "EXAM";
    public static final String SOURCE_GRAMMAR = "GRAMMAR";

    private static final int MAX_HEATMAP_DAYS = 365;

    private final StudyActivityRepository studyActivityRepository;
    private final StreakRepository streakRepository;
    private final StreakService streakService;
    private final StreakPolicy streakPolicy;

    /** Cộng dồn hoạt động trong ngày (theo múi giờ cấu hình ở {@link StreakService}). */
    @Transactional
    public void record(User user, String source, int itemCount, int correctCount, Instant now) {
        if (itemCount <= 0) {
            return;
        }

        LocalDate activityDate = streakService.today(now);
        StudyActivity activity = studyActivityRepository
                .findByUserIdAndActivityDateAndSource(user.getId(), activityDate, source)
                .orElseGet(() -> StudyActivity.builder()
                        .user(user)
                        .activityDate(activityDate)
                        .source(source)
                        .build());

        activity.setItemCount(activity.getItemCount() + itemCount);
        activity.setCorrectCount(activity.getCorrectCount() + correctCount);
        studyActivityRepository.save(activity);
    }

    /**
     * Có đủ điều kiện tính 1 ngày streak chưa (xem {@link StreakPolicy}): ≥10 lượt ôn SRS,
     * hoặc đã nộp 1 lượt thi thử, hoặc ≥10 câu bài tập ngữ pháp trong ngày.
     */
    @Transactional(readOnly = true)
    public boolean qualifiesForStreak(Long userId, Instant now) {
        LocalDate today = streakService.today(now);

        return streakPolicy.qualifies(
                sumItems(userId, today, SOURCE_FLASHCARD),
                sumItems(userId, today, SOURCE_EXAM),
                sumItems(userId, today, SOURCE_GRAMMAR)
        );
    }

    private int sumItems(Long userId, LocalDate date, String source) {
        return studyActivityRepository.findByUserIdAndActivityDateAndSource(userId, date, source)
                .map(StudyActivity::getItemCount)
                .orElse(0);
    }

    @Transactional(readOnly = true)
    public StreakResponse getStreak(Long userId) {
        Streak streak = streakRepository.findByUserId(userId).orElse(null);
        Instant now = Instant.now();
        LocalDate today = streakService.today(now);
        int todaySrsReviews = sumItems(userId, today, SOURCE_FLASHCARD);
        int currentStreak = streakService.calculateEffectiveCurrentStreak(streak, today);

        return new StreakResponse(
                currentStreak,
                streak != null ? streak.getLongestStreak() : 0,
                streak != null ? streak.getLastActiveDate() : null,
                studyActivityRepository.countByUserId(userId),
                streakService.zone().getId(),
                todaySrsReviews,
                streakPolicy.minSrsReviews(),
                qualifiesForStreak(userId, now)
        );
    }

    /** Heatmap N ngày gần nhất; ngày không học vẫn được trả về với số 0 để UI vẽ đủ ô. */
    @Transactional(readOnly = true)
    public List<StudyActivityDayResponse> getHeatmap(Long userId, int days, Instant now) {
        int resolvedDays = Math.max(1, Math.min(days, MAX_HEATMAP_DAYS));
        LocalDate end = streakService.today(now);
        LocalDate start = end.minusDays(resolvedDays - 1L);

        List<StudyActivity> activities = studyActivityRepository
                .findByUserIdAndActivityDateGreaterThanEqualOrderByActivityDateAsc(userId, start);

        Map<LocalDate, int[]> totals = new LinkedHashMap<>();
        for (StudyActivity activity : activities) {
            int[] sums = totals.computeIfAbsent(activity.getActivityDate(), key -> new int[2]);
            sums[0] += activity.getItemCount();
            sums[1] += activity.getCorrectCount();
        }

        List<StudyActivityDayResponse> heatmap = new ArrayList<>(resolvedDays);
        for (int offset = 0; offset < resolvedDays; offset += 1) {
            LocalDate date = start.plusDays(offset);
            int[] sums = totals.getOrDefault(date, new int[2]);
            heatmap.add(new StudyActivityDayResponse(date, sums[0], sums[1]));
        }
        return heatmap;
    }
}
