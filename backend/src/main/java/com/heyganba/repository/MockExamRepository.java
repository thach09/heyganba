package com.heyganba.repository;

import com.heyganba.model.entity.MockExam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MockExamRepository extends JpaRepository<MockExam, Long> {

    List<MockExam> findByUserIdOrderByStartedAtDesc(Long userId);

    Optional<MockExam> findByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);
}
