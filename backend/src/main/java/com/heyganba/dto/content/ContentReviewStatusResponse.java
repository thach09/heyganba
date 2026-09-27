package com.heyganba.dto.content;

import java.util.List;

/**
 * Trạng thái duyệt nội dung học thuật (Phase 4/5) — trả cho UI/admin để KHÔNG ai nhầm là nội dung đã sẵn sàng.
 *
 * @param types                  thống kê theo từng loại nội dung
 * @param totalPendingReview     tổng số bản ghi đang chờ duyệt
 * @param allApproved            true khi mọi nội dung đã được duyệt
 * @param stagingOnlyMigrations  danh sách file migration CHỈ chạy ở local/staging (chưa promote lên production)
 * @param note                   ghi chú quy trình duyệt nội dung
 */
public record ContentReviewStatusResponse(
        List<ContentTypeReviewStatus> types,
        long totalPendingReview,
        boolean allApproved,
        List<String> stagingOnlyMigrations,
        String note
) {
    /**
     * @param contentType    tên loại nội dung (KANA / VOCABULARY / KANJI / GRAMMAR_RULE / GRAMMAR_EXERCISE)
     * @param total          tổng số bản ghi
     * @param pendingReview  số bản ghi chờ duyệt
     * @param approved       số bản ghi đã duyệt
     */
    public record ContentTypeReviewStatus(
            String contentType,
            long total,
            long pendingReview,
            long approved
    ) {
    }
}
