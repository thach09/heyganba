package com.heyganba.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.common.exception.BadRequestException;
import com.heyganba.common.exception.ResourceNotFoundException;
import com.heyganba.common.security.ContentAccess;
import com.heyganba.dto.exam.ExamGenerateRequest;
import com.heyganba.dto.exam.ExamHistoryResponse;
import com.heyganba.dto.exam.ExamQuestionResponse;
import com.heyganba.dto.exam.ExamResponse;
import com.heyganba.dto.exam.ExamSubmitRequest;
import com.heyganba.dto.exam.ExamSubmitResponse;
import com.heyganba.model.entity.ExamResult;
import com.heyganba.model.entity.GrammarExercise;
import com.heyganba.model.entity.Kana;
import com.heyganba.model.entity.MockExam;
import com.heyganba.model.entity.Streak;
import com.heyganba.model.entity.User;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.repository.ExamResultRepository;
import com.heyganba.repository.GrammarExerciseRepository;
import com.heyganba.repository.KanaRepository;
import com.heyganba.repository.MockExamRepository;
import com.heyganba.repository.StreakRepository;
import com.heyganba.repository.UserRepository;
import com.heyganba.repository.VocabularyRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;

/**
 * Phase 5 — Thi thử.
 *
 * Hướng an toàn đã chốt:
 *  - Đề được sinh CHỈ từ nội dung đã có trong DB (grammar_exercises / kana / vocabulary), không thêm nội dung mới.
 *  - Đáp án giữ ở server trong `mock_exams.questions_json`, client chỉ nhận câu hỏi + lựa chọn.
 *  - Chấm điểm hoàn toàn ở server; nộp lại cùng 1 đề sẽ trả kết quả cũ (idempotent), không cộng điểm 2 lần.
 *  - Không giới hạn thời gian cứng: quá hạn vẫn nộp được nhưng `durationSeconds` bị chặn trần theo thời lượng đề.
 */
@Service
@RequiredArgsConstructor
public class ExamService {

    private static final Logger log = LoggerFactory.getLogger(ExamService.class);

    public static final int MIN_QUESTIONS = 5;
    public static final int MAX_QUESTIONS = 50;
    public static final int DEFAULT_QUESTIONS = 20;
    public static final int MIN_DURATION_MINUTES = 5;
    public static final int MAX_DURATION_MINUTES = 120;
    public static final int DEFAULT_DURATION_MINUTES = 20;

    private static final int OPTION_COUNT = 4;
    private static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    private static final String STATUS_SUBMITTED = "SUBMITTED";
    private static final String TYPE_GRAMMAR = "GRAMMAR";
    private static final String TYPE_KANA = "KANA";
    private static final String TYPE_VOCABULARY = "VOCABULARY";

    private final MockExamRepository mockExamRepository;
    private final ExamResultRepository examResultRepository;
    private final GrammarExerciseRepository grammarExerciseRepository;
    private final KanaRepository kanaRepository;
    private final VocabularyRepository vocabularyRepository;
    private final UserRepository userRepository;
    private final StreakRepository streakRepository;
    private final StudyActivityService studyActivityService;
    private final StreakService streakService;
    private final ObjectMapper objectMapper;

    private final Random random = new Random();

    /**
     * Câu hỏi lưu trong DB (có đáp án) và dùng nội bộ để chấm điểm. Public để Jackson đọc lại từ JSON.
     *
     * `audioText` là text để phát bằng TTS (placeholder — xem ExamQuestionResponse).
     */
    public record Question(
            int index,
            String type,
            String questionText,
            List<String> options,
            String correctAnswer,
            String explanation,
            String audioText
    ) {
    }

