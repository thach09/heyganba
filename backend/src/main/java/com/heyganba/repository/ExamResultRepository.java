package com.heyganba.repository;

import com.heyganba.model.entity.ExamResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamResultRepository extends JpaRepository<ExamResult, Long> {

    Optional<ExamResult> findByExamId(Long examId);

    Optional<ExamResult> findByIdAndUserId(Long id, Long userId);

    List<ExamResult> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** Điểm cao nhất của từng user — dùng cho leaderboard (chạy trên Postgres, thay bằng Redis Sorted Set sau). */
    @Query("""
            SELECT r.user.id, MAX(r.scorePercent)
            FROM ExamResult r
            GROUP BY r.user.id
            """)
    List<Object[]> findBestScorePerUser();

    long countByUserId(Long userId);
}
