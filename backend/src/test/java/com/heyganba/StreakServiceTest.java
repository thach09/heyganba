package com.heyganba;

import com.heyganba.model.entity.Streak;
import com.heyganba.model.entity.User;
import com.heyganba.repository.StreakRepository;
import com.heyganba.service.StreakService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit test logic streak (Phase 5) — không cần Spring context, dùng Mockito cho repository.
 * Bao gồm edge case múi giờ: cùng một Instant nhưng "ngày học" khác nhau giữa UTC và Asia/Ho_Chi_Minh.
 */
class StreakServiceTest {

    private static final Instant DAY_1 = Instant.parse("2026-09-27T03:00:00Z");
    private static final Instant DAY_1_EVENING = Instant.parse("2026-09-27T20:00:00Z");
    private static final Instant DAY_2 = Instant.parse("2026-09-28T03:00:00Z");
    private static final Instant DAY_4 = Instant.parse("2026-09-30T03:00:00Z");

    private User user() {
        return User.builder().id(42L).email("streak@heyganba.vn").fullName("Streak User").build();
    }

    private StreakService serviceWithInMemoryStreak(AtomicReference<Streak> holder, String zone) {
        StreakRepository repository = mock(StreakRepository.class);
        when(repository.findByUserId(anyLong())).thenAnswer(invocation -> Optional.ofNullable(holder.get()));
        when(repository.save(any(Streak.class))).thenAnswer(invocation -> {
            Streak saved = invocation.getArgument(0);
            holder.set(saved);
            return saved;
        });
        return new StreakService(repository, zone);
    }

    @Test
    @DisplayName("Hoạt động đầu tiên → streak = 1")
    void firstActivityStartsStreak() {
        AtomicReference<Streak> holder = new AtomicReference<>();
        StreakService service = serviceWithInMemoryStreak(holder, "UTC");

        Streak streak = service.touch(user(), DAY_1);

        assertEquals(1, streak.getCurrentStreak());
        assertEquals(1, streak.getLongestStreak());
        assertEquals(LocalDate.of(2026, 9, 27), streak.getLastActiveDate());
    }

    @Test
    @DisplayName("Học liên tiếp 2 ngày → streak = 2; học 2 lần trong cùng ngày → không tăng")
    void consecutiveDaysIncreaseAndSameDayDoesNot() {
        AtomicReference<Streak> holder = new AtomicReference<>();
        StreakService service = serviceWithInMemoryStreak(holder, "UTC");

        service.touch(user(), DAY_1);
        Streak sameDay = service.touch(user(), DAY_1_EVENING);
        assertEquals(1, sameDay.getCurrentStreak());

        Streak nextDay = service.touch(user(), DAY_2);
        assertEquals(2, nextDay.getCurrentStreak());
        assertEquals(2, nextDay.getLongestStreak());
    }

    @Test
    @DisplayName("Nghỉ quá 1 ngày → reset về 1 nhưng longest_streak được giữ")
    void gapResetsCurrentButKeepsLongest() {
        AtomicReference<Streak> holder = new AtomicReference<>();
        StreakService service = serviceWithInMemoryStreak(holder, "UTC");

        service.touch(user(), DAY_1);
        service.touch(user(), DAY_2);
        Streak afterGap = service.touch(user(), DAY_4);

        assertEquals(1, afterGap.getCurrentStreak());
        assertEquals(2, afterGap.getLongestStreak());
        assertEquals(LocalDate.of(2026, 9, 30), afterGap.getLastActiveDate());
    }

    @Test
    @DisplayName("Mặc định múi giờ 'ngày học' là Asia/Ho_Chi_Minh (quyết định: giờ VN ở mọi môi trường)")
    void defaultZoneIsVietnam() {
        assertEquals("Asia/Ho_Chi_Minh", StreakService.DEFAULT_ZONE);

        StreakService service = new StreakService(null, StreakService.DEFAULT_ZONE);
        assertEquals("Asia/Ho_Chi_Minh", service.zone().getId());
        // 18:00Z ngày 26/09 = 01:00 ngày 27/09 giờ VN
        assertEquals(LocalDate.of(2026, 9, 27), service.today(Instant.parse("2026-09-26T18:00:00Z")));
    }

    @Test
    @DisplayName("Streak reset theo 00:00 giờ VN: 23:59 VN → 00:00 VN là 2 ngày liên tiếp")
    void dailyResetHappensAtVietnamMidnight() {
        AtomicReference<Streak> holder = new AtomicReference<>();
        StreakService service = serviceWithInMemoryStreak(holder, StreakService.DEFAULT_ZONE);

        // 16:59Z = 23:59 ngày 27/09 giờ VN
        Streak first = service.touch(user(), Instant.parse("2026-09-27T16:59:00Z"));
        assertEquals(1, first.getCurrentStreak());
        assertEquals(LocalDate.of(2026, 9, 27), first.getLastActiveDate());

        // 17:00Z = 00:00 ngày 28/09 giờ VN (chỉ hơn 1 phút) → đã sang ngày mới ⇒ streak = 2
        Streak second = service.touch(user(), Instant.parse("2026-09-27T17:00:00Z"));
        assertEquals(2, second.getCurrentStreak());
        assertEquals(LocalDate.of(2026, 9, 28), second.getLastActiveDate());
    }

    @Test
    @DisplayName("Hai lần học trong cùng MỘT ngày giờ VN chỉ tính 1 (dù khác ngày UTC) — chống hồi quy múi giờ")
    void sameVietnamDayCountsOnceEvenAcrossUtcMidnight() {
        AtomicReference<Streak> holder = new AtomicReference<>();
        StreakService service = serviceWithInMemoryStreak(holder, StreakService.DEFAULT_ZONE);

        // 17:30Z ngày 27/09 = 00:30 ngày 28/09 giờ VN
        service.touch(user(), Instant.parse("2026-09-27T17:30:00Z"));
        // 20:00Z ngày 27/09 = 03:00 ngày 28/09 giờ VN (vẫn cùng ngày VN, nhưng đã sang ngày UTC mới)
        Streak second = service.touch(user(), Instant.parse("2026-09-27T20:00:00Z"));

        assertEquals(1, second.getCurrentStreak());
        assertEquals(LocalDate.of(2026, 9, 28), second.getLastActiveDate());
    }
}
