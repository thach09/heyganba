package com.heyganba.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(
        name = "character_mastery",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_user_mastery_target", columnNames = {"user_id", "target_type", "target_key"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CharacterMastery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "target_type", nullable = false, length = 20)
    private String targetType; // 'PINYIN', 'HANZI', 'VOCAB'

    @Column(name = "target_key", nullable = false, length = 50)
    private String targetKey;

    @Builder.Default
    @Column(name = "mastery_score", nullable = false)
    private Integer masteryScore = 0; // 0 to 100

    @Builder.Default
    @Column(name = "practice_count", nullable = false)
    private Integer practiceCount = 0;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
