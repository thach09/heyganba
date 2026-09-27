package com.heyganba.dto.kanji;

import com.heyganba.model.entity.Radical;

/** Bộ thủ kèm tên tiếng Nhật, số nét và nghĩa tiếng Việt. */
public record RadicalResponse(
        Long id,
        String radical,
        int strokeCount,
        String name,
        String meaning
) {
    public static RadicalResponse from(Radical radical) {
        return new RadicalResponse(
                radical.getId(),
                radical.getRadical(),
                radical.getStrokeCount(),
                radical.getName(),
                radical.getMeaning()
        );
    }
}
