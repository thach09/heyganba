package com.heyganba.repository;

import com.heyganba.model.entity.LearningMutationReceipt;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearningMutationReceiptRepository
        extends JpaRepository<LearningMutationReceipt, LearningMutationReceipt.Id> {
}
