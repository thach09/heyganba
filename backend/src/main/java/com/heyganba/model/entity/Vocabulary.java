package com.heyganba.model.entity;

import com.heyganba.model.enums.ReviewStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "vocabulary")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vocabulary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String word;

    @Column(nullable = false, length = 100)
    private String reading;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String meaning;

    @Column(name = "sino_vietnamese", length = 100)
    private String sinoVietnamese;

    @Column(name = "audio_url", length = 500)
    private String audioUrl;

    @Column(name = "example_sentence", columnDefinition = "TEXT")
    private String exampleSentence;

    @Column(name = "example_reading", columnDefinition = "TEXT")
    private String exampleReading;

    @Column(name = "example_meaning", columnDefinition = "TEXT")
    private String exampleMeaning;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    /** Trạng thái duyệt nội dung — mặc định chờ duyệt (xem {@link com.heyganba.model.enums.ReviewStatus}). */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false, length = 20)
    private ReviewStatus reviewStatus = ReviewStatus.PENDING_REVIEW;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
