package com.heyganba.service.srs;

import com.heyganba.model.entity.SrsReview;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.model.enums.ReviewStatus;
import com.heyganba.repository.*;
import com.heyganba.service.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class FlashcardCacheMissFallbackTest {
    private final com.heyganba.support.PublicationCatalogFixture catalog = new com.heyganba.support.PublicationCatalogFixture();
    private final VocabularyPublicationAuthority publication = new VocabularyPublicationAuthority(mock(AuditLogRepository.class), catalog.path().toString());
    private final SrsReviewRepository reviews = mock(SrsReviewRepository.class);
    private final VocabularyRepository vocabulary = mock(VocabularyRepository.class);
    private final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-10-21T16:00:00Z"));

    @AfterEach void clearSecurityContext() { SecurityContextHolder.clearContext(); }

    private InMemorySrsDueCache cache() {
        Clock clock = mock(Clock.class);
        when(clock.instant()).thenAnswer(ignored -> now.get());
        return new InMemorySrsDueCache(StreakService.DEFAULT_ZONE, clock, 1);
    }

    private FlashcardService service(SrsDueCache cache) {
        SecurityContextHolder.clearContext();
        when(vocabulary.findNewForUser(anyLong(), any())).thenReturn(List.of());
        return new FlashcardService(mock(ApplicationEventPublisher.class), reviews, vocabulary, publication,
                mock(StreakRepository.class), mock(UserRepository.class), cache, mock(StreakService.class),
                mock(StudyActivityService.class), mock(LearningMutationReceiptService.class));
    }

    private SrsReview review(long vocabularyId) {
        Vocabulary word = Vocabulary.builder().id(vocabularyId).word("synthetic")
                        .pinyin("synthetic").meaningVi("synthetic").partOfSpeech("TEST_ONLY").reviewStatus(ReviewStatus.APPROVED).build();
        catalog.register(word, 0);
        return SrsReview.builder().vocabulary(word)
                .repetitions(3).intervalDays(7).easeFactor(2.5).dueDate(Instant.parse("2026-10-20T00:00:00Z")).build();
    }

    @Test void fullCacheMissReturnsFreshRepositoryDataOnEveryUncachedRequestWithoutWritingSrs() {
        InMemorySrsDueCache cache = cache();
        cache.put(1L, List.of());
        FlashcardService service = service(cache);
        when(reviews.findDueReviewsForUser(eq(2L), any())).thenReturn(List.of(review(42))).thenReturn(List.of(review(43)));
        assertThat(service.getDueToday(2L, null)).extracting(card -> card.vocabularyId()).containsExactly(42L);
        assertThat(cache.get(2L)).isEmpty();
        assertThat(service.getDueToday(2L, null)).extracting(card -> card.vocabularyId()).containsExactly(43L);
        assertThat(cache.get(1L)).contains(List.of());
        verify(reviews, times(2)).findDueReviewsForUser(eq(2L), any());
        verify(reviews, never()).save(any(SrsReview.class));
    }

    @Test void midnightExpiryLoadsRepositoryThenCachesTheEmptyAuthoritativeResult() {
        InMemorySrsDueCache cache = cache();
        cache.put(2L, List.of(com.heyganba.dto.flashcard.FlashcardDueResponse.fromReview(review(42))));
        now.set(Instant.parse("2026-10-21T17:00:00Z"));
        FlashcardService service = service(cache);
        when(reviews.findDueReviewsForUser(eq(2L), any())).thenReturn(List.of());
        assertThat(service.getDueToday(2L, null)).isEmpty();
        assertThat(cache.get(2L)).contains(List.of());
        assertThat(service.getDueToday(2L, null)).isEmpty();
        verify(reviews, times(1)).findDueReviewsForUser(eq(2L), any());
        verify(reviews, never()).save(any(SrsReview.class));
    }

    @Test void invalidationFallsBackAndAnEmptyCachedResultRemainsAHit() {
        InMemorySrsDueCache cache = cache();
        cache.put(2L, List.of(com.heyganba.dto.flashcard.FlashcardDueResponse.fromReview(review(42))));
        cache.invalidate(2L);
        FlashcardService service = service(cache);
        when(reviews.findDueReviewsForUser(eq(2L), any())).thenReturn(List.of());
        assertThat(service.getDueToday(2L, null)).isEmpty();
        assertThat(cache.get(2L)).contains(List.of());
        assertThat(service.getDueToday(2L, null)).isEmpty();
        verify(reviews, times(1)).findDueReviewsForUser(eq(2L), any());
        verify(reviews, never()).save(any(SrsReview.class));
    }
    @Test void withheldFirstPageDoesNotHideEligibleLaterWords() {
        InMemorySrsDueCache cache = cache(); FlashcardService service = service(cache);
        SrsReview published = review(43);
        Vocabulary withheld = Vocabulary.builder().id(42L).word("untrusted").reviewStatus(ReviewStatus.APPROVED).build();
        when(vocabulary.findNewForUser(eq(2L), any())).thenAnswer(invocation ->
                ((org.springframework.data.domain.Pageable) invocation.getArgument(1)).getPageNumber() == 0
                        ? List.of(withheld) : List.of(published.getVocabulary()));
        when(reviews.findDueReviewsForUser(eq(2L), any())).thenReturn(List.of());
        assertThat(service.getDueToday(2L, 1)).extracting(card -> card.vocabularyId()).containsExactly(43L);
        verify(vocabulary, times(2)).findNewForUser(eq(2L), any());
    }

}
