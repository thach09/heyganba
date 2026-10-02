package com.heyganba.repository;

import com.heyganba.model.entity.Vocabulary;
import com.heyganba.model.enums.ReviewStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VocabularyRepository extends JpaRepository<Vocabulary, Long> {
    List<Vocabulary> findByLessonId(Long lessonId);

    /**
     * Từ vựng user chưa từng ôn (chưa có bản ghi SRS) — dùng để đưa "từ mới" vào phiên ôn hôm nay,
     * ưu tiên theo thứ tự bài học.
     */
    @Query("""
            SELECT v FROM Vocabulary v
            LEFT JOIN FETCH v.lesson
            WHERE v.id NOT IN (SELECT r.vocabulary.id FROM SrsReview r WHERE r.user.id = :userId)
            ORDER BY v.lesson.orderIndex ASC, v.id ASC
            """)
    List<Vocabulary> findNewForUser(@Param("userId") Long userId, Pageable pageable);

    /** Đếm theo trạng thái duyệt nội dung — dùng cho GET /content/review-status. */
    long countByReviewStatus(ReviewStatus reviewStatus);

    @Query("""
            SELECT v FROM Vocabulary v
            LEFT JOIN FETCH v.lesson
            WHERE LOWER(v.word) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(v.reading) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(v.meaning) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(v.sinoVietnamese) LIKE LOWER(CONCAT('%', :query, '%'))
            ORDER BY v.id ASC
            """)
    List<Vocabulary> searchVocabulary(@Param("query") String query, Pageable pageable);
}
