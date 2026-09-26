package com.heyganba.model.entity;

import com.heyganba.model.enums.KanaGroup;
import com.heyganba.model.enums.KanaType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "kana")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Kana {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 10)
    private String character;

    @Column(nullable = false, length = 20)
    private String romaji;

    @Enumerated(EnumType.STRING)
    @Column(name = "kana_type", nullable = false, length = 20)
    private KanaType kanaType;

    @Enumerated(EnumType.STRING)
    @Column(name = "kana_group", nullable = false, length = 30)
    private KanaGroup kanaGroup;

    @Column(name = "audio_url", length = 500)
    private String audioUrl;

    @Column(name = "stroke_order_svg", columnDefinition = "TEXT")
    private String strokeOrderSvg;

    @Builder.Default
    @Column(name = "is_particle_exception", nullable = false)
    private Boolean isParticleException = false;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
