package com.heyganba.dto.dictionary;

import com.heyganba.dto.kanji.KanjiResponse;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.model.enums.VietnameseMeaningStatus;
import lombok.Builder;

import java.util.List;

@Builder
public record DictionarySearchResponse(
        String query,
        int totalMatches,
        List<Word> vocabularies,
        List<KanjiResponse> hanzis,
        int page,
        boolean hasMore
) {
    public record Word(Long id, String word, String reading, String meaning, String vietnameseMeaning,
                       VietnameseMeaningStatus vietnameseStatus, String sinoVietnamese,
                       String exampleSentence, String exampleReading, String exampleMeaning,
                       String source, String meaningLanguage,
                       Integer hskLevel, String partOfSpeech) {
        public static Word from(Vocabulary v) {
            String vietnamese = v.getDictionaryEntryId() != null && v.getDictionaryEntry() != null
                    ? v.getDictionaryEntry().getVietnameseMeaning() : null;
            VietnameseMeaningStatus vietnameseStatus = v.getDictionaryEntryId() != null && v.getDictionaryEntry() != null
                    ? v.getDictionaryEntry().getVietnameseStatus() : VietnameseMeaningStatus.NONE;
            String sino = v.getHanViet() != null ? v.getHanViet() : v.getSinoVietnamese();
            return new Word(v.getId(), v.getWord(), v.getReading(), v.getMeaning(), vietnamese, vietnameseStatus, sino,
                    v.getExampleSentence() != null ? v.getExampleSentence() : v.getExampleZh(),
                    v.getExampleReading() != null ? v.getExampleReading() : v.getExamplePinyin(),
                    v.getExampleMeaning() != null ? v.getExampleMeaning() : v.getExampleVi(),
                    v.getDictionaryEntryId() == null ? "Jiayou" : "JMdict / EDRDG", v.getDictionaryEntryId() == null ? "vi" : "en",
                    v.getHskLevel() != null ? v.getHskLevel() : 1, v.getPartOfSpeech());
        }
    }
}
