package com.heyganba.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Nhật ký hoạt động học theo NGÀY (nguồn dữ liệu cho streak heatmap kiểu GitHub).
 * Mỗi (user, ngày, loại hoạt động) chỉ có 1 bản ghi, số liệu cộng dồn trong ngày.
 */
@Entity
@Table(
        name = "study_activities",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_study_activity_user_date_source",
                        columnNames = {"user_id", "activity_date", "source"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudyActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "activity_date", nullable = false)
    private LocalDate activityDate;

    @Column(nullable = false, length = 20)
    private String source;

    @Builder.Default
    @Column(name = "item_count", nullable = false)
    private Integer itemCount = 0;

    @Builder.Default
    @Column(name = "correct_count", nullable = false)
    private Integer correctCount = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
