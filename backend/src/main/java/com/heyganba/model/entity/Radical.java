package com.heyganba.model.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "radicals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Radical {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 10)
    private String radical;

    @Column(name = "stroke_count", nullable = false)
    private Integer strokeCount;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, length = 100)
    private String meaning;
}
