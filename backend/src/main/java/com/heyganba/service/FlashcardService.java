package com.heyganba.service;

import com.heyganba.common.exception.ResourceNotFoundException;
import com.heyganba.common.security.ContentAccess;
import com.heyganba.dto.flashcard.FlashcardDueResponse;
import com.heyganba.dto.flashcard.FlashcardReviewRequest;
import com.heyganba.dto.flashcard.FlashcardReviewResponse;
import com.heyganba.dto.flashcard.FlashcardStatsResponse;
import com.heyganba.model.entity.SrsReview;
import com.heyganba.model.entity.Streak;
import com.heyganba.model.entity.User;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.model.enums.ReviewStatus;
import com.heyganba.repository.SrsReviewRepository;
import com.heyganba.repository.StreakRepository;
import com.heyganba.repository.UserRepository;
import com.heyganba.repository.VocabularyRepository;
import com.heyganba.service.srs.SrsDueCache;
import com.heyganba.service.srs.SrsEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Nghiệp vụ trạm Flashcard: danh sách từ cần ôn hôm nay, submit kết quả ôn (SM-2), thống kê + streak.
 *
 * Mọi phương thức nhận `userId` lấy từ JWT ở controller — không có tham số nào cho client tự khai
 * userId khác, nên user không thể đọc/ghi dữ liệu ôn tập của người khác.
 */
@Service
@RequiredArgsConstructor
public class FlashcardService {
    private final org.springframework.context.ApplicationEventPublisher learningEvents;

    public static final int DEFAULT_NEW_PER_DAY = 10;
    private static final int MAX_NEW_PER_REQUEST = 50;
    private static final int MAX_DUE_PER_SESSION = 100;

    private final SrsReviewRepository srsReviewRepository;
    private final VocabularyRepository vocabularyRepository;
    private final VocabularyPublicationAuthority publication;
    private final StreakRepository streakRepository;
    private final UserRepository userRepository;
    private final SrsDueCache srsDueCache;
    private final StreakService streakService;
    private final StudyActivityService studyActivityService;
    private final LearningMutationReceiptService mutationReceipts;

    @Transactional(readOnly = true)
    public List<FlashcardDueResponse> getDueToday(Long userId, Integer newLimit) {
        int resolvedNewLimit = newLimit == null
                ? DEFAULT_NEW_PER_DAY
                : Math.max(0, Math.min(newLimit, MAX_NEW_PER_REQUEST));

        boolean cacheable = newLimit == null;
        if (cacheable) {
            Optional<List<FlashcardDueResponse>> cached = srsDueCache.get(userId);
            if (cached.isPresent()) {
                if (cached.get().isEmpty()) return cached.get();
                // Cached DTOs are not authorization. Rebuild their academic fields from current rows.
                var current = vocabularyRepository.findAllById(cached.get().stream()
                        .map(FlashcardDueResponse::vocabularyId).toList()).stream()
                        .filter(publication::canRead).collect(java.util.stream.Collectors.toMap(Vocabulary::getId, v -> v));
                var reviews = srsReviewRepository.findDueReviewsForUser(userId, Instant.now()).stream()
                        .collect(java.util.stream.Collectors.toMap(v -> v.getVocabulary().getId(), v -> v));
                return cached.get().stream().filter(card -> current.containsKey(card.vocabularyId()))
                        .map(card -> card.isNew() ? FlashcardDueResponse.fromNewVocabulary(current.get(card.vocabularyId()))
                                : reviews.containsKey(card.vocabularyId()) ? FlashcardDueResponse.fromReview(reviews.get(card.vocabularyId())) : null)
                        .filter(java.util.Objects::nonNull).toList();
            }
        }

        List<FlashcardDueResponse> items = loadDueToday(userId, resolvedNewLimit);

        if (cacheable) {
            srsDueCache.put(userId, items);
        }
        return items;
    }

