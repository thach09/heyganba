package com.heyganba.repository;

import com.heyganba.model.entity.ReadingPassage;
import com.heyganba.model.enums.ReviewStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReadingPassageRepository extends JpaRepository<ReadingPassage, Long> {
    List<ReadingPassage> findByReviewStatus(ReviewStatus reviewStatus);
    List<ReadingPassage> findByLessonId(Long lessonId);
    List<ReadingPassage> findByLessonIdAndReviewStatus(Long lessonId, ReviewStatus reviewStatus);
}
