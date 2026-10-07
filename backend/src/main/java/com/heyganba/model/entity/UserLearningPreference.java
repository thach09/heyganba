package com.heyganba.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.Instant;
import java.time.LocalTime;

@Entity
@Table(name = "user_learning_preferences")
@Getter
@NoArgsConstructor
public class UserLearningPreference {
    @Id @Column(name = "user_id") private Long userId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;
    @Column(name = "daily_study_minutes") private Integer dailyStudyMinutes;
    @Column(name = "reminder_opt_in", nullable = false) private boolean reminderOptIn;
    @Column(name = "reminder_time") private LocalTime reminderTime;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
}
