package com.heyganba.dto.admin;

/**
 * Một dòng trong tab "Cần kiểm" của admin panel (`GET /admin/review-queue`).
 *
 * Quy trình duyệt nội dung (27/09/2026): nội dung do AI soạn mà CHƯA đối chiếu được nguồn (hoặc có thể có
 * hơn 1 đáp án đúng theo ngữ cảnh) được đánh dấu `needsHumanCheck = true` và phải được đưa LÊN ĐẦU hàng đợi
 * để người biết tiếng Nhật kiểm trước — xem docs/Internal/content-mapping-fpt-curriculum.md.
 *
 * @param contentType     KANA / VOCABULARY / KANJI / GRAMMAR_EXERCISE
 * @param id              id bản ghi (để mở/sửa ở tab tương ứng)
 * @param label           nội dung ngắn để nhận diện (ký tự kana, từ, kanji, hoặc câu hỏi)
 * @param detail          phần phụ (romaji/nghĩa, cách đọc, đáp án đúng...)
 * @param needsHumanCheck true = cần người biết tiếng Nhật kiểm
 * @param reviewStatus    trạng thái duyệt nội dung (PENDING_REVIEW / APPROVED)
 * @param sourceRef       nguồn đã dùng để đối chiếu (nếu có)
 * @param reviewNote      lý do cần kiểm (chỉ có khi needsHumanCheck = true)
 */
public record AdminReviewQueueItem(
        String contentType,
        Long id,
        String label,
        String detail,
        boolean needsHumanCheck,
        String reviewStatus,
        String sourceRef,
        String reviewNote
) {
}