    @Transactional
    public ExamResponse generate(Long userId, ExamGenerateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        int totalQuestions = clamp(request.totalQuestions(), MIN_QUESTIONS, MAX_QUESTIONS, DEFAULT_QUESTIONS);
        int durationMinutes = clamp(request.durationMinutes(), MIN_DURATION_MINUTES, MAX_DURATION_MINUTES, DEFAULT_DURATION_MINUTES);

        List<Question> questions = buildQuestions(totalQuestions);
        if (questions.isEmpty()) {
            throw new BadRequestException("Chưa có nội dung trong hệ thống để sinh đề thi thử.");
        }

        Instant now = Instant.now();
        MockExam exam = mockExamRepository.save(MockExam.builder()
                .user(user)
                .totalQuestions(questions.size())
                .durationMinutes(durationMinutes)
                .status(STATUS_IN_PROGRESS)
                .questionsJson(writeJson(questions))
                .startedAt(now)
                .build());

        return toExamResponse(exam, questions);
    }

    // -----------------------------------------------------------------
    // Nộp bài, lịch sử thi, xem lại kết quả
    // -----------------------------------------------------------------
    @Transactional
    public ExamSubmitResponse submit(Long userId, Long examId, ExamSubmitRequest request) {
        MockExam exam = mockExamRepository.findByIdAndUserId(examId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("MockExam", "id", examId));

        // Nộp lại cùng đề → trả kết quả đã chấm (idempotent), KHÔNG cộng điểm/streak lần thứ hai.
        Optional<ExamResult> existing = examResultRepository.findByExamId(examId);
        if (existing.isPresent()) {
            return toSubmitResponse(exam, existing.get());
        }

        List<Question> questions = readJson(exam.getQuestionsJson(), new TypeReference<List<Question>>() {
        });

        Map<Integer, String> submitted = new HashMap<>();
        for (ExamSubmitRequest.Answer answer : request.answers()) {
            Integer index = answer.index();
            if (index != null && index >= 0 && index < questions.size()) {
                submitted.put(index, answer.answer() == null ? "" : answer.answer());
            }
        }

        int correctCount = 0;
        List<ExamSubmitResponse.QuestionResult> details = new ArrayList<>();
        for (Question question : questions) {
            String given = submitted.getOrDefault(question.index(), "");
            boolean correct = !given.isBlank() && normalize(given).equals(normalize(question.correctAnswer()));
            if (correct) {
                correctCount += 1;
            }
            details.add(new ExamSubmitResponse.QuestionResult(question.index(), question.type(), question.questionText(),
                    given, question.correctAnswer(), question.explanation(), correct));
        }

        Instant now = Instant.now();
        double scorePercent = round1(questions.isEmpty() ? 0 : correctCount * 100.0 / questions.size());
        int durationSeconds = (int) Math.max(0, Math.min(
                Duration.between(exam.getStartedAt(), now).getSeconds(),
                exam.getDurationMinutes() * 60L));

        exam.setStatus(STATUS_SUBMITTED);
        exam.setSubmittedAt(now);
        mockExamRepository.save(exam);

        ExamResult result = examResultRepository.save(ExamResult.builder()
                .exam(exam)
                .user(exam.getUser())
                .correctCount(correctCount)
                .totalCount(questions.size())
                .scorePercent(scorePercent)
                .durationSeconds(durationSeconds)
                .detailsJson(writeJson(details))
                .build());

        studyActivityService.record(exam.getUser(), StudyActivityService.SOURCE_EXAM, questions.size(), correctCount, now);
        Streak streak = streakService.touch(exam.getUser(), now);

        return toSubmitResponse(exam, result, streak.getCurrentStreak());
    }

