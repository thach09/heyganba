package com.heyganba.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.common.exception.BadRequestException;
import com.heyganba.model.entity.LearningMutationReceipt;
import com.heyganba.model.entity.User;
import com.heyganba.repository.LearningMutationReceiptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Called only inside the locked Grammar/SRS mutation transaction; rollback removes its receipt too. */
@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY)
public class LearningMutationReceiptService {
    public static final String GRAMMAR_CHECK = "GRAMMAR_CHECK";
    public static final String SRS_REVIEW = "SRS_REVIEW";

    private final LearningMutationReceiptRepository repository;
    private final ObjectMapper mapper;

    public <T> Optional<T> replay(Long userId, String operation, UUID attemptId,
                                  Long contentId, String requestValue, Class<T> resultType) {
        if (attemptId == null) throw new BadRequestException("attemptId is required");
        return repository.findById(new LearningMutationReceipt.Id(userId, operation, attemptId)).map(receipt -> {
            if (!receipt.getContentId().equals(contentId) || !receipt.getRequestValue().equals(requestValue)) {
                throw new BadRequestException("attemptId was already used for a different action");
            }
            try {
                return mapper.readValue(receipt.getResponseJson(), resultType);
            } catch (JsonProcessingException failure) {
                throw new IllegalStateException("Cannot read learning mutation receipt", failure);
            }
        });
    }

    public void remember(User user, String operation, UUID attemptId, Long contentId,
                         String requestValue, Object result) {
        try {
            repository.save(LearningMutationReceipt.builder()
                    .userId(user.getId()).user(user).operation(operation).attemptId(attemptId)
                    .contentId(contentId).requestValue(requestValue)
                    .responseJson(mapper.writeValueAsString(result)).createdAt(Instant.now()).build());
        } catch (JsonProcessingException failure) {
            throw new IllegalStateException("Cannot save learning mutation receipt", failure);
        }
    }
}
