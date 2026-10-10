package com.heyganba.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/** Original results of committed Grammar/SRS actions, scoped to the authenticated learner. */
@Entity
@Table(name = "learning_mutation_receipts")
@IdClass(LearningMutationReceipt.Id.class)
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LearningMutationReceipt {
    @jakarta.persistence.Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;

    @jakarta.persistence.Id
    @Column(nullable = false, length = 16)
    private String operation;

    @jakarta.persistence.Id
    @Column(name = "attempt_id", nullable = false)
    private UUID attemptId;

    @Column(name = "content_id", nullable = false)
    private Long contentId;

    @Column(name = "request_value", nullable = false, length = 200)
    private String requestValue;

    @Column(name = "response_json", nullable = false, columnDefinition = "text")
    private String responseJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Id implements Serializable {
        private Long userId;
        private String operation;
        private UUID attemptId;
    }
}
