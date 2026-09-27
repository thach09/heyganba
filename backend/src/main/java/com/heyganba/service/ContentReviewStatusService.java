package com.heyganba.service;

import com.heyganba.dto.content.ContentReviewStatusResponse;
import com.heyganba.dto.content.ContentReviewStatusResponse.ContentTypeReviewStatus;
import com.heyganba.model.enums.ReviewStatus;
import com.heyganba.repository.GrammarExerciseRepository;
import com.heyganba.repository.GrammarRuleRepository;
import com.heyganba.repository.KanaRepository;
import com.heyganba.repository.KanjiRepository;
import com.heyganba.repository.VocabularyRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

/**
 * Tổng hợp trạng thái duyệt nội dung để hệ thống tự cảnh báo nội dung "chờ duyệt tiếng Nhật".
 *
 * Không có logic ghi: chỉ đếm theo `review_status` (mặc định PENDING_REVIEW từ migration V13) và liệt kê
 * các migration nằm trong `db/migration-staging` (những file KHÔNG chạy ở production).
 */
@Service
@RequiredArgsConstructor
public class ContentReviewStatusService {

    private static final Logger log = LoggerFactory.getLogger(ContentReviewStatusService.class);
    private static final String STAGING_MIGRATION_PATTERN = "classpath:db/migration-staging/*.sql";

    private static final String NOTE = "Nội dung seed là BẢN NHÁP do người soạn tự viết, CHƯA được duyệt bởi người "
            + "biết tiếng Nhật. Migration trong db/migration-staging chỉ chạy ở local/staging — production chỉ nhận "
            + "migration trong db/migration sau khi nội dung được duyệt (promote = chuyển file sang db/migration).";

    private final KanaRepository kanaRepository;
    private final VocabularyRepository vocabularyRepository;
    private final KanjiRepository kanjiRepository;
    private final GrammarRuleRepository grammarRuleRepository;
    private final GrammarExerciseRepository grammarExerciseRepository;

    @Transactional(readOnly = true)
    public ContentReviewStatusResponse getStatus() {
        List<ContentTypeReviewStatus> types = List.of(
                statusOf("KANA", kanaRepository.count(), kanaRepository.countByReviewStatus(ReviewStatus.PENDING_REVIEW)),
                statusOf("VOCABULARY", vocabularyRepository.count(),
                        vocabularyRepository.countByReviewStatus(ReviewStatus.PENDING_REVIEW)),
                statusOf("KANJI", kanjiRepository.count(), kanjiRepository.countByReviewStatus(ReviewStatus.PENDING_REVIEW)),
                statusOf("GRAMMAR_RULE", grammarRuleRepository.count(),
                        grammarRuleRepository.countByReviewStatus(ReviewStatus.PENDING_REVIEW)),
                statusOf("GRAMMAR_EXERCISE", grammarExerciseRepository.count(),
                        grammarExerciseRepository.countByReviewStatus(ReviewStatus.PENDING_REVIEW))
        );

        long totalPending = types.stream().mapToLong(ContentTypeReviewStatus::pendingReview).sum();

        return new ContentReviewStatusResponse(types, totalPending, totalPending == 0, stagingOnlyMigrations(), NOTE);
    }

    private static ContentTypeReviewStatus statusOf(String contentType, long total, long pendingReview) {
        return new ContentTypeReviewStatus(contentType, total, pendingReview, total - pendingReview);
    }

    /** File migration nằm trong thư mục staging-only (chưa promote lên production). */
    private List<String> stagingOnlyMigrations() {
        try {
            Resource[] resources = new PathMatchingResourcePatternResolver().getResources(STAGING_MIGRATION_PATTERN);
            return Arrays.stream(resources)
                    .map(Resource::getFilename)
                    .filter(name -> name != null && name.endsWith(".sql"))
                    .sorted(Comparator.naturalOrder())
                    .toList();
        } catch (Exception ex) {
            log.warn("Không đọc được danh sách migration staging-only: {}", ex.getMessage());
            return List.of();
        }
    }
}
