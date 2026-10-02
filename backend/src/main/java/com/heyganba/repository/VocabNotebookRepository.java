package com.heyganba.repository;

import com.heyganba.model.entity.VocabNotebook;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VocabNotebookRepository extends JpaRepository<VocabNotebook, Long> {

    @Query("""
            SELECT n FROM VocabNotebook n
            LEFT JOIN FETCH n.items i
            LEFT JOIN FETCH i.vocabulary
            WHERE n.user.id = :userId
            ORDER BY n.createdAt DESC
            """)
    List<VocabNotebook> findByUserIdWithItems(@Param("userId") Long userId);

    @Query("""
            SELECT n FROM VocabNotebook n
            LEFT JOIN FETCH n.items i
            LEFT JOIN FETCH i.vocabulary
            WHERE n.isPublicSample = true
            ORDER BY n.id ASC
            """)
    List<VocabNotebook> findPublicSamplesWithItems();

    @Query("""
            SELECT n FROM VocabNotebook n
            LEFT JOIN FETCH n.items i
            LEFT JOIN FETCH i.vocabulary
            WHERE n.id = :id AND (n.user.id = :userId OR n.isPublicSample = true)
            """)
    Optional<VocabNotebook> findByIdAndAccessible(@Param("id") Long id, @Param("userId") Long userId);
}