    @Transactional(readOnly = true)
    public List<ExamHistoryResponse> getHistory(Long userId) {
        return examResultRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(result -> new ExamHistoryResponse(
                        result.getExam().getId(),
                        result.getCorrectCount(),
                        result.getTotalCount(),
                        result.getScorePercent(),
                        result.getExam().getDurationMinutes(),
                        result.getDurationSeconds(),
                        result.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ExamSubmitResponse getResult(Long userId, Long examId) {
        MockExam exam = mockExamRepository.findByIdAndUserId(examId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("MockExam", "id", examId));
        ExamResult result = examResultRepository.findByExamId(examId)
                .orElseThrow(() -> new ResourceNotFoundException("ExamResult", "examId", examId));

        return toSubmitResponse(exam, result);
    }

    @Transactional(readOnly = true)
    public ExamResponse getExam(Long userId, Long examId) {
        MockExam exam = mockExamRepository.findByIdAndUserId(examId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("MockExam", "id", examId));
        List<Question> questions = readJson(exam.getQuestionsJson(), new TypeReference<List<Question>>() {
        });

        return toExamResponse(exam, questions);
    }

    private ExamSubmitResponse toSubmitResponse(MockExam exam, ExamResult result) {
        return toSubmitResponse(exam, result, currentStreak(exam.getUser().getId()));
    }

    private ExamSubmitResponse toSubmitResponse(MockExam exam, ExamResult result, int currentStreak) {
        List<ExamSubmitResponse.QuestionResult> details = readJson(
                result.getDetailsJson(), new TypeReference<List<ExamSubmitResponse.QuestionResult>>() {
                });

        return new ExamSubmitResponse(
                exam.getId(),
                result.getCorrectCount(),
                result.getTotalCount(),
                result.getScorePercent(),
                result.getDurationSeconds(),
                currentStreak,
                details
        );
    }

    private int currentStreak(Long userId) {
        return streakRepository.findByUserId(userId)
                .map(s -> streakService.calculateEffectiveCurrentStreak(s, streakService.today(Instant.now())))
                .orElse(0);
    }

    // -----------------------------------------------------------------
    // Sinh câu hỏi từ nội dung đã có (grammar / kana / vocabulary)
    // -----------------------------------------------------------------
    private List<Question> buildQuestions(int totalQuestions) {
        int grammarTarget = Math.max(1, (int) Math.round(totalQuestions * 0.4));
        int kanaTarget = Math.max(1, (int) Math.round(totalQuestions * 0.3));
        int vocabularyTarget = Math.max(0, totalQuestions - grammarTarget - kanaTarget);

        List<Question> collected = new ArrayList<>();
        collected.addAll(buildGrammarQuestions(grammarTarget));
        collected.addAll(buildKanaQuestions(kanaTarget));
        collected.addAll(buildVocabularyQuestions(vocabularyTarget));

        if (collected.size() < totalQuestions) {
            collected.addAll(buildGrammarQuestions(totalQuestions - collected.size()));
        }

        Collections.shuffle(collected, random);

        List<Question> questions = new ArrayList<>(collected.size());
        for (int index = 0; index < collected.size(); index += 1) {
            Question question = collected.get(index);
            questions.add(new Question(index, question.type(), question.questionText(), question.options(),
                    question.correctAnswer(), question.explanation(), question.audioText()));
        }
        return questions;
    }

    private List<Question> buildGrammarQuestions(int limit) {
        if (limit <= 0) {
            return List.of();
        }

        List<GrammarExercise> pool = new ArrayList<>(
                ContentAccess.visibleOnly(grammarExerciseRepository.findAll(), GrammarExercise::getReviewStatus));
        Collections.shuffle(pool, random);

        List<Question> questions = new ArrayList<>();
        for (GrammarExercise exercise : pool) {
            if (questions.size() >= limit) {
                break;
            }
            List<String> options = parseOptions(exercise.getOptionsJson());
            if (options.size() < 2) {
                continue;
            }
            questions.add(new Question(0, TYPE_GRAMMAR, exercise.getQuestionText(), shuffleCopy(options),
                    exercise.getCorrectAnswer(), exercise.getExplanation(), null));
        }
        return questions;
    }

    private List<Question> buildKanaQuestions(int limit) {
        if (limit <= 0) {
            return List.of();
        }

        List<Kana> pool = new ArrayList<>(ContentAccess.visibleOnly(kanaRepository.findAll(), Kana::getReviewStatus));
        pool.removeIf(kana -> kana.getRomaji() == null
                || kana.getRomaji().contains("(")
                || kana.getRomaji().contains(" "));
        Collections.shuffle(pool, random);

        List<String> romajiPool = pool.stream().map(Kana::getRomaji).distinct().toList();

        List<Question> questions = new ArrayList<>();
        for (Kana kana : pool) {
            if (questions.size() >= limit) {
                break;
            }
            List<String> options = buildOptions(kana.getRomaji(), romajiPool);
            if (options.size() < 2) {
                continue;
            }
            questions.add(new Question(0, TYPE_KANA, kana.getCharacter(), options, kana.getRomaji(), kana.getNotes(),
                    kana.getCharacter()));
        }
        return questions;
    }

    private List<Question> buildVocabularyQuestions(int limit) {
        if (limit <= 0) {
            return List.of();
        }

        List<Vocabulary> pool = new ArrayList<>(
                ContentAccess.visibleOnly(vocabularyRepository.findAll(), Vocabulary::getReviewStatus));
        Collections.shuffle(pool, random);

        List<String> meaningPool = pool.stream().map(Vocabulary::getMeaning).distinct().toList();

        List<Question> questions = new ArrayList<>();
        for (Vocabulary vocabulary : pool) {
            if (questions.size() >= limit) {
                break;
            }
            List<String> options = buildOptions(vocabulary.getMeaning(), meaningPool);
            if (options.size() < 2) {
                continue;
            }
            String explanation = vocabulary.getReading() + " — " + vocabulary.getSinoVietnamese();
            questions.add(new Question(0, TYPE_VOCABULARY, vocabulary.getWord(), options, vocabulary.getMeaning(),
                    explanation, vocabulary.getWord()));
        }
        return questions;
    }

    private List<String> buildOptions(String correctAnswer, List<String> pool) {
        Set<String> options = new LinkedHashSet<>();
        options.add(correctAnswer);

        List<String> candidates = new ArrayList<>(pool);
        Collections.shuffle(candidates, random);
        for (String candidate : candidates) {
            if (options.size() >= OPTION_COUNT) {
                break;
            }
            options.add(candidate);
        }

        List<String> shuffled = new ArrayList<>(options);
        Collections.shuffle(shuffled, random);
        return shuffled;
    }

    private List<String> shuffleCopy(List<String> source) {
        List<String> copy = new ArrayList<>(source);
        Collections.shuffle(copy, random);
        return copy;
    }

    private ExamResponse toExamResponse(MockExam exam, List<Question> questions) {
        List<ExamQuestionResponse> questionResponses = questions.stream()
                .map(question -> new ExamQuestionResponse(question.index(), question.type(), question.questionText(),
                        question.options(), question.audioText()))
                .toList();

        return new ExamResponse(
                exam.getId(),
                exam.getTotalQuestions(),
                exam.getDurationMinutes(),
                exam.getStartedAt(),
                exam.getStartedAt().plus(Duration.ofMinutes(exam.getDurationMinutes())),
                exam.getStatus(),
                questionResponses
        );
    }

    private List<String> parseOptions(String optionsJson) {
        try {
            return objectMapper.readValue(optionsJson, new TypeReference<List<String>>() {
            });
        } catch (Exception ex) {
            log.error("Không parse được options_json khi sinh đề: {}", optionsJson, ex);
            return List.of();
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new BadRequestException("Không serialize được dữ liệu đề thi.");
        }
    }

    private <T> T readJson(String json, TypeReference<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception ex) {
            throw new BadRequestException("Dữ liệu đề thi bị hỏng, không đọc được.");
        }
    }

    private static int clamp(Integer value, int min, int max, int defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        return Math.max(min, Math.min(value, max));
    }

    private static String normalize(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFKC);
        return normalized.trim().toLowerCase(Locale.ROOT);
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
