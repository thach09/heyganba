package com.heyganba.repository;

import com.heyganba.model.entity.DictionaryEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DictionaryEntryRepository extends JpaRepository<DictionaryEntry, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM DictionaryEntry d WHERE d.id = :id")
    java.util.Optional<DictionaryEntry> findLockedById(@Param("id") Long id);
    @Query("""
        SELECT d FROM DictionaryEntry d WHERE d.active = true AND
            (d.searchText LIKE :pattern ESCAPE '\\' OR d.vietnameseSearchText LIKE :vietnamesePattern ESCAPE '\\'
                OR LOWER(d.vietnameseMeaning) LIKE :vietnameseRawPattern ESCAPE '\\')
        ORDER BY CASE WHEN d.word = :exact OR d.reading = :exact THEN 0
            WHEN d.word LIKE :prefix ESCAPE '\\' OR d.reading LIKE :prefix ESCAPE '\\' THEN 1
            WHEN d.word LIKE :pattern ESCAPE '\\' OR d.reading LIKE :pattern ESCAPE '\\' THEN 2
            WHEN LOCATE(CONCAT('| ', :vietnameseExact, ' |'), CONCAT('| ', COALESCE(d.vietnameseSearchText, ''), ' |')) > 0
              OR LOWER(d.vietnameseMeaning) = :vietnameseExact THEN 3
            WHEN LOWER(d.meaning) = :exact
              OR LOCATE(CONCAT('| ^ ', :exact, ' |'), CONCAT('| ', d.searchText, ' |')) > 0 THEN 4
            WHEN LOCATE(CONCAT(' ', :vietnameseExact, ' '), CONCAT(' ', COALESCE(d.vietnameseSearchText, ''), ' ')) > 0
              OR LOCATE(CONCAT(' ', :vietnameseExact, ' '), CONCAT(' ', LOWER(COALESCE(d.vietnameseMeaning, '')), ' ')) > 0 THEN 4
            WHEN LOCATE(CONCAT('| = ', :exact, ' |'), CONCAT('| ', d.searchText, ' |')) > 0
              OR LOCATE(CONCAT('| ', :exact, ' |'), CONCAT('| ', d.searchText, ' |')) > 0 THEN 5
            WHEN LOCATE(CONCAT('| ~ ', :exact, ' |'), CONCAT('| ', d.searchText, ' |')) > 0 THEN 6
            WHEN LOCATE(CONCAT(' ', :exact, ' '), CONCAT(' ', d.searchText, ' ')) > 0 THEN 7
            ELSE 8 END,
            d.commonRank, LENGTH(d.word), d.id
        """)
    Page<DictionaryEntry> search(@Param("pattern") String pattern, @Param("vietnamesePattern") String vietnamesePattern,
                                 @Param("vietnameseRawPattern") String vietnameseRawPattern, @Param("prefix") String prefix,
                                 @Param("exact") String exact, @Param("vietnameseExact") String vietnameseExact,
                                 Pageable page);
}
