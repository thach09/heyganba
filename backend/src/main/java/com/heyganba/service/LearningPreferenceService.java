package com.heyganba.service;

import com.heyganba.common.exception.ResourceNotFoundException;
import com.heyganba.dto.user.LearningPreferenceRequest;
import com.heyganba.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Time;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class LearningPreferenceService {
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private final JdbcTemplate jdbc;
    private final UserRepository users;

    @Transactional(readOnly = true)
    public Preferences get(Long learner) {
        return jdbc.query("SELECT daily_study_minutes, reminder_opt_in, reminder_time FROM user_learning_preferences WHERE user_id=?",
                (row, i) -> new Preferences(row.getObject(1, Integer.class), row.getBoolean(2),
                        row.getTime(3) == null ? null : row.getTime(3).toLocalTime().format(TIME), "Asia/Ho_Chi_Minh"),
                learner).stream().findFirst().orElse(new Preferences(null, false, null, "Asia/Ho_Chi_Minh"));
    }

    @Transactional
    public Preferences update(Long learner, LearningPreferenceRequest request) {
        // Serialize first creation and updates using the existing per-account lock.
        users.findLockedById(learner).orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        Time time = request.reminderTime() == null ? null : Time.valueOf(LocalTime.parse(request.reminderTime()));
        int changed = jdbc.update("UPDATE user_learning_preferences SET daily_study_minutes=?,reminder_opt_in=?,reminder_time=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?",
                request.dailyStudyMinutes(), request.reminderOptIn(), time, learner);
        if (changed == 0) jdbc.update("INSERT INTO user_learning_preferences(user_id,daily_study_minutes,reminder_opt_in,reminder_time,updated_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP)",
                learner, request.dailyStudyMinutes(), request.reminderOptIn(), time);
        return get(learner);
    }
    public record Preferences(Integer dailyStudyMinutes, boolean reminderOptIn, String reminderTime, String studyDayZone) {}
}
