package com.heyganba.service;

import com.heyganba.common.exception.ResourceNotFoundException;
import com.heyganba.common.security.ContentAccess;
import com.heyganba.dto.vocabulary.VocabularyLessonResponse;
import com.heyganba.dto.vocabulary.VocabularyWordResponse;
import com.heyganba.model.entity.Lesson;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.repository.LessonRepository;
import com.heyganba.repository.VocabularyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VocabularyService {

    private final LessonRepository lessonRepository;
    private final VocabularyRepository vocabularyRepository;

    @Transactional(readOnly = true)
    public List<VocabularyLessonResponse> getLessons() {
        List<Lesson> lessons = lessonRepository.findAllByOrderByOrderIndexAsc();
        boolean isAdmin = ContentAccess.canSeePendingReview();

        List<VocabularyLessonResponse> results = new ArrayList<>();
        for (Lesson lesson : lessons) {
            List<Vocabulary> words = vocabularyRepository.findByLessonId(lesson.getId());
            int wordCount = (int) words.stream()
                    .filter(w -> ContentAccess.isVisible(w.getReviewStatus()))
                    .count();

            // Lọc trạng thái duyệt trước khi trả: user thường chỉ thấy bài có từ đã duyệt.
            // Admin thấy đủ các bài kể cả bài đang chờ duyệt.
            if (isAdmin || wordCount > 0) {
                results.add(new VocabularyLessonResponse(
                        lesson.getId(),
                        lesson.getSlug(),
                        lesson.getTitle(),
                        lesson.getDescription(),
                        lesson.getCurriculumLevel().replaceAll("HSK\\s*([1-6])", "HSK $1"),
                        lesson.getOrderIndex(),
                        wordCount
                ));
            }
        }
        return results;
    }

    @Transactional(readOnly = true)
    public List<VocabularyWordResponse> getLessonWords(String slug) {
        Lesson lesson = lessonRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson", "slug", slug));

        List<Vocabulary> words = vocabularyRepository.findByLessonId(lesson.getId());
        List<Vocabulary> visible = ContentAccess.visibleOnly(words, Vocabulary::getReviewStatus);

        return visible.stream()
                .map(VocabularyWordResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public VocabularyWordResponse getWordById(Long id) {
        Vocabulary vocab = vocabularyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vocabulary", "id", id));

        ContentAccess.requireVisible(vocab.getReviewStatus(), "Vocabulary", id);
        return VocabularyWordResponse.from(vocab);
    }
}
