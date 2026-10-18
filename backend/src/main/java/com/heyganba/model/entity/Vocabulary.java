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

    @Column(name = "dictionary_entry_id", unique = true)
    private Long dictionaryEntryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dictionary_entry_id", insertable = false, updatable = false)
    private DictionaryEntry dictionaryEntry;

    @Column(nullable = false, length = 50)
    private String word;

    @Column(length = 50)
    private String traditional;

    @Column(length = 100)
    private String pinyin;

    @Column(name = "pinyin_normalized", length = 100)
    private String pinyinNormalized;

    @Column(name = "han_viet", length = 100)
    private String hanViet;

    @Column(name = "part_of_speech", length = 30)
    private String partOfSpeech;

    @Column(name = "meaning_vi", columnDefinition = "TEXT")
    private String meaningVi;

    @Builder.Default
    @Column(name = "hsk_level")
    private Integer hskLevel = 1;

    @Builder.Default
    @Column(name = "lesson_number")
    private Integer lessonNumber = 1;

    @Column(name = "example_zh", columnDefinition = "TEXT")
    private String exampleZh;

    @Column(name = "example_pinyin", columnDefinition = "TEXT")
    private String examplePinyin;

    @Column(name = "example_vi", columnDefinition = "TEXT")
    private String exampleVi;

    @Column(name = "audio_url", length = 500)
    private String audioUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    /** Legacy compatibility columns / getters */
    @Column(length = 100)
    private String reading;

    @Column(columnDefinition = "TEXT")
    private String meaning;

    @Column(name = "sino_vietnamese", length = 100)
    private String sinoVietnamese;

    @Column(name = "example_sentence", columnDefinition = "TEXT")
    private String exampleSentence;

    @Column(name = "example_reading", columnDefinition = "TEXT")
    private String exampleReading;

    @Column(name = "example_meaning", columnDefinition = "TEXT")
    private String exampleMeaning;

    public String getReading() {
        return pinyin != null ? pinyin : reading;
    }

    public String getMeaning() {
        return meaningVi != null ? meaningVi : meaning;
    }

    public String getSinoVietnamese() {
        return hanViet != null ? hanViet : sinoVietnamese;
    }

    public String getExampleSentence() {
        return exampleZh != null ? exampleZh : exampleSentence;
    }

    public String getExampleReading() {
        return examplePinyin != null ? examplePinyin : exampleReading;
    }

    public String getExampleMeaning() {
        return exampleVi != null ? exampleVi : exampleMeaning;
    }

    /** Trạng thái duyệt nội dung — mặc định chờ duyệt */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", length = 20)
    private ReviewStatus reviewStatus = ReviewStatus.PENDING_REVIEW;

    @Builder.Default
    @Column(name = "needs_human_check")
    private Boolean needsHumanCheck = false;

    @Column(name = "source_ref", length = 160)
    private String sourceRef;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
