package com.heyganba.dto.grammar;

import com.heyganba.model.entity.GrammarRule;

/**
 * Điểm ngữ pháp trả cho UI.
 *
 * `number` là số LIÊN TỤC theo đúng thứ tự dạy trong app (1..n) — không lộ khoảng trống của tài liệu gốc.
 * Số gốc của nguồn nằm trong `grammar_rules.source_ref` (field nội bộ, cố tình không có trong DTO này).
 *
 * `reviewStatus` = PENDING_REVIEW khi nội dung còn là bản nháp chờ duyệt tiếng Nhật (UI hiện badge cảnh báo).
 */
public record GrammarRuleResponse(
        Long id,
        int number,
        String title,
        String structure,
        String explanation,
        String notes,
        String lessonSlug,
        String lessonTitle,
        long exerciseCount,
        String reviewStatus
) {
    public static GrammarRuleResponse from(GrammarRule rule, long exerciseCount) {
        return new GrammarRuleResponse(
                rule.getId(),
                rule.getOrderIndex(),
                rule.getTitle(),
                rule.getStructure(),
                rule.getExplanation(),
                rule.getNotes(),
                rule.getLesson() != null ? rule.getLesson().getSlug() : null,
                rule.getLesson() != null ? rule.getLesson().getTitle() : null,
                exerciseCount,
                rule.getReviewStatus() != null ? rule.getReviewStatus().name() : null
        );
    }
}
