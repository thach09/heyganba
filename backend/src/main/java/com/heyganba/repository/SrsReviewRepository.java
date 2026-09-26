package com.heyganba.repository;

import com.heyganba.model.entity.SrsReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface SrsReviewRepository extends JpaRepository<SrsReview, Long> {

    Optional<SrsReview> findByUserIdAndVocabularyId(Long userId, Long vocabularyId);

    @Query("SELECT r FROM SrsReview r JOIN FETCH r.vocabulary WHERE r.user.id = :userId AND r.dueDate <= :now ORDER BY r.dueDate ASC")
    List<SrsReview> findDueReviewsForUser(@Param("userId") Long userId, @Param("now") Instant now);

    long countByUserIdAndDueDateLessThanEqual(Long userId, Instant now);
}
