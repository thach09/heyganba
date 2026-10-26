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
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM Vocabulary v WHERE v.id = :id")
    java.util.Optional<Vocabulary> findByIdForUpdate(@Param("id") Long id);

    java.util.Optional<Vocabulary> findByDictionaryEntryId(Long dictionaryEntryId);

    @Query("SELECT v FROM Vocabulary v LEFT JOIN FETCH v.lesson WHERE v.dictionaryEntryId IS NULL ORDER BY v.id")
    List<Vocabulary> findCourseWords();

    List<Vocabulary> findByLessonId(Long lessonId);

    List<Vocabulary> findByHskLevel(Integer hskLevel);

    List<Vocabulary> findByHskLevelAndLessonNumber(Integer hskLevel, Integer lessonNumber);

    /**
     * Từ vựng user chưa từng ôn (chưa có bản ghi SRS) — dùng để đưa "từ mới" vào phiên ôn hôm nay,
     * ưu tiên theo thứ tự bài học.
     */
    @Query("""
            SELECT v FROM Vocabulary v
            LEFT JOIN FETCH v.lesson
            WHERE v.dictionaryEntryId IS NULL
              AND (:includePending = true OR v.reviewStatus = com.heyganba.model.enums.ReviewStatus.APPROVED)
              AND v.id NOT IN (SELECT r.vocabulary.id FROM SrsReview r WHERE r.user.id = :userId)
            ORDER BY v.id ASC
            """)
    List<Vocabulary> findVisibleNewForUser(@Param("userId") Long userId, @Param("includePending") boolean includePending, Pageable pageable);

    default List<Vocabulary> findNewForUser(Long userId, Pageable pageable) {
        return findVisibleNewForUser(userId, com.heyganba.common.security.ContentAccess.canSeePendingReview(), pageable);
    }

    /** Đếm theo trạng thái duyệt nội dung — dùng cho GET /content/review-status. */
    long countByReviewStatus(ReviewStatus reviewStatus);

    /** Đếm nội dung CẦN người biết tiếng Trung/Nhật kiểm (`needs_human_check = true`). */
    long countByNeedsHumanCheckTrue();

    /** Nội dung theo cờ cần-người-kiểm, xếp theo id — dùng cho GET /admin/review-queue. */
    List<Vocabulary> findByNeedsHumanCheckOrderByIdAsc(Boolean needsHumanCheck, Pageable pageable);

    /**
     * Multi-mode search: word, traditional, pinyin, pinyin_normalized, han_viet, meaning_vi (case-insensitive)
     */
    @Query("""
            SELECT v FROM Vocabulary v
            LEFT JOIN FETCH v.lesson
            WHERE LOWER(v.word) LIKE LOWER(CONCAT('%', :query, '%'))
               OR (v.traditional IS NOT NULL AND LOWER(v.traditional) LIKE LOWER(CONCAT('%', :query, '%')))
               OR (v.pinyin IS NOT NULL AND LOWER(v.pinyin) LIKE LOWER(CONCAT('%', :query, '%')))
               OR (v.pinyinNormalized IS NOT NULL AND LOWER(v.pinyinNormalized) LIKE LOWER(CONCAT('%', :query, '%')))
               OR (v.hanViet IS NOT NULL AND LOWER(v.hanViet) LIKE LOWER(CONCAT('%', :query, '%')))
               OR (v.meaningVi IS NOT NULL AND LOWER(v.meaningVi) LIKE LOWER(CONCAT('%', :query, '%')))
               OR (v.reading IS NOT NULL AND LOWER(v.reading) LIKE LOWER(CONCAT('%', :query, '%')))
               OR (v.meaning IS NOT NULL AND LOWER(v.meaning) LIKE LOWER(CONCAT('%', :query, '%')))
               OR (v.sinoVietnamese IS NOT NULL AND LOWER(v.sinoVietnamese) LIKE LOWER(CONCAT('%', :query, '%')))
            ORDER BY v.id ASC
            """)
    List<Vocabulary> searchVocabulary(@Param("query") String query, Pageable pageable);
}