    @Transactional
    public FlashcardReviewResponse review(Long userId, FlashcardReviewRequest request) {
        User user = userRepository.findLockedById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Vocabulary vocabulary = vocabularyRepository.findById(request.vocabularyId())
                .orElseThrow(() -> new ResourceNotFoundException("Vocabulary", "id", request.vocabularyId()));

        // Không cho ôn (đọc/chấm) từ vựng còn chờ duyệt khi không phải admin.
        publication.requireVisible(vocabulary);
        if (vocabulary.getDictionaryEntryId() != null) {
            throw new com.heyganba.common.exception.BadRequestException("Từ trong sổ cá nhân được luyện riêng, không thuộc lịch SRS giáo trình");
        }

        var replay = mutationReceipts.replay(userId, LearningMutationReceiptService.SRS_REVIEW,
                request.attemptId(), request.vocabularyId(), request.rating().name(), FlashcardReviewResponse.class);
        if (replay.isPresent()) return replay.get();

        Instant now = Instant.now();
        SrsReview review = srsReviewRepository.findByUserIdAndVocabularyId(userId, vocabulary.getId())
                .orElseGet(() -> SrsReview.builder()
                        .user(user)
                        .vocabulary(vocabulary)
                        .dueDate(now)
                        .build());

        SrsEngine.State state = new SrsEngine.State(
                review.getRepetitions(),
                review.getIntervalDays(),
                review.getEaseFactor()
        );
        SrsEngine.Outcome outcome = SrsEngine.apply(state, request.rating(), now);

        review.setRepetitions(outcome.repetitions());
        review.setIntervalDays(outcome.intervalDays());
        review.setEaseFactor(outcome.easeFactor());
        review.setDueDate(outcome.dueDate());
        review.setLastReviewedAt(now);
        srsReviewRepository.save(review);

        srsDueCache.invalidate(userId);

        // Ghi nhật ký hoạt động (nguồn dữ liệu cho streak heatmap).
        // Streak chỉ được tính khi trong ngày đạt ngưỡng: >= 10 lượt ôn SRS HOẶC 1 lượt thi thử
        // HOẶC >= 10 câu ngữ pháp (xem StreakPolicy) — ôn 1 từ đơn lẻ không tính là 1 ngày học.
        studyActivityService.record(user, StudyActivityService.SOURCE_FLASHCARD, 1,
                request.rating().isLapse() ? 0 : 1, now);
        learningEvents.publishEvent(com.heyganba.domain.learning.LearningActivity.srs(
                userId, vocabulary.getId(), !request.rating().isLapse(), now));

        Streak streak = studyActivityService.qualifiesForStreak(user.getId(), now)
                ? streakService.touch(user, now)
                : streakService.find(user.getId()).orElse(null);

        FlashcardReviewResponse response = new FlashcardReviewResponse(
                vocabulary.getId(),
                request.rating().name(),
                outcome.intervalDays(),
                outcome.repetitions(),
                outcome.easeFactor(),
                outcome.dueDate(),
                outcome.lapse(),
                streak != null ? streak.getCurrentStreak() : 0,
                streak != null ? streak.getLongestStreak() : 0
        );
        mutationReceipts.remember(user, LearningMutationReceiptService.SRS_REVIEW,
                request.attemptId(), request.vocabularyId(), request.rating().name(), response);
        return response;
    }

    @Transactional(readOnly = true)
    public FlashcardStatsResponse stats(Long userId) {
        var publishedIds = vocabularyRepository.findCourseWords().stream().filter(publication::canRead)
                .map(Vocabulary::getId).collect(java.util.stream.Collectors.toSet());
        var visibleReviews = srsReviewRepository.findAllForUser(userId).stream()
                .filter(review -> publishedIds.contains(review.getVocabulary().getId())).toList();
        long learnedWords = visibleReviews.stream().filter(review -> review.getRepetitions() > 0).count();
        Instant now = Instant.now();
        long dueToday = visibleReviews.stream().filter(review -> !review.getDueDate().isAfter(now)).count();
        long availableNewWords = Math.max(0, publishedIds.size() - visibleReviews.size());

        Streak streak = streakRepository.findByUserId(userId).orElse(null);
        int currentStreak = streakService.calculateEffectiveCurrentStreak(streak, streakService.today(Instant.now()));

        return new FlashcardStatsResponse(
                learnedWords,
                dueToday,
                availableNewWords,
                currentStreak,
                streak != null ? streak.getLongestStreak() : 0
        );
    }

    private List<FlashcardDueResponse> loadDueToday(Long userId, int newLimit) {
        List<SrsReview> dueReviews = srsReviewRepository.findDueReviewsForUser(userId, Instant.now());

        List<FlashcardDueResponse> items = new ArrayList<>();
        dueReviews.stream()
                // Từ vựng còn chờ duyệt không được đưa vào phiên ôn của user thường (xem ContentAccess).
                .filter(review -> publication.canRead(review.getVocabulary()))
                .limit(MAX_DUE_PER_SESSION)
                .map(FlashcardDueResponse::fromReview)
                .forEach(items::add);

        if (newLimit > 0) {
            // A page full of withheld rows must not hide a later eligible word.
            int accepted = 0;
            for (int page = 0; accepted < newLimit; page++) {
                List<Vocabulary> batch = vocabularyRepository.findNewForUser(userId, PageRequest.of(page, newLimit));
                for (Vocabulary word : batch) {
                    if (publication.canRead(word)) {
                        items.add(FlashcardDueResponse.fromNewVocabulary(word));
                        if (++accepted == newLimit) break;
                    }
                }
                if (batch.size() < newLimit) break;
            }
        }

        return items;
    }
}
