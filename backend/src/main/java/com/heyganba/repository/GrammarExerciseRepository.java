package com.heyganba.repository;

import com.heyganba.model.entity.GrammarExercise;
import com.heyganba.model.enums.ReviewStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GrammarExerciseRepository extends JpaRepository<GrammarExercise, Long> {

    @Query("""
            SELECT e FROM GrammarExercise e
            JOIN FETCH e.grammarRule r
            WHERE r.id = :ruleId
            ORDER BY e.id ASC
            """)
    List<GrammarExercise> findByRuleIdWithRule(@Param("ruleId") Long ruleId);

    @Query("""
            SELECT e FROM GrammarExercise e
            JOIN FETCH e.grammarRule r
            WHERE e.isCommonMistake = true
            ORDER BY r.orderIndex ASC, e.id ASC
            """)
    List<GrammarExercise> findCommonMistakesWithRule();

    long countByGrammarRuleId(Long ruleId);

    /** Đếm bài tập theo trạng thái duyệt — user thường chỉ được thấy số câu đã APPROVED. */
    long countByGrammarRuleIdAndReviewStatus(Long ruleId, ReviewStatus reviewStatus);

    /** Đếm theo trạng thái duyệt nội dung — dùng cho GET /content/review-status. */
    long countByReviewStatus(ReviewStatus reviewStatus);

    @Query("""
            SELECT e FROM GrammarExercise e
            JOIN FETCH e.grammarRule r
            WHERE LOWER(e.questionText) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(e.correctAnswer) LIKE LOWER(CONCAT('%', :query, '%'))
            ORDER BY e.id ASC
            """)
    List<GrammarExercise> searchExercises(@Param("query") String query, org.springframework.data.domain.Pageable pageable);
}
