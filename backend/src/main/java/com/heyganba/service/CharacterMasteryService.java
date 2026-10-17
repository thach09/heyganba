package com.heyganba.service;

import com.heyganba.dto.progress.PracticeProgressRequest;
import com.heyganba.dto.progress.PracticeProgressResponse;
import com.heyganba.dto.progress.UserExpResponse;
import com.heyganba.model.entity.CharacterMastery;
import com.heyganba.model.entity.User;
import com.heyganba.repository.CharacterMasteryRepository;
import com.heyganba.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CharacterMasteryService {

    private final CharacterMasteryRepository masteryRepository;
    private final UserRepository userRepository;
    private final StudyActivityService studyActivityService;
    private final ExpService expService;

    @Transactional
    public PracticeProgressResponse recordPractice(Long userId, PracticeProgressRequest request) {
        User user = userRepository.findLockedById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        String targetType = request.targetType() != null ? request.targetType().toUpperCase() : "HANZI";
        String targetKey = request.targetKey();

        CharacterMastery mastery = masteryRepository
                .findByUserIdAndTargetTypeAndTargetKey(userId, targetType, targetKey)
                .orElseGet(() -> CharacterMastery.builder()
                        .user(user)
                        .targetType(targetType)
                        .targetKey(targetKey)
                        .masteryScore(0)
                        .practiceCount(0)
                        .build());

        mastery.setPracticeCount(mastery.getPracticeCount() + 1);

        int currentScore = mastery.getMasteryScore() != null ? mastery.getMasteryScore() : 0;
        int delta;
        if (Boolean.FALSE.equals(request.isCorrect())) {
            delta = -5;
        } else {
            delta = "VOCAB".equals(targetType) ? 20 : ("HANZI".equals(targetType) ? 15 : 10);
        }

        int newScore = Math.min(100, Math.max(0, currentScore + delta));
        mastery.setMasteryScore(newScore);
        masteryRepository.save(mastery);

        // Award EXP based on practice target: 10 to 20 EXP
        int expAwarded = Boolean.FALSE.equals(request.isCorrect()) ? 0 : expService.getExerciseCorrectExp();
        int correctUnits = Boolean.FALSE.equals(request.isCorrect()) ? 0 : 1; // 1 unit = 10 EXP in ExpConfig
        studyActivityService.record(user, targetType, 1, correctUnits, Instant.now());

        UserExpResponse expResponse = expService.calculateUserExp(userId);

        return new PracticeProgressResponse(
                targetType,
                targetKey,
                newScore,
                mastery.getPracticeCount(),
                expAwarded,
                expResponse.totalExp(),
                expResponse.level(),
                expResponse.expIntoLevel()
        );
    }

    @Transactional(readOnly = true)
    public List<CharacterMastery> getUserMastery(Long userId, String targetType) {
        if (targetType != null && !targetType.isBlank()) {
            return masteryRepository.findByUserIdAndTargetType(userId, targetType.toUpperCase());
        }
        return masteryRepository.findByUserId(userId);
    }
}
