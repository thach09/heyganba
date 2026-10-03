package com.heyganba.service;

import com.heyganba.config.ExpConfig;
import com.heyganba.dto.progress.UserExpResponse;
import com.heyganba.model.entity.ExamResult;
import com.heyganba.model.entity.StudyActivity;
import com.heyganba.repository.ExamResultRepository;
import com.heyganba.repository.StudyActivityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ExpService {

    private final ExpConfig expConfig;
    private final StudyActivityRepository studyActivityRepository;
    private final ExamResultRepository examResultRepository;

    private static final int EXP_PER_LEVEL = 1000;

    @Transactional(readOnly = true)
    public UserExpResponse calculateUserExp(Long userId) {
        List<StudyActivity> activities = studyActivityRepository.findByUserId(userId);
        List<ExamResult> exams = examResultRepository.findByUserIdOrderByCreatedAtDesc(userId);

        long exerciseExp = 0;
        long srsExp = 0;

        for (StudyActivity activity : activities) {
            if (StudyActivityService.SOURCE_GRAMMAR.equalsIgnoreCase(activity.getSource())
                    || "KANA".equalsIgnoreCase(activity.getSource())) {
                exerciseExp += (long) activity.getCorrectCount() * expConfig.getExerciseCorrect();
            } else if (StudyActivityService.SOURCE_FLASHCARD.equalsIgnoreCase(activity.getSource())) {
                int sessions = Math.max(1, activity.getItemCount() / 10);
                srsExp += (long) sessions * expConfig.getSrsSession();
            }
        }

        long examExp = 0;
        for (ExamResult exam : exams) {
            double percent = exam.getScorePercent() != null ? exam.getScorePercent() : 0.0;
            examExp += Math.round(expConfig.getExamBase() * (percent / 100.0));
        }

        long totalExp = exerciseExp + srsExp + examExp;
        int level = (int) (totalExp / EXP_PER_LEVEL) + 1;
        long expIntoLevel = totalExp % EXP_PER_LEVEL;

        int rankTier = getRankTier(level);
        String rankName = getRankName(rankTier);

        return UserExpResponse.builder()
                .totalExp(totalExp)
                .level(level)
                .expIntoLevel(expIntoLevel)
                .expForNextLevel(EXP_PER_LEVEL)
                .rankName(rankName)
                .rankTier(rankTier)
                .config(new UserExpResponse.ExpConfigDto(
                        expConfig.getExerciseCorrect(),
                        expConfig.getSrsSession(),
                        expConfig.getExamBase()
                ))
                .build();
    }

    public int getExerciseCorrectExp() {
        return expConfig.getExerciseCorrect();
    }

    public int getSrsSessionExp() {
        return expConfig.getSrsSession();
    }

    public int calculateExamExp(double scorePercent) {
        return (int) Math.round(expConfig.getExamBase() * (scorePercent / 100.0));
    }

    private int getRankTier(int level) {
        if (level <= 2) return 1;
        if (level <= 5) return 2;
        if (level <= 10) return 3;
        if (level <= 20) return 4;
        return 5;
    }

    private String getRankName(int rankTier) {
        return switch (rankTier) {
            case 1 -> "Sơ khởi";
            case 2 -> "Sơ cấp";
            case 3 -> "Trung cấp";
            case 4 -> "Cao cấp";
            default -> "Bậc thầy";
        };
    }
}
