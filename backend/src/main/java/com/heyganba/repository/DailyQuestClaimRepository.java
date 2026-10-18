package com.heyganba.repository;
import com.heyganba.model.entity.DailyQuestClaim;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
public interface DailyQuestClaimRepository extends JpaRepository<DailyQuestClaim,Long> {
    List<DailyQuestClaim> findByUserIdAndClaimDate(Long userId, LocalDate date);
    List<DailyQuestClaim> findByUserId(Long userId);
}
