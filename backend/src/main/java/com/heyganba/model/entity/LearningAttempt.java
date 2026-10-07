package com.heyganba.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "learning_attempts")
@Getter
@NoArgsConstructor
public class LearningAttempt {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;
    @Column(name = "contract_version", nullable = false) private Integer contractVersion;
    @Column(name = "activity_type", nullable = false, length = 24) private String activityType;
    @Column(name = "content_ref", nullable = false, length = 64) private String contentRef;
    @Column(name = "skill_ref", length = 64) private String skillRef;
    @Column(nullable = false, length = 16) private String result;
    @Column(name = "occurred_at", nullable = false) private Instant occurredAt;
    @Column(nullable = false, length = 16) private String module;
}
