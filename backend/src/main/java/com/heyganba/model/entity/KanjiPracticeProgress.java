package com.heyganba.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/** Tiến độ luyện viết 1 kanji của 1 user (Phase 3). */
@Entity
@Table(
        name = "kanji_practice_progress",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_kanji_progress_user_kanji", columnNames = {"user_id", "kanji_id"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KanjiPracticeProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "kanji_id", nullable = false)
    private Kanji kanji;

    @Builder.Default
    @Column(name = "practice_count", nullable = false)
    private Integer practiceCount = 0;

    @Column(name = "last_practiced_at")
    private Instant lastPracticedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
