package com.heyganba.dto.kanji;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.heyganba.model.entity.Kanji;

import java.util.Comparator;
import java.util.List;

/** Chi tiết 1 chữ Hán trả về cho UI */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record KanjiResponse(
        Long id,
        String character,
        String traditional,
        String pinyin,
        String hanViet,
        String radical,
        int strokeCount,
        int hskLevel,
        String meaningVi,
        String decomposition,
        String exampleWordsJson,
        String sinoVietnamese,
        String meaning,
        String mnemonic,
        String lessonSlug,
        String lessonTitle,
        List<RadicalResponse> radicals,
        int practiceCount,
        String reviewStatus,
        Boolean needsHumanCheck
) {
    public static KanjiResponse from(Kanji kanji, int practiceCount) {
        List<RadicalResponse> radicals = kanji.getRadicals() != null
                ? kanji.getRadicals().stream()
                        .sorted(Comparator.comparingInt(radical -> radical.getStrokeCount()))
                        .map(RadicalResponse::from)
                        .toList()
                : List.of();

        return new KanjiResponse(
                kanji.getId(),
                kanji.getCharacter(),
                kanji.getTraditional(),
                kanji.getPinyin(),
                kanji.getHanViet(),
                kanji.getRadical(),
                kanji.getStrokeCount() != null ? kanji.getStrokeCount() : 0,
                kanji.getHskLevel() != null ? kanji.getHskLevel() : 1,
                kanji.getMeaningVi(),
                kanji.getDecomposition(),
                kanji.getExampleWordsJson(),
                kanji.getSinoVietnamese(),
                kanji.getMeaning(),
                kanji.getMnemonic(),
                kanji.getLesson() != null ? kanji.getLesson().getSlug() : null,
                kanji.getLesson() != null ? kanji.getLesson().getTitle() : null,
                radicals,
                practiceCount,
                kanji.getReviewStatus() != null ? kanji.getReviewStatus().name() : "APPROVED",
                kanji.getNeedsHumanCheck()
        );
    }
}
