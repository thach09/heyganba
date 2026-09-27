package com.heyganba.service;

import com.heyganba.model.entity.Streak;
import com.heyganba.model.entity.User;
import com.heyganba.repository.StreakRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

/**
 * Chuỗi ngày học liên tục (streak).
 *
 * Mốc "một ngày học" lấy theo `app.streak.zone` — **mặc định `Asia/Ho_Chi_Minh`** (quyết định đã chốt:
 * mọi môi trường local/staging/production dùng giờ Việt Nam để reset streak và vẽ heatmap).
 *
 * ⚠️ Lịch sử dữ liệu: các bản ghi `last_active_date` tạo trước khi đổi múi giờ được ghi theo ngày UTC
 * (UTC chậm hơn VN 7 giờ ⇒ ngày UTC ≤ ngày VN). Vì vậy ở lần học đầu tiên sau khi đổi múi giờ, user có thể
 * được cộng tiếp streak (coi như hôm qua) thay vì reset — sai lệch tối đa 1 ngày và tự hết sau 1 ngày.
 */
@Service
public class StreakService {

    public static final String DEFAULT_ZONE = "Asia/Ho_Chi_Minh";

    private final StreakRepository streakRepository;
    private final ZoneId zone;

    public StreakService(StreakRepository streakRepository, @Value("${app.streak.zone:" + DEFAULT_ZONE + "}") String zoneId) {
        this.streakRepository = streakRepository;
        this.zone = ZoneId.of(zoneId);
    }

    public ZoneId zone() {
        return zone;
    }

    public LocalDate today(Instant now) {
        return now.atZone(zone).toLocalDate();
    }

    public Optional<Streak> find(Long userId) {
        return streakRepository.findByUserId(userId);
    }

    /**
     * Tính streak hiện tại thực tế: nếu ngày học gần nhất trước hôm qua (đã bỏ lỡ ít nhất 1 ngày),
     * streak hiện tại đã bị đứt và trở về 0.
     */
    public int calculateEffectiveCurrentStreak(Streak streak, LocalDate today) {
        if (streak == null || streak.getLastActiveDate() == null) {
            return 0;
        }
        LocalDate lastActive = streak.getLastActiveDate();
        if (lastActive.equals(today) || lastActive.equals(today.minusDays(1))) {
            return streak.getCurrentStreak();
        }
        return 0;
    }

    /** Ghi nhận user có hoạt động học hôm nay và trả về streak sau khi cập nhật. */
    public Streak touch(User user, Instant now) {
        Streak streak = streakRepository.findByUserId(user.getId())
                .orElseGet(() -> streakRepository.save(Streak.builder()
                        .user(user)
                        .currentStreak(0)
                        .longestStreak(0)
                        .build()));

        LocalDate today = today(now);
        LocalDate lastActive = streak.getLastActiveDate();

        if (lastActive == null) {
            streak.setCurrentStreak(1);
        } else if (lastActive.equals(today.minusDays(1))) {
            streak.setCurrentStreak(streak.getCurrentStreak() + 1);
        } else if (!lastActive.equals(today)) {
            streak.setCurrentStreak(1);
        }

        streak.setLastActiveDate(today);
        streak.setLongestStreak(Math.max(streak.getLongestStreak(), streak.getCurrentStreak()));

        return streakRepository.save(streak);
    }
}
