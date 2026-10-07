package com.heyganba.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.common.exception.ResourceNotFoundException;
import com.heyganba.common.security.ContentAccess;
import com.heyganba.dto.grammar.GrammarCheckResponse;
import com.heyganba.dto.grammar.GrammarExerciseResponse;
import com.heyganba.dto.grammar.GrammarRuleResponse;
import com.heyganba.model.entity.GrammarExercise;
import com.heyganba.model.entity.GrammarRule;
import com.heyganba.model.entity.User;
import com.heyganba.model.enums.ReviewStatus;
import com.heyganba.repository.GrammarExerciseRepository;
import com.heyganba.repository.GrammarRuleRepository;
import com.heyganba.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

/**
 * Phase 4 — Trạm Trợ từ & Ngữ pháp.
 *
 * Nguyên tắc: UI chỉ nhận câu hỏi + lựa chọn, KHÔNG nhận đáp án đúng trước khi chấm;
 * việc chấm điểm do server thực hiện (chuẩn hoá Unicode + bỏ khoảng trắng thừa).
 */
@Service
@RequiredArgsConstructor
public class GrammarService {
    private final org.springframework.context.ApplicationEventPublisher learningEvents;

    private static final Logger log = LoggerFactory.getLogger(GrammarService.class);

    private final GrammarRuleRepository grammarRuleRepository;
    private final GrammarExerciseRepository grammarExerciseRepository;
    private final UserRepository userRepository;
    private final StudyActivityService studyActivityService;
    private final StreakService streakService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<GrammarRuleResponse> getRules(String lessonSlug) {
        List<GrammarRule> rules = (lessonSlug == null || lessonSlug.isBlank())
                ? grammarRuleRepository.findAllWithLesson()
                : grammarRuleRepository.findByLessonSlug(lessonSlug);

        // Nội dung chờ duyệt chỉ admin thấy (xem ContentAccess) — không trả bản nháp cho user thường.
        rules = ContentAccess.visibleOnly(rules, GrammarRule::getReviewStatus);

        return rules.stream()
                .map(rule -> GrammarRuleResponse.from(rule, visibleExerciseCount(rule.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public GrammarRuleResponse getRuleById(Long ruleId) {
        GrammarRule rule = grammarRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("GrammarRule", "id", ruleId));

        ContentAccess.requireVisible(rule.getReviewStatus(), "GrammarRule", ruleId);

        return GrammarRuleResponse.from(rule, visibleExerciseCount(ruleId));
    }

    /**
     * Số bài tập ĐƯỢC PHÉP thấy của 1 điểm ngữ pháp: user thường chỉ đếm câu đã duyệt,
     * nếu không con số hiển thị trên UI cũng là một dạng rò rỉ thông tin về nội dung nháp.
     */
    private long visibleExerciseCount(Long ruleId) {
        return ContentAccess.canSeePendingReview()
                ? grammarExerciseRepository.countByGrammarRuleId(ruleId)
                : grammarExerciseRepository.countByGrammarRuleIdAndReviewStatus(ruleId, ReviewStatus.APPROVED);
    }

    @Transactional(readOnly = true)
    public List<GrammarExerciseResponse> getExercises(Long ruleId, boolean mistakeOnly) {
        List<GrammarExercise> exercises;

        if (ruleId != null) {
            exercises = grammarExerciseRepository.findByRuleIdWithRule(ruleId);
        } else if (mistakeOnly) {
            exercises = grammarExerciseRepository.findCommonMistakesWithRule();
        } else {
            exercises = grammarExerciseRepository.findAll();
        }

        if (mistakeOnly) {
            exercises = exercises.stream().filter(exercise -> Boolean.TRUE.equals(exercise.getIsCommonMistake())).toList();
        }

        exercises = ContentAccess.visibleOnly(exercises, GrammarExercise::getReviewStatus);

        return exercises.stream().map(this::toResponse).toList();
    }

    /**
     * Ghi nhật ký hoạt động + chỉ tính streak khi đủ ngưỡng trong ngày (xem {@link StreakPolicy}).
     *
     * ⚠️ KHÔNG được đổi annotation của method này thành `readOnly = true`: nó INSERT vào study_activities,
     * và PostgreSQL sẽ chặn bằng "cannot execute INSERT in a read-only transaction" (H2 ở test KHÔNG phát hiện).
     * Có guard test `checkAnswerMustStayWritableTransaction` để chặn hồi quy.
     */
    @Transactional(readOnly = false)
    public GrammarCheckResponse checkAnswer(Long userId, Long exerciseId, String userAnswer) {
        GrammarExercise exercise = grammarExerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("GrammarExercise", "id", exerciseId));

        // Không cho chấm điểm bài tập còn chờ duyệt khi không phải admin (tránh lộ cả câu hỏi lẫn đáp án).
        ContentAccess.requireVisible(exercise.getReviewStatus(), "GrammarExercise", exerciseId);

        String submitted = normalize(userAnswer);
        String correct = normalize(exercise.getCorrectAnswer());
        boolean isCorrect = submitted.equals(correct);

        // Ghi nhật ký hoạt động + chỉ tính streak khi đủ ngưỡng trong ngày (xem StreakPolicy).
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Instant now = Instant.now();
        studyActivityService.record(user, StudyActivityService.SOURCE_GRAMMAR, 1, isCorrect ? 1 : 0, now);
        learningEvents.publishEvent(com.heyganba.domain.learning.LearningActivity.grammar(
                userId, exerciseId, exercise.getGrammarRule().getId(), isCorrect, now));
        if (studyActivityService.qualifiesForStreak(userId, now)) {
            streakService.touch(user, now);
        }

        return new GrammarCheckResponse(
                isCorrect,
                exercise.getId(),
                exercise.getGrammarRule().getId(),
                exercise.getGrammarRule().getTitle(),
                exercise.getQuestionText(),
                submitted,
                exercise.getCorrectAnswer(),
                exercise.getExplanation(),
                Boolean.TRUE.equals(exercise.getIsCommonMistake()),
                exercise.getMistakeCategory()
        );
    }

    private GrammarExerciseResponse toResponse(GrammarExercise exercise) {
        return new GrammarExerciseResponse(
                exercise.getId(),
                exercise.getGrammarRule().getId(),
                exercise.getGrammarRule().getTitle(),
                exercise.getQuestionText(),
                parseOptions(exercise.getOptionsJson()),
                Boolean.TRUE.equals(exercise.getIsCommonMistake()),
                exercise.getMistakeCategory(),
                exercise.getReviewStatus() != null ? exercise.getReviewStatus().name() : null
        );
    }

    private List<String> parseOptions(String optionsJson) {
        try {
            return objectMapper.readValue(optionsJson, new TypeReference<List<String>>() {
            });
        } catch (Exception ex) {
            log.error("Không parse được options_json của bài tập ngữ pháp: {}", optionsJson, ex);
            return List.of();
        }
    }

    private static String normalize(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFKC);
        return normalized.trim().toLowerCase(Locale.ROOT);
    }
}
