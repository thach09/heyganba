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
        SELECT d FROM DictionaryEntry d WHERE d.active = true AND d.searchText LIKE :pattern ESCAPE '\\'
        ORDER BY CASE WHEN d.word = :exact OR d.reading = :exact THEN 0
            WHEN LOCATE(CONCAT(' ', :exact, ' '), CONCAT(' ', d.searchText, ' ')) > 0 THEN 1 ELSE 2 END,
            LENGTH(d.word), d.id
        """)
    Page<DictionaryEntry> search(@Param("pattern") String pattern, @Param("exact") String exact, Pageable page);
}
