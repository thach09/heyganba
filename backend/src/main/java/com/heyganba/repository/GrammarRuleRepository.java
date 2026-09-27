package com.heyganba.repository;

import com.heyganba.model.entity.GrammarRule;
import com.heyganba.model.enums.ReviewStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GrammarRuleRepository extends JpaRepository<GrammarRule, Long> {

    @Query("""
            SELECT r FROM GrammarRule r
            LEFT JOIN FETCH r.lesson l
            ORDER BY l.orderIndex ASC, r.orderIndex ASC
            """)
    List<GrammarRule> findAllWithLesson();

    @Query("""
            SELECT r FROM GrammarRule r
            LEFT JOIN FETCH r.lesson l
            WHERE l.slug = :slug
            ORDER BY r.orderIndex ASC
            """)
    List<GrammarRule> findByLessonSlug(@Param("slug") String slug);

    /** Đếm theo trạng thái duyệt nội dung — dùng cho GET /content/review-status. */
    long countByReviewStatus(ReviewStatus reviewStatus);
}
