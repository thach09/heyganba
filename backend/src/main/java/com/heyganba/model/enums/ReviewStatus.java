package com.heyganba.model.enums;

/**
 * Trạng thái duyệt nội dung học thuật (seed V3/V4/V7/V8/V9/V12/V14 đều là bản nháp).
 *
 * - `PENDING_REVIEW`: chờ giáo viên/người biết tiếng Nhật duyệt (giá trị mặc định — không nội dung nào
 *   bị coi nhầm là "đã sẵn sàng").
 * - `APPROVED`: đã duyệt, an toàn để public rộng.
 */
public enum ReviewStatus {
    PENDING_REVIEW,
    APPROVED
}
