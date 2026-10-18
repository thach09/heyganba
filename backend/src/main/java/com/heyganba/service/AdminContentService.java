package com.heyganba.service;

import com.heyganba.common.exception.BadRequestException;
import com.heyganba.dto.admin.AdminExerciseRequest;
import com.heyganba.dto.admin.AdminKanjiRequest;
import com.heyganba.dto.admin.AdminReviewQueueItem;
import com.heyganba.dto.admin.AdminVocabularyRequest;
import com.heyganba.model.entity.*;
import com.heyganba.model.enums.ReviewStatus;
import com.heyganba.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminContentService {

    @org.springframework.beans.factory.annotation.Value("${app.legacy-phonetics-enabled:false}")
    private boolean legacyPhoneticsEnabled;
    private final KanaRepository kanaRepository;
    private final VocabularyRepository vocabularyRepository;
    private final KanjiRepository kanjiRepository;
    private final GrammarExerciseRepository grammarExerciseRepository;
    private final GrammarRuleRepository grammarRuleRepository;
    private final LessonRepository lessonRepository;
    private final AuditLogService auditLogService;

    /** Trần số dòng trả về của tab "Cần kiểm" (admin panel) — tránh trả cả bảng khi dữ liệu lớn. */
    private static final int MAX_REVIEW_QUEUE_SIZE = 200;

    // ================= HÀNG ĐỢI KIỂM NỘI DUNG (needs_human_check) =================

    /**
     * Hàng đợi cho tab "Cần kiểm" của admin panel (GET /admin/review-queue).
     *
     * Thứ tự: mọi item `needs_human_check = TRUE` lên ĐẦU (đúng yêu cầu quy trình duyệt), sau đó mới tới phần
     * đã đối chiếu được nguồn — nhờ vậy người biết tiếng Trung không phải tự lọc thủ công.
     *
     * @param limit          số dòng tối đa (chặn trần {@value #MAX_REVIEW_QUEUE_SIZE})
     * @param onlyNeedsCheck true = chỉ trả các item cần người kiểm
     */
    @Transactional(readOnly = true)
    public List<AdminReviewQueueItem> reviewQueue(int limit, boolean onlyNeedsCheck) {
        int capped = Math.min(MAX_REVIEW_QUEUE_SIZE, Math.max(1, limit));
        List<AdminReviewQueueItem> queue = new ArrayList<>(collectQueue(true, capped));
        if (!onlyNeedsCheck && queue.size() < capped) {
            queue.addAll(collectQueue(false, capped - queue.size()));
        }
        return queue;
    }

    private List<AdminReviewQueueItem> collectQueue(boolean needsCheck, int limit) {
        if (limit <= 0) {
            return List.of();
        }
        Pageable pageable = PageRequest.of(0, limit);
        List<AdminReviewQueueItem> items = new ArrayList<>();

        for (Kana kana : legacyPhoneticsEnabled ? kanaRepository.findByNeedsHumanCheckOrderByIdAsc(needsCheck, pageable) : List.<Kana>of()) {
            items.add(new AdminReviewQueueItem("KANA", kana.getId(), kana.getCharacter(),
                    kana.getRomaji() + " · " + kana.getKanaType(), Boolean.TRUE.equals(kana.getNeedsHumanCheck()),
                    kana.getReviewStatus().name(), kana.getSourceRef(), null));
        }
        for (Vocabulary vocab : vocabularyRepository.findByNeedsHumanCheckOrderByIdAsc(needsCheck, pageable)) {
            items.add(new AdminReviewQueueItem("VOCABULARY", vocab.getId(), vocab.getWord(),
                    vocab.getReading() + " · " + vocab.getMeaning(), Boolean.TRUE.equals(vocab.getNeedsHumanCheck()),
                    vocab.getReviewStatus().name(), vocab.getSourceRef(), null));
        }
        for (Kanji kanjiItem : kanjiRepository.findByNeedsHumanCheckOrderByIdAsc(needsCheck, pageable)) {
            items.add(new AdminReviewQueueItem("HANZI", kanjiItem.getId(), kanjiItem.getCharacter(),
                    kanjiItem.getMeaning(), Boolean.TRUE.equals(kanjiItem.getNeedsHumanCheck()),
                    kanjiItem.getReviewStatus().name(), kanjiItem.getSourceRef(), null));
        }
        for (GrammarExercise exercise : grammarExerciseRepository.findByNeedsHumanCheckOrderByIdAsc(needsCheck, pageable)) {
            items.add(new AdminReviewQueueItem("GRAMMAR_EXERCISE", exercise.getId(), exercise.getQuestionText(),
                    exercise.getCorrectAnswer(), Boolean.TRUE.equals(exercise.getNeedsHumanCheck()),
                    exercise.getReviewStatus().name(), exercise.getSourceRef(), exercise.getReviewNote()));
        }
        return items;
    }

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
        vocab.setReviewStatus(ReviewStatus.ARCHIVED);
        vocabularyRepository.save(vocab);
        auditLogService.logAction(admin, "vocabulary", id, "ARCHIVE", before, "ARCHIVED");
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
                .pinyin(req.getPinyin() != null ? req.getPinyin().trim() : null)
                .traditional(req.getTraditional() != null ? req.getTraditional().trim() : null)
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
                .orElseThrow(() -> new BadRequestException("Không tìm thấy chữ Hán ID: " + id));

        String before = kanji.getCharacter() + " (" + kanji.getMeaning() + ")";

        if (req.getLessonSlug() != null && !req.getLessonSlug().isBlank()) {
            Lesson lesson = lessonRepository.findBySlug(req.getLessonSlug().trim()).orElse(null);
            kanji.setLesson(lesson);
        }

        kanji.setCharacter(req.getCharacter().trim());
        kanji.setStrokeCount(req.getStrokeCount());
        kanji.setPinyin(req.getPinyin() != null ? req.getPinyin().trim() : null);
        kanji.setTraditional(req.getTraditional() != null ? req.getTraditional().trim() : null);
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
                .orElseThrow(() -> new BadRequestException("Không tìm thấy chữ Hán ID: " + id));
        String before = kanji.getCharacter();
        kanji.setReviewStatus(ReviewStatus.ARCHIVED);
        kanjiRepository.save(kanji);
        auditLogService.logAction(admin, "kanji", id, "ARCHIVE", before, "ARCHIVED");
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
        exercise.setReviewStatus(ReviewStatus.ARCHIVED);
        grammarExerciseRepository.save(exercise);
        auditLogService.logAction(admin, "grammar_exercises", id, "ARCHIVE", before, "ARCHIVED");
    }

    // ================= PHÊ DUYỆT & TỪ CHỐI HÀNG ĐỢI KIỂM =================

    @Transactional
    public void approveContent(User admin, String contentType, Long id, String note) {
        String type = contentType.toUpperCase().trim();
        switch (type) {
            case "VOCABULARY" -> {
                Vocabulary vocab = vocabularyRepository.findById(id)
                        .orElseThrow(() -> new BadRequestException("Không tìm thấy từ vựng ID: " + id));
                String before = vocab.getReviewStatus().name();
                vocab.setReviewStatus(ReviewStatus.APPROVED);
                vocab.setNeedsHumanCheck(false);
                vocabularyRepository.save(vocab);
                auditLogService.logAction(admin, "vocabulary", id, "APPROVE", before, "APPROVED" + (note != null && !note.isBlank() ? " | " + note.trim() : ""));
            }
            case "KANJI", "HANZI" -> {
                Kanji kanji = kanjiRepository.findById(id)
                        .orElseThrow(() -> new BadRequestException("Không tìm thấy chữ Hán ID: " + id));
                String before = kanji.getReviewStatus().name();
                kanji.setReviewStatus(ReviewStatus.APPROVED);
                kanji.setNeedsHumanCheck(false);
                kanjiRepository.save(kanji);
                auditLogService.logAction(admin, "hanzi", id, "APPROVE", before, "APPROVED" + (note != null && !note.isBlank() ? " | " + note.trim() : ""));
            }
            case "GRAMMAR_EXERCISE", "EXERCISE" -> {
                GrammarExercise exercise = grammarExerciseRepository.findById(id)
                        .orElseThrow(() -> new BadRequestException("Không tìm thấy bài tập ID: " + id));
                String before = exercise.getReviewStatus().name();
                exercise.setReviewStatus(ReviewStatus.APPROVED);
                exercise.setNeedsHumanCheck(false);
                if (note != null && !note.isBlank()) {
                    exercise.setReviewNote(note.trim());
                }
                grammarExerciseRepository.save(exercise);
                auditLogService.logAction(admin, "grammar_exercises", id, "APPROVE", before, "APPROVED" + (note != null && !note.isBlank() ? " | " + note.trim() : ""));
            }
            case "KANA" -> {
                Kana kana = kanaRepository.findById(id)
                        .orElseThrow(() -> new BadRequestException("Không tìm thấy mục phát âm ID: " + id));
                String before = kana.getReviewStatus().name();
                kana.setReviewStatus(ReviewStatus.APPROVED);
                kana.setNeedsHumanCheck(false);
                kanaRepository.save(kana);
                auditLogService.logAction(admin, "kana", id, "APPROVE", before, "APPROVED" + (note != null && !note.isBlank() ? " | " + note.trim() : ""));
            }
            default -> throw new BadRequestException("Loại nội dung không hợp lệ: " + contentType);
        }
    }

    @Transactional
    public void rejectContent(User admin, String contentType, Long id, String note) {
        String type = contentType.toUpperCase().trim();
        switch (type) {
            case "VOCABULARY" -> {
                Vocabulary vocab = vocabularyRepository.findById(id)
                        .orElseThrow(() -> new BadRequestException("Không tìm thấy từ vựng ID: " + id));
                String before = vocab.getReviewStatus().name();
                vocab.setReviewStatus(ReviewStatus.ARCHIVED);
                vocab.setNeedsHumanCheck(false);
                vocabularyRepository.save(vocab);
                auditLogService.logAction(admin, "vocabulary", id, "REJECT", before, "ARCHIVED" + (note != null && !note.isBlank() ? " | " + note.trim() : ""));
            }
            case "KANJI", "HANZI" -> {
                Kanji kanji = kanjiRepository.findById(id)
                        .orElseThrow(() -> new BadRequestException("Không tìm thấy chữ Hán ID: " + id));
                String before = kanji.getReviewStatus().name();
                kanji.setReviewStatus(ReviewStatus.ARCHIVED);
                kanji.setNeedsHumanCheck(false);
                kanjiRepository.save(kanji);
                auditLogService.logAction(admin, "hanzi", id, "REJECT", before, "ARCHIVED" + (note != null && !note.isBlank() ? " | " + note.trim() : ""));
            }
            case "GRAMMAR_EXERCISE", "EXERCISE" -> {
                GrammarExercise exercise = grammarExerciseRepository.findById(id)
                        .orElseThrow(() -> new BadRequestException("Không tìm thấy bài tập ID: " + id));
                String before = exercise.getReviewStatus().name();
                exercise.setReviewStatus(ReviewStatus.ARCHIVED);
                exercise.setNeedsHumanCheck(false);
                if (note != null && !note.isBlank()) {
                    exercise.setReviewNote(note.trim());
                }
                grammarExerciseRepository.save(exercise);
                auditLogService.logAction(admin, "grammar_exercises", id, "REJECT", before, "ARCHIVED" + (note != null && !note.isBlank() ? " | " + note.trim() : ""));
            }
            case "KANA" -> {
                Kana kana = kanaRepository.findById(id)
                        .orElseThrow(() -> new BadRequestException("Không tìm thấy mục phát âm ID: " + id));
                String before = kana.getReviewStatus().name();
                kana.setReviewStatus(ReviewStatus.ARCHIVED);
                kana.setNeedsHumanCheck(false);
                kanaRepository.save(kana);
                auditLogService.logAction(admin, "kana", id, "REJECT", before, "ARCHIVED" + (note != null && !note.isBlank() ? " | " + note.trim() : ""));
            }
            default -> throw new BadRequestException("Loại nội dung không hợp lệ: " + contentType);
        }
    }

    @Transactional
    public int approveAllPending(User admin) {
        int count = 0;
        List<Vocabulary> pendingVocab = vocabularyRepository.findAll().stream()
                .filter(v -> v.getReviewStatus() == ReviewStatus.PENDING_REVIEW || Boolean.TRUE.equals(v.getNeedsHumanCheck()))
                .toList();
        for (Vocabulary v : pendingVocab) {
            v.setReviewStatus(ReviewStatus.APPROVED);
            v.setNeedsHumanCheck(false);
            count++;
        }
        vocabularyRepository.saveAll(pendingVocab);

        List<Kanji> pendingKanji = kanjiRepository.findAll().stream()
                .filter(k -> k.getReviewStatus() == ReviewStatus.PENDING_REVIEW || Boolean.TRUE.equals(k.getNeedsHumanCheck()))
                .toList();
        for (Kanji k : pendingKanji) {
            k.setReviewStatus(ReviewStatus.APPROVED);
            k.setNeedsHumanCheck(false);
            count++;
        }
        kanjiRepository.saveAll(pendingKanji);

        List<GrammarExercise> pendingExercises = grammarExerciseRepository.findAll().stream()
                .filter(e -> e.getReviewStatus() == ReviewStatus.PENDING_REVIEW || Boolean.TRUE.equals(e.getNeedsHumanCheck()))
                .toList();
        for (GrammarExercise e : pendingExercises) {
            e.setReviewStatus(ReviewStatus.APPROVED);
            e.setNeedsHumanCheck(false);
            count++;
        }
        grammarExerciseRepository.saveAll(pendingExercises);

        List<GrammarRule> pendingRules = grammarRuleRepository.findAll().stream()
                .filter(r -> r.getReviewStatus() == ReviewStatus.PENDING_REVIEW)
                .toList();
        for (GrammarRule r : pendingRules) {
            r.setReviewStatus(ReviewStatus.APPROVED);
            count++;
        }
        grammarRuleRepository.saveAll(pendingRules);

        List<Kana> pendingKana = kanaRepository.findAll().stream()
                .filter(k -> k.getReviewStatus() == ReviewStatus.PENDING_REVIEW || Boolean.TRUE.equals(k.getNeedsHumanCheck()))
                .toList();
        for (Kana k : pendingKana) {
            k.setReviewStatus(ReviewStatus.APPROVED);
            k.setNeedsHumanCheck(false);
            count++;
        }
        kanaRepository.saveAll(pendingKana);

        auditLogService.logAction(admin, "curriculum", null, "APPROVE_ALL", "PENDING_REVIEW", "APPROVED (" + count + " mục)");
        return count;
    }
}
