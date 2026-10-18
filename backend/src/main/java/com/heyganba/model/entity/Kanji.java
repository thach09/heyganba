package com.heyganba.model.entity;

import com.heyganba.model.enums.ReviewStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "hanzi")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Kanji {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 10, unique = true)
    private String character;

    @Column(length = 10)
    private String traditional;

    @Column(length = 50)
    private String pinyin;

    @Column(name = "han_viet", length = 100)
    private String hanViet;

    @Column(length = 20)
    private String radical;

    @Column(name = "stroke_count")
    private Integer strokeCount;

    @Builder.Default
    @Column(name = "hsk_level")
    private Integer hskLevel = 1;

    @Column(name = "meaning_vi", columnDefinition = "TEXT")
    private String meaningVi;

    @Column(length = 100)
    private String decomposition;

    @Column(name = "example_words_json", columnDefinition = "TEXT")
    private String exampleWordsJson;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    @Builder.Default
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "kanji_radicals",
            joinColumns = @JoinColumn(name = "kanji_id"),
            inverseJoinColumns = @JoinColumn(name = "radical_id")
    )
    private Set<Radical> radicals = new HashSet<>();

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

    /** Compatibility accessors / mutators for KanjiController / Admin / DTOs */
    public String getSinoVietnamese() {
        return hanViet != null ? hanViet : "";
    }

    public void setSinoVietnamese(String sinoVietnamese) {
        this.hanViet = sinoVietnamese;
    }

    public String getMeaning() {
        return meaningVi != null ? meaningVi : "";
    }

    public void setMeaning(String meaning) {
        this.meaningVi = meaning;
    }

    public String getOnyomi() {
        return pinyin != null ? pinyin : "";
    }

    public void setOnyomi(String onyomi) {
        this.pinyin = onyomi;
    }

    public String getKunyomi() {
        return traditional != null ? traditional : "";
    }

    public void setKunyomi(String kunyomi) {
        this.traditional = kunyomi;
    }

    public String getMnemonic() {
        return decomposition;
    }

    public void setMnemonic(String mnemonic) {
        this.decomposition = mnemonic;
    }

    public static class KanjiBuilder {
        public KanjiBuilder onyomi(String onyomi) {
            this.pinyin = onyomi;
            return this;
        }

        public KanjiBuilder kunyomi(String kunyomi) {
            this.traditional = kunyomi;
            return this;
        }

        public KanjiBuilder sinoVietnamese(String sinoVietnamese) {
            this.hanViet = sinoVietnamese;
            return this;
        }

        public KanjiBuilder meaning(String meaning) {
            this.meaningVi = meaning;
            return this;
        }

        public KanjiBuilder mnemonic(String mnemonic) {
            this.decomposition = mnemonic;
            return this;
        }
    }
}
