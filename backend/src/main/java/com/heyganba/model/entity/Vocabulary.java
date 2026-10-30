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

    @Column(name = "curriculum_version", length = 100)
    private String curriculumVersion;
    @Column(name = "source_version", length = 100)
    private String sourceVersion;
    @Column(name = "lexical_source_ref", columnDefinition = "TEXT")
    private String lexicalSourceRef;
    @Column(name = "meaning_source_ref", columnDefinition = "TEXT")
    private String meaningSourceRef;
    @Column(name = "han_viet_source_ref", columnDefinition = "TEXT")
    private String hanVietSourceRef;
    @Column(name = "example_source_ref", columnDefinition = "TEXT")
    private String exampleSourceRef;
    @Column(name = "provenance_content_sha256", length = 64)
    private String provenanceContentSha256;
    @Column(name = "provenance_recorded_at")
    private Instant provenanceRecordedAt;
    @Column(name = "reviewed_at")
    private Instant reviewedAt;
    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "verification_method", length = 40)
    private String verificationMethod;
    @Column(name = "verification_policy_version", length = 80)
    private String verificationPolicyVersion;
    @Column(name = "verification_evidence_json", columnDefinition = "TEXT")
    private String verificationEvidenceJson;
    @Builder.Default
    @Column(name = "han_viet_verified", nullable = false)
    private Boolean hanVietVerified = false;
    @Builder.Default
    @Column(name = "example_verified", nullable = false)
    private Boolean exampleVerified = false;

    // Retain draft optional fields for administration, but omit them from learner DTOs.
    public String publishedHanViet() { return withheld(hanVietVerified) ? null : getSinoVietnamese(); }
    public String publishedExampleSentence() { return withheld(exampleVerified) ? null : getExampleSentence(); }
    public String publishedExampleReading() { return withheld(exampleVerified) ? null : getExampleReading(); }
    public String publishedExampleMeaning() { return withheld(exampleVerified) ? null : getExampleMeaning(); }
    private boolean withheld(Boolean verified) { return "WEB_CROSS_CHECKED".equals(verificationMethod) && !Boolean.TRUE.equals(verified); }

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
