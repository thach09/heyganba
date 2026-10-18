package com.heyganba.repository;

import com.heyganba.model.entity.CharacterMastery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CharacterMasteryRepository extends JpaRepository<CharacterMastery, Long> {
    Optional<CharacterMastery> findByUserIdAndTargetTypeAndTargetKey(Long userId, String targetType, String targetKey);
    List<CharacterMastery> findByUserId(Long userId);
    List<CharacterMastery> findByUserIdAndTargetType(Long userId, String targetType);
}
