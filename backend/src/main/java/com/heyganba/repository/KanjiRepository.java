package com.heyganba.repository;

import com.heyganba.model.entity.Kanji;
import com.heyganba.model.enums.ReviewStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KanjiRepository extends JpaRepository<Kanji, Long> {

    @Query("""
            SELECT DISTINCT k FROM Kanji k
            LEFT JOIN FETCH k.radicals
            LEFT JOIN FETCH k.lesson
            ORDER BY k.id ASC
            """)
    List<Kanji> findAllWithDetails();

    @Query("""
            SELECT DISTINCT k FROM Kanji k
            LEFT JOIN FETCH k.radicals
            LEFT JOIN FETCH k.lesson l
            WHERE l.slug = :slug
            ORDER BY k.id ASC
            """)
    List<Kanji> findByLessonSlugWithDetails(@Param("slug") String slug);

    @Query("""
            SELECT DISTINCT k FROM Kanji k
            LEFT JOIN FETCH k.radicals
            LEFT JOIN FETCH k.lesson l
            WHERE k.id IN (SELECT k2.id FROM Kanji k2 JOIN k2.radicals r WHERE r.id = :radicalId)
            ORDER BY l.orderIndex ASC, k.id ASC
            """)
    List<Kanji> findByRadicalIdWithDetails(@Param("radicalId") Long radicalId);

    /** Tìm theo nghĩa tiếng Việt, Hán Việt, chữ Hán hoặc cách đọc. */
    @Query("""
            SELECT DISTINCT k FROM Kanji k
            LEFT JOIN FETCH k.radicals
            LEFT JOIN FETCH k.lesson
            WHERE LOWER(k.meaning) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(k.sinoVietnamese) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR k.character LIKE CONCAT('%', :keyword, '%')
               OR k.onyomi LIKE CONCAT('%', :keyword, '%')
               OR k.kunyomi LIKE CONCAT('%', :keyword, '%')
            ORDER BY k.id ASC
            """)
    List<Kanji> searchWithDetails(@Param("keyword") String keyword);

    boolean existsByCharacter(String character);

    /** Đếm theo trạng thái duyệt nội dung — dùng cho GET /content/review-status. */
    long countByReviewStatus(ReviewStatus reviewStatus);
}
