package com.heyganba.service;

import com.heyganba.common.exception.BadRequestException;
import com.heyganba.common.exception.ResourceNotFoundException;
import com.heyganba.common.security.ContentAccess;
import com.heyganba.dto.kanji.KanjiProgressResponse;
import com.heyganba.dto.kanji.KanjiResponse;
import com.heyganba.dto.kanji.RadicalResponse;
import com.heyganba.model.entity.Kanji;
import com.heyganba.model.entity.KanjiPracticeProgress;
import com.heyganba.model.entity.Radical;
import com.heyganba.model.entity.User;
import com.heyganba.repository.KanjiPracticeProgressRepository;
import com.heyganba.repository.KanjiRepository;
import com.heyganba.repository.RadicalRepository;
import com.heyganba.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KanjiService {

    private final KanjiRepository kanjiRepository;
    private final RadicalRepository radicalRepository;
    private final KanjiPracticeProgressRepository progressRepository;
    private final UserRepository userRepository;

    /**
     * Tra cứu kanji theo bài học / bộ thủ / từ khoá. Dữ liệu seed chỉ vài chục chữ nên lọc kết hợp
     * được xử lý ở service để tránh query động phức tạp.
     */
    @Transactional(readOnly = true)
    public List<KanjiResponse> getKanji(Long userId, String lessonSlug, Long radicalId, String search) {
        List<Kanji> kanji;

        if (search != null && !search.isBlank()) {
            kanji = kanjiRepository.searchWithDetails(search.trim());
            if (lessonSlug != null && !lessonSlug.isBlank()) {
                kanji = kanji.stream()
                        .filter(item -> item.getLesson() != null && lessonSlug.equals(item.getLesson().getSlug()))
                        .toList();
            }
            if (radicalId != null) {
                kanji = kanji.stream()
                        .filter(item -> item.getRadicals().stream().anyMatch(radical -> radical.getId().equals(radicalId)))
                        .toList();
            }
        } else if (lessonSlug != null && !lessonSlug.isBlank()) {
            kanji = kanjiRepository.findByLessonSlugWithDetails(lessonSlug);
            if (radicalId != null) {
                kanji = kanji.stream()
                        .filter(item -> item.getRadicals().stream().anyMatch(radical -> radical.getId().equals(radicalId)))
                        .toList();
            }
        } else if (radicalId != null) {
            kanji = kanjiRepository.findByRadicalIdWithDetails(radicalId);
        } else {
            kanji = kanjiRepository.findAllWithDetails();
        }

        // Nội dung chờ duyệt chỉ admin thấy (xem ContentAccess) — chặn ở đây thay vì ẩn ở UI.
        kanji = ContentAccess.visibleOnly(kanji, Kanji::getReviewStatus);

        Map<Long, Integer> practiceCounts = practiceCountsByKanjiId(userId);
        return kanji.stream()
                .map(item -> KanjiResponse.from(item, practiceCounts.getOrDefault(item.getId(), 0)))
                .toList();
    }

    @Transactional(readOnly = true)
    public KanjiResponse getKanjiById(Long userId, Long kanjiId) {
        Kanji kanji = kanjiRepository.findById(kanjiId)
                .orElseThrow(() -> new ResourceNotFoundException("Kanji", "id", kanjiId));

        ContentAccess.requireVisible(kanji.getReviewStatus(), "Kanji", kanjiId);

        int practiceCount = progressRepository.findByUserIdAndKanjiId(userId, kanjiId)
                .map(KanjiPracticeProgress::getPracticeCount)
                .orElse(0);

        return KanjiResponse.from(kanji, practiceCount);
    }

    @Transactional(readOnly = true)
    public List<RadicalResponse> getRadicals(Long radicalIdFilter) {
        if (radicalIdFilter != null) {
            return radicalRepository.findById(radicalIdFilter)
                    .filter(radical -> ContentAccess.canSeePendingReview()
                            || visibleRadicalIds().contains(radical.getId()))
                    .map(radical -> List.of(RadicalResponse.from(radical)))
                    .orElseGet(List::of);
        }

        List<Radical> radicals = radicalRepository.findAllByOrderByStrokeCountAscIdAsc();
        if (!ContentAccess.canSeePendingReview()) {
            // Bộ thủ chỉ có trong kanji chờ duyệt cũng không được trả ra (nếu không sẽ lộ nội dung nháp).
            Set<Long> visibleIds = visibleRadicalIds();
            radicals = radicals.stream().filter(radical -> visibleIds.contains(radical.getId())).toList();
        }

        return radicals.stream()
                .map(RadicalResponse::from)
                .toList();
    }

    /** Id các bộ thủ xuất hiện trong kanji ĐÃ DUYỆT. */
    private Set<Long> visibleRadicalIds() {
        return ContentAccess.visibleOnly(kanjiRepository.findAllWithDetails(), Kanji::getReviewStatus).stream()
                .flatMap(kanji -> kanji.getRadicals().stream())
                .map(Radical::getId)
                .collect(Collectors.toSet());
    }

    /**
     * Ghi nhận 1 lần luyện viết: server tự +1 theo `user_id` trong JWT.
     * Không nhận số đếm từ client để tránh user tự bơm số liệu luyện tập.
     */
    @Transactional
    public KanjiProgressResponse recordPractice(Long userId, Long kanjiId) {
        Kanji kanji = kanjiRepository.findById(kanjiId)
                .orElseThrow(() -> new ResourceNotFoundException("Kanji", "id", kanjiId));

        ContentAccess.requireVisible(kanji.getReviewStatus(), "Kanji", kanjiId);

        KanjiPracticeProgress progress = progressRepository.findByUserIdAndKanjiId(userId, kanjiId)
                .orElseGet(() -> KanjiPracticeProgress.builder()
                        .user(userRepository.findById(userId)
                                .orElseThrow(() -> new BadRequestException("User not found with id: " + userId)))
                        .kanji(kanji)
                        .practiceCount(0)
                        .build());

        Instant now = Instant.now();
        progress.setPracticeCount(progress.getPracticeCount() + 1);
        progress.setLastPracticedAt(now);
        progressRepository.save(progress);

        return new KanjiProgressResponse(kanji.getId(), kanji.getCharacter(), progress.getPracticeCount(), now);
    }

    private Map<Long, Integer> practiceCountsByKanjiId(Long userId) {
        Map<Long, Integer> counts = new HashMap<>();
        for (KanjiPracticeProgress progress : progressRepository.findByUserId(userId)) {
            counts.put(progress.getKanji().getId(), progress.getPracticeCount());
        }
        return counts;
    }
}
