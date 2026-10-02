package com.heyganba.service;

import com.heyganba.common.exception.BadRequestException;
import com.heyganba.dto.admin.AdminExerciseRequest;
import com.heyganba.dto.admin.AdminKanjiRequest;
import com.heyganba.dto.admin.AdminVocabularyRequest;
import com.heyganba.model.entity.*;
import com.heyganba.model.enums.ReviewStatus;
import com.heyganba.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminContentService {

    private final VocabularyRepository vocabularyRepository;
    private final KanjiRepository kanjiRepository;
    private final GrammarExerciseRepository grammarExerciseRepository;
    private final GrammarRuleRepository grammarRuleRepository;
    private final LessonRepository lessonRepository;
    private final AuditLogService auditLogService;

    // ================= VOCABULARY CRUD =================

    @Transactional(readOnly = true)
    public List<Vocabulary> listVocabulary(String query, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        if (query != null && !query.isBlank()) {
            return vocabularyRepository.searchVocabulary(query.trim(), pageable);
        }
        return vocabularyRepository.findAll(pageable).getContent();
    }

    @Transactional
    public Vocabulary createVocabulary(User admin, AdminVocabularyRequest req) {
        Lesson lesson = null;
        if (req.getLessonSlug() != null && !req.getLessonSlug().isBlank()) {
            lesson = lessonRepository.findBySlug(req.getLessonSlug().trim()).orElse(null);
        }

        Vocabulary vocab = Vocabulary.builder()
                .word(req.getWord().trim())
                .reading(req.getReading().trim())
                .meaning(req.getMeaning().trim())
                .sinoVietnamese(req.getSinoVietnamese() != null ? req.getSinoVietnamese().trim() : null)
                .exampleSentence(req.getExampleSentence() != null ? req.getExampleSentence().trim() : null)
                .exampleReading(req.getExampleReading() != null ? req.getExampleReading().trim() : null)
                .exampleMeaning(req.getExampleMeaning() != null ? req.getExampleMeaning().trim() : null)
                .lesson(lesson)
                .reviewStatus(ReviewStatus.APPROVED) // Admin tạo trực tiếp -> APPROVED
                .build();

        Vocabulary saved = vocabularyRepository.save(vocab);
        auditLogService.logAction(admin, "vocabulary", saved.getId(), "CREATE", null, saved.getWord());
        return saved;
    }

    @Transactional
    public Vocabulary updateVocabulary(User admin, Long id, AdminVocabularyRequest req) {
        Vocabulary vocab = vocabularyRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy từ vựng ID: " + id));

        String before = vocab.getWord() + " (" + vocab.getReading() + ")";

        if (req.getLessonSlug() != null && !req.getLessonSlug().isBlank()) {
            Lesson lesson = lessonRepository.findBySlug(req.getLessonSlug().trim()).orElse(null);
            vocab.setLesson(lesson);
        }

        vocab.setWord(req.getWord().trim());
        vocab.setReading(req.getReading().trim());
        vocab.setMeaning(req.getMeaning().trim());
        vocab.setSinoVietnamese(req.getSinoVietnamese() != null ? req.getSinoVietnamese().trim() : null);
        vocab.setExampleSentence(req.getExampleSentence() != null ? req.getExampleSentence().trim() : null);
        vocab.setExampleReading(req.getExampleReading() != null ? req.getExampleReading().trim() : null);
        vocab.setExampleMeaning(req.getExampleMeaning() != null ? req.getExampleMeaning().trim() : null);

        Vocabulary saved = vocabularyRepository.save(vocab);
        String after = saved.getWord() + " (" + saved.getReading() + ")";
        auditLogService.logAction(admin, "vocabulary", saved.getId(), "UPDATE", before, after);
        return saved;
    }

    @Transactional
    public void deleteVocabulary(User admin, Long id) {
        Vocabulary vocab = vocabularyRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy từ vựng ID: " + id));
        String before = vocab.getWord();
        vocabularyRepository.delete(vocab);
        auditLogService.logAction(admin, "vocabulary", id, "DELETE", before, null);
    }

    // ================= KANJI CRUD =================

    @Transactional(readOnly = true)
    public List<Kanji> listKanji(String query, int page, int size) {
        if (query != null && !query.isBlank()) {
            return kanjiRepository.searchWithDetails(query.trim());
        }
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        return kanjiRepository.findAll(pageable).getContent();
    }

    @Transactional
    public Kanji createKanji(User admin, AdminKanjiRequest req) {
        Lesson lesson = null;
        if (req.getLessonSlug() != null && !req.getLessonSlug().isBlank()) {
            lesson = lessonRepository.findBySlug(req.getLessonSlug().trim()).orElse(null);
        }

        Kanji kanji = Kanji.builder()
                .character(req.getCharacter().trim())
                .strokeCount(req.getStrokeCount())
                .onyomi(req.getOnyomi() != null ? req.getOnyomi().trim() : null)
                .kunyomi(req.getKunyomi() != null ? req.getKunyomi().trim() : null)
                .sinoVietnamese(req.getSinoVietnamese() != null ? req.getSinoVietnamese().trim() : null)
                .meaning(req.getMeaning().trim())
                .mnemonic(req.getMnemonic() != null ? req.getMnemonic().trim() : null)
                .lesson(lesson)
                .reviewStatus(ReviewStatus.APPROVED)
                .build();

        Kanji saved = kanjiRepository.save(kanji);
        auditLogService.logAction(admin, "kanji", saved.getId(), "CREATE", null, saved.getCharacter());
        return saved;
    }

    @Transactional
    public Kanji updateKanji(User admin, Long id, AdminKanjiRequest req) {
        Kanji kanji = kanjiRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy Kanji ID: " + id));

        String before = kanji.getCharacter() + " (" + kanji.getMeaning() + ")";

        if (req.getLessonSlug() != null && !req.getLessonSlug().isBlank()) {
            Lesson lesson = lessonRepository.findBySlug(req.getLessonSlug().trim()).orElse(null);
            kanji.setLesson(lesson);
        }

        kanji.setCharacter(req.getCharacter().trim());
        kanji.setStrokeCount(req.getStrokeCount());
        kanji.setOnyomi(req.getOnyomi() != null ? req.getOnyomi().trim() : null);
        kanji.setKunyomi(req.getKunyomi() != null ? req.getKunyomi().trim() : null);
        kanji.setSinoVietnamese(req.getSinoVietnamese() != null ? req.getSinoVietnamese().trim() : null);
        kanji.setMeaning(req.getMeaning().trim());
        kanji.setMnemonic(req.getMnemonic() != null ? req.getMnemonic().trim() : null);

        Kanji saved = kanjiRepository.save(kanji);
        String after = saved.getCharacter() + " (" + saved.getMeaning() + ")";
        auditLogService.logAction(admin, "kanji", saved.getId(), "UPDATE", before, after);
        return saved;
    }

    @Transactional
    public void deleteKanji(User admin, Long id) {
        Kanji kanji = kanjiRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy Kanji ID: " + id));
        String before = kanji.getCharacter();
        kanjiRepository.delete(kanji);
        auditLogService.logAction(admin, "kanji", id, "DELETE", before, null);
    }

    // ================= GRAMMAR EXERCISE CRUD =================

    @Transactional(readOnly = true)
    public List<GrammarExercise> listExercises(String query, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        if (query != null && !query.isBlank()) {
            return grammarExerciseRepository.searchExercises(query.trim(), pageable);
        }
        return grammarExerciseRepository.findAll(pageable).getContent();
    }

    @Transactional
    public GrammarExercise createExercise(User admin, AdminExerciseRequest req) {
        GrammarRule rule = grammarRuleRepository.findById(req.getGrammarRuleId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy điểm ngữ pháp ID: " + req.getGrammarRuleId()));

        GrammarExercise exercise = GrammarExercise.builder()
                .grammarRule(rule)
                .questionText(req.getQuestionText().trim())
                .optionsJson(req.getOptionsJson().trim())
                .correctAnswer(req.getCorrectAnswer().trim())
                .explanation(req.getExplanation() != null ? req.getExplanation().trim() : null)
                .isCommonMistake(Boolean.TRUE.equals(req.getIsCommonMistake()))
                .mistakeCategory(req.getMistakeCategory() != null ? req.getMistakeCategory().trim() : null)
                .reviewStatus(ReviewStatus.APPROVED)
                .build();

        GrammarExercise saved = grammarExerciseRepository.save(exercise);
        auditLogService.logAction(admin, "grammar_exercises", saved.getId(), "CREATE", null, saved.getQuestionText());
        return saved;
    }

    @Transactional
    public GrammarExercise updateExercise(User admin, Long id, AdminExerciseRequest req) {
        GrammarExercise exercise = grammarExerciseRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy bài tập ID: " + id));

        String before = exercise.getQuestionText();

        if (!exercise.getGrammarRule().getId().equals(req.getGrammarRuleId())) {
            GrammarRule rule = grammarRuleRepository.findById(req.getGrammarRuleId())
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy điểm ngữ pháp ID: " + req.getGrammarRuleId()));
            exercise.setGrammarRule(rule);
        }

        exercise.setQuestionText(req.getQuestionText().trim());
        exercise.setOptionsJson(req.getOptionsJson().trim());
        exercise.setCorrectAnswer(req.getCorrectAnswer().trim());
        exercise.setExplanation(req.getExplanation() != null ? req.getExplanation().trim() : null);
        exercise.setIsCommonMistake(Boolean.TRUE.equals(req.getIsCommonMistake()));
        exercise.setMistakeCategory(req.getMistakeCategory() != null ? req.getMistakeCategory().trim() : null);

        GrammarExercise saved = grammarExerciseRepository.save(exercise);
        String after = saved.getQuestionText();
        auditLogService.logAction(admin, "grammar_exercises", saved.getId(), "UPDATE", before, after);
        return saved;
    }

    @Transactional
    public void deleteExercise(User admin, Long id) {
        GrammarExercise exercise = grammarExerciseRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy bài tập ID: " + id));
        String before = exercise.getQuestionText();
        grammarExerciseRepository.delete(exercise);
        auditLogService.logAction(admin, "grammar_exercises", id, "DELETE", before, null);
    }
}
