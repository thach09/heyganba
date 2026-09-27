package com.heyganba.repository;

import com.heyganba.model.entity.KanjiPracticeProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface KanjiPracticeProgressRepository extends JpaRepository<KanjiPracticeProgress, Long> {

    Optional<KanjiPracticeProgress> findByUserIdAndKanjiId(Long userId, Long kanjiId);

    List<KanjiPracticeProgress> findByUserId(Long userId);

    long countByUserId(Long userId);
}
