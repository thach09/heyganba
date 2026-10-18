package com.heyganba.model.entity;

import com.heyganba.model.enums.ReviewStatus;
import jakarta.persistence.*;
import lombok.*;

/** Reusable practice configuration. User-owned attempts remain in mock_exams. */
@Entity
@Table(name = "mock_exam_presets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MockExamPreset {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "hsk_level", nullable = false, unique = true)
    private Integer hskLevel;
    @Column(name = "maximum_score", nullable = false)
    private Integer maximumScore;
    @Column(name = "passing_score", nullable = false)
    private Integer passingScore;
    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;
    @Column(name = "sections_json", nullable = false, columnDefinition = "TEXT")
    private String sectionsJson;
    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false, length = 20)
    private ReviewStatus reviewStatus;
    @Column(name = "needs_human_check", nullable = false)
    private Boolean needsHumanCheck;
}
