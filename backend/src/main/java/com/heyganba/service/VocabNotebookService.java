package com.heyganba.service;

import com.heyganba.common.exception.BadRequestException;
import com.heyganba.dto.notebook.*;
import com.heyganba.model.entity.User;
import com.heyganba.model.entity.VocabNotebook;
import com.heyganba.model.entity.VocabNotebookItem;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.repository.UserRepository;
import com.heyganba.repository.VocabNotebookItemRepository;
import com.heyganba.repository.VocabNotebookRepository;
import com.heyganba.repository.VocabularyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VocabNotebookService {

    private final VocabNotebookRepository notebookRepository;
    private final VocabNotebookItemRepository itemRepository;
    private final VocabularyRepository vocabularyRepository;
    private final UserRepository userRepository;
    private final StudyActivityService studyActivityService;
    private final ExpService expService;
    private final DictionaryService dictionaryService;
    private final com.heyganba.repository.NotebookPracticeSessionRepository practiceSessionRepository;

    @Transactional(readOnly = true)
    public List<VocabNotebookResponse> listNotebooks(Long userId) {
        List<VocabNotebook> userNotebooks = notebookRepository.findByUserIdWithItems(userId);
        List<VocabNotebook> sampleNotebooks = notebookRepository.findPublicSamplesWithItems();

        List<VocabNotebookResponse> result = new ArrayList<>();
        for (VocabNotebook n : sampleNotebooks) {
            result.add(toResponse(n));
        }
        for (VocabNotebook n : userNotebooks) {
            result.add(toResponse(n));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public VocabNotebookResponse getNotebook(Long notebookId, Long userId) {
        VocabNotebook notebook = notebookRepository.findByIdAndAccessible(notebookId, userId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy sổ từ vựng ID: " + notebookId));
        return toResponse(notebook);
    }

    @Transactional
    public VocabNotebookResponse createNotebook(Long userId, CreateNotebookRequest req) {
        User user = userRepository.getReferenceById(userId);
        VocabNotebook notebook = VocabNotebook.builder()
                .user(user)
                .title(req.title().trim())
                .description(req.description() != null ? req.description().trim() : null)
                .isPublicSample(false)
                .build();

        VocabNotebook saved = notebookRepository.save(notebook);
        return toResponse(saved);
    }

    @Transactional
    public VocabNotebookResponse cloneSampleNotebook(Long userId, Long sampleId) {
        VocabNotebook sample = notebookRepository.findById(sampleId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy nhóm từ mẫu ID: " + sampleId));

        if (!Boolean.TRUE.equals(sample.getIsPublicSample())) {
            throw new BadRequestException("Nhóm từ ID: " + sampleId + " không phải là nhóm từ mẫu công khai");
        }

        User user = userRepository.getReferenceById(userId);
        VocabNotebook clone = VocabNotebook.builder()
                .user(user)
                .title(sample.getTitle() + " (Bản sao)")
                .description(sample.getDescription())
                .isPublicSample(false)
                .build();

        VocabNotebook savedNotebook = notebookRepository.save(clone);

        List<VocabNotebookItem> itemsToSave = new ArrayList<>();
        for (VocabNotebookItem item : sample.getItems()) {
            if (!com.heyganba.common.security.ContentAccess.isVisible(item.getVocabulary().getReviewStatus())) continue;
            itemsToSave.add(VocabNotebookItem.builder()
                    .notebook(savedNotebook)
                    .vocabulary(item.getVocabulary())
                    .customNote(item.getCustomNote())
                    .build());
        }
        itemRepository.saveAll(itemsToSave);
        savedNotebook.setItems(itemsToSave);

        return toResponse(savedNotebook);
    }

    @Transactional
    public VocabNotebookResponse addWordToNotebook(Long userId, Long notebookId, AddNotebookItemRequest req) {
        VocabNotebook notebook = notebookRepository.findById(notebookId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy sổ từ vựng ID: " + notebookId));

        if (notebook.getUser() == null || !notebook.getUser().getId().equals(userId)) {
            throw new BadRequestException("Bạn không có quyền chỉnh sửa sổ từ vựng này");
        }

        Vocabulary vocab = dictionaryService.resolveNotebookWord(req.vocabularyId());

        if (itemRepository.findByNotebookIdAndVocabularyId(notebookId, vocab.getId()).isPresent()) {
            throw new BadRequestException("Từ vựng này đã có trong sổ tay của bạn");
        }

        VocabNotebookItem item = VocabNotebookItem.builder()
                .notebook(notebook)
                .vocabulary(vocab)
                .customNote(req.customNote() != null ? req.customNote().trim() : null)
                .build();

        itemRepository.save(item);
        notebook.getItems().add(item);
        return toResponse(notebook);
    }

    @Transactional
    public void removeWordFromNotebook(Long userId, Long notebookId, Long vocabularyId) {
        VocabNotebook notebook = notebookRepository.findById(notebookId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy sổ từ vựng ID: " + notebookId));

        if (notebook.getUser() == null || !notebook.getUser().getId().equals(userId)) {
            throw new BadRequestException("Bạn không có quyền chỉnh sửa sổ từ vựng này");
        }

        itemRepository.deleteByNotebookIdAndVocabularyId(notebookId, vocabularyId);
    }

    @Transactional
    public void deleteNotebook(Long userId, Long notebookId) {
        VocabNotebook notebook = notebookRepository.findById(notebookId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy sổ từ vựng ID: " + notebookId));

        if (notebook.getUser() == null || !notebook.getUser().getId().equals(userId)) {
            throw new BadRequestException("Bạn không có quyền xoá sổ từ vựng này");
        }

        notebookRepository.delete(notebook);
    }

    /**
     * Luyện tập từ vựng tự chọn theo nhóm/sổ tay:
     * - Ghi nhận nhật ký học tập (StudyActivity) và tích luỹ EXP.
     * - TUYỆT ĐỐI KHÔNG cập nhật bảng srs_reviews hay can thiệp lịch due-date của thuật toán SRS chính.
     */
    @Transactional
    public PracticeResultResponse recordPracticeResult(Long userId, Long notebookId, NotebookPracticeResultRequest req) {
        VocabNotebook notebook = notebookRepository.findByIdAndAccessible(notebookId, userId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy sổ từ vựng ID: " + notebookId));

        // Serialize submissions for one account, including retries from multiple devices.
        User user = userRepository.findLockedById(userId).orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản"));
        var previous = practiceSessionRepository.findById(req.sessionId());
        if (previous.isPresent()) {
            var p = previous.get();
            if (!p.getUserId().equals(userId) || !p.getNotebookId().equals(notebookId)) throw new BadRequestException("Phiên luyện tập không hợp lệ");
            return practiceResponse(notebook, p.getCorrectCount(), p.getTotalCount(), p.getExpEarned());
        }
        var items = notebook.getItems().stream().collect(java.util.stream.Collectors.toMap(i -> i.getVocabulary().getId(), i -> i));
        var seen = new java.util.HashSet<Long>();
        int correct = 0;
        for (var answer : req.answers()) {
            var item = items.get(answer.vocabularyId());
            if (item == null || !seen.add(answer.vocabularyId())) throw new BadRequestException("Từ luyện tập không thuộc sổ hoặc bị lặp");
            var word = item.getVocabulary();
            com.heyganba.common.security.ContentAccess.requireVisible(word.getReviewStatus(), "Vocabulary", word.getId());
            String expected = answer.kind() == NotebookPracticeResultRequest.Kind.READING ? word.getReading() : word.getMeaning();
            boolean right = java.text.Normalizer.normalize(answer.answer().trim(), java.text.Normalizer.Form.NFKC)
                    .equals(java.text.Normalizer.normalize(expected.trim(), java.text.Normalizer.Form.NFKC));
            if (right) correct++;
            if (!Boolean.TRUE.equals(notebook.getIsPublicSample())) {
                item.setPracticeCount(item.getPracticeCount() + 1);
                item.setCorrectCount(item.getCorrectCount() + (right ? 1 : 0));
                item.setLastPracticedAt(java.time.Instant.now());
            }
        }
        int total = req.answers().size();
        int expEarned = correct * expService.getExerciseCorrectExp();
        practiceSessionRepository.save(com.heyganba.model.entity.NotebookPracticeSession.builder()
                .id(req.sessionId()).userId(userId).notebookId(notebookId).correctCount(correct).totalCount(total).expEarned(expEarned).build());

        // Ghi nhận hoạt động vào streak heatmap (nguồn KANA / GRAMMAR / NOTEBOOK)
        studyActivityService.record(user, "NOTEBOOK", total, correct, java.time.Instant.now());

        return practiceResponse(notebook, correct, total, expEarned);
    }

    private PracticeResultResponse practiceResponse(VocabNotebook notebook, int correct, int total, int expEarned) {

        return new PracticeResultResponse(
                notebook.getId(),
                notebook.getTitle(),
                correct,
                total,
                expEarned,
                "Luyện tập tự do hoàn thành. Lịch ôn tập SRS chính không bị ảnh hưởng."
        );
    }

    public record PracticeResultResponse(
            Long notebookId,
            String notebookTitle,
            int correctCount,
            int totalCount,
            int expEarned,
            String note
    ) {
    }

    private VocabNotebookResponse toResponse(VocabNotebook n) {
        List<VocabNotebookItemResponse> itemDtos = n.getItems() != null ? n.getItems().stream()
                .filter(i -> com.heyganba.common.security.ContentAccess.isVisible(i.getVocabulary().getReviewStatus()))
                .map(i -> {
                    Vocabulary v = i.getVocabulary();
                    return VocabNotebookItemResponse.builder()
                            .id(i.getId())
                            .vocabularyId(v.getId())
                            .word(v.getWord())
                            .reading(v.getReading())
                            .meaning(v.getMeaning())
                            .sinoVietnamese(v.getSinoVietnamese())
                            .exampleSentence(v.getExampleSentence())
                            .exampleReading(v.getExampleReading())
                            .exampleMeaning(v.getExampleMeaning())
                            .customNote(i.getCustomNote())
                            .practiceCount(i.getPracticeCount())
                            .correctCount(i.getCorrectCount())
                            .lastPracticedAt(i.getLastPracticedAt())
                            .meaningLanguage(v.getDictionaryEntryId() == null ? "vi" : "en")
                            .build();
                })
                .toList() : List.of();

        return VocabNotebookResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .description(n.getDescription())
                .isPublicSample(Boolean.TRUE.equals(n.getIsPublicSample()))
                .itemCount(itemDtos.size())
                .createdAt(n.getCreatedAt())
                .items(itemDtos)
                .build();
    }
}
