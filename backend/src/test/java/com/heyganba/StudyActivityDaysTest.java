package com.heyganba;

import com.heyganba.model.entity.Role;
import com.heyganba.model.entity.User;
import com.heyganba.model.enums.RoleName;
import com.heyganba.service.StudyActivityService;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Exercises persisted rows through the real repository on H2 and PostgreSQL/Flyway. */
class StudyActivityDaysTest extends ContentApiTestBase {
    @Autowired
    private StudyActivityService activityService;

    private User learner(String email, Role role) {
        return userRepository.save(User.builder().email(email).fullName("QA learner")
                .passwordHash("not-used-for-login").role(role).build());
    }

    @Test
    void multipleSourcesOnOneStudyDateCountAsOneActiveDay() {
        Role role = roleRepository.save(Role.builder().name(RoleName.ROLE_USER).description("User").build());
        User first = learner("qa.days.first@test.invalid", role);
        User other = learner("qa.days.other@test.invalid", role);
        Instant morning = Instant.parse("2026-10-07T17:05:00Z"); // 00:05 Oct 8 in Vietnam.
        Instant evening = Instant.parse("2026-10-08T16:55:00Z"); // 23:55 on the same study day.
        activityService.record(first, StudyActivityService.SOURCE_GRAMMAR, 1, 1, morning);
        activityService.record(first, StudyActivityService.SOURCE_EXAM, 10, 7, evening);
        activityService.record(first, StudyActivityService.SOURCE_GRAMMAR, 1, 0, evening);
        activityService.record(other, StudyActivityService.SOURCE_EXAM, 10, 5, morning.minusSeconds(86400));

        assertEquals(2, studyActivityRepository.countByUserId(first.getId()));
        assertEquals(1, studyActivityRepository.countDistinctActivityDatesByUserId(first.getId()));
        assertEquals(LocalDate.of(2026, 10, 8), studyActivityRepository.findByUserId(first.getId()).getFirst().getActivityDate());
        assertEquals(1, activityService.getStreak(first.getId()).activeDays());
        assertEquals("Asia/Ho_Chi_Minh", activityService.getStreak(first.getId()).zone());

        activityService.record(first, StudyActivityService.SOURCE_FLASHCARD, 1, 1,
                Instant.parse("2026-10-08T17:05:00Z")); // Next study day; UTC date is unchanged.
        assertEquals(2, activityService.getStreak(first.getId()).activeDays());
        assertEquals(2, studyActivityRepository.countDistinctActivityDatesByUserId(first.getId()));
        assertEquals(1, activityService.getStreak(other.getId()).activeDays());
    }

    @Test
    void noActivitiesHaveZeroActiveDays() {
        Role role = roleRepository.save(Role.builder().name(RoleName.ROLE_USER).description("User").build());
        User user = learner("qa.days.empty@test.invalid", role);
        assertEquals(0, activityService.getStreak(user.getId()).activeDays());
    }
}
