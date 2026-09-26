package com.heyganba.model.entity;

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

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
