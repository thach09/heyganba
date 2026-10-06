package com.heyganba.model.entity;

import jakarta.persistence.*;
import lombok.*;

/** Published JMdict data, kept separate from reviewed course content. */
@Entity
@Table(name = "dictionary_entries")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DictionaryEntry {
    @Id private Long id;
    @Column(nullable = false, length = 100) private String word;
    @Column(nullable = false, length = 100) private String reading;
    @Column(nullable = false, columnDefinition = "TEXT") private String meaning;
    @Column(name = "search_text", nullable = false, columnDefinition = "TEXT") private String searchText;
    @Column(name = "vietnamese_meaning", columnDefinition = "TEXT") private String vietnameseMeaning;
    @Column(name = "vietnamese_search_text", columnDefinition = "TEXT") private String vietnameseSearchText;
    @Builder.Default @Column(name = "common_rank", nullable = false) private Integer commonRank = 1000;
    @Builder.Default @Column(nullable = false) private Boolean active = true;
}
