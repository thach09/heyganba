package com.heyganba.dto.kanji;

import com.heyganba.model.entity.Kanji;

import java.util.Comparator;
import java.util.List;

/** Chi tiết 1 kanji trả cho UI: đủ bộ thủ, cách đọc, Hán Việt, nghĩa, mnemonic và tiến độ luyện viết của user. */
public record KanjiResponse(
        Long id,
        String character,
        int strokeCount,
        String onyomi,
        String kunyomi,
        String sinoVietnamese,
        String meaning,
        String mnemonic,
        String lessonSlug,
        String lessonTitle,
        List<RadicalResponse> radicals,
        int practiceCount
) {
    public static KanjiResponse from(Kanji kanji, int practiceCount) {
        List<RadicalResponse> radicals = kanji.getRadicals().stream()
                .sorted(Comparator.comparingInt(radical -> radical.getStrokeCount()))
                .map(RadicalResponse::from)
                .toList();

        return new KanjiResponse(
                kanji.getId(),
                kanji.getCharacter(),
                kanji.getStrokeCount(),
                kanji.getOnyomi(),
                kanji.getKunyomi(),
                kanji.getSinoVietnamese(),
                kanji.getMeaning(),
                kanji.getMnemonic(),
                kanji.getLesson() != null ? kanji.getLesson().getSlug() : null,
                kanji.getLesson() != null ? kanji.getLesson().getTitle() : null,
                radicals,
                practiceCount
        );
    }
}
