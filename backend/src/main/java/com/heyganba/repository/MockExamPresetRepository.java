package com.heyganba.repository;

import com.heyganba.model.entity.MockExamPreset;
import com.heyganba.model.enums.ReviewStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MockExamPresetRepository extends JpaRepository<MockExamPreset, Long> {
    long countByReviewStatus(ReviewStatus reviewStatus);
    long countByNeedsHumanCheckTrue();
    Optional<MockExamPreset> findByHskLevelAndReviewStatus(Integer hskLevel, ReviewStatus reviewStatus);
}
