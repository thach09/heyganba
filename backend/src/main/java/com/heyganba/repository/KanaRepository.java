package com.heyganba.repository;

import com.heyganba.model.entity.Kana;
import com.heyganba.model.enums.KanaGroup;
import com.heyganba.model.enums.KanaType;
import com.heyganba.model.enums.ReviewStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface KanaRepository extends JpaRepository<Kana, Long> {
    List<Kana> findByKanaType(KanaType kanaType);
    List<Kana> findByKanaGroup(KanaGroup kanaGroup);
    List<Kana> findByKanaTypeAndKanaGroup(KanaType kanaType, KanaGroup kanaGroup);

    List<Kana> findByKanaTypeOrderByIdAsc(KanaType kanaType);
    List<Kana> findByKanaTypeAndKanaGroupOrderByIdAsc(KanaType kanaType, KanaGroup kanaGroup);
    List<Kana> findAllByOrderByIdAsc();

    Optional<Kana> findByCharacterAndKanaType(String character, KanaType kanaType);

    /** Đếm theo trạng thái duyệt nội dung — dùng cho GET /content/review-status. */
    long countByReviewStatus(ReviewStatus reviewStatus);

    /** Đếm nội dung CẦN người biết tiếng Nhật kiểm (`needs_human_check = true`) — cho tab duyệt của admin. */
    long countByNeedsHumanCheckTrue();

    /** Nội dung theo cờ cần-người-kiểm, xếp theo id — dùng cho GET /admin/review-queue. */
    List<Kana> findByNeedsHumanCheckOrderByIdAsc(Boolean needsHumanCheck, org.springframework.data.domain.Pageable pageable);
}
