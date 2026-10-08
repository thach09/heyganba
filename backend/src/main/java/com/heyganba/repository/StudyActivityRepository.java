package com.heyganba.repository;

import com.heyganba.model.entity.StudyActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudyActivityRepository extends JpaRepository<StudyActivity, Long> {

    Optional<StudyActivity> findByUserIdAndActivityDateAndSource(Long userId, LocalDate activityDate, String source);

    List<StudyActivity> findByUserIdAndActivityDateGreaterThanEqualOrderByActivityDateAsc(Long userId, LocalDate from);

    List<StudyActivity> findByUserId(Long userId);

    long countByUserId(Long userId);

    @Query("select count(distinct a.activityDate) from StudyActivity a where a.user.id = :userId")
    long countDistinctActivityDatesByUserId(@Param("userId") Long userId);
}
