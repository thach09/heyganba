package com.heyganba.dto.kana;

import com.heyganba.model.entity.Kana;

/**
 * Thông tin 1 ký tự kana trả về cho client (bảng tra cứu + panel chi tiết).
 */
public record KanaResponse(
        Long id,
        String character,
        String romaji,
        String kanaType,
        String kanaGroup,
        boolean isParticleException,
        String notes
) {
    public static KanaResponse from(Kana kana) {
        return new KanaResponse(
                kana.getId(),
                kana.getCharacter(),
                kana.getRomaji(),
                kana.getKanaType().name(),
                kana.getKanaGroup().name(),
                Boolean.TRUE.equals(kana.getIsParticleException()),
                kana.getNotes()
        );
    }
}
