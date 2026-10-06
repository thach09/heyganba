package com.heyganba.dto.dictionary;

import com.heyganba.dto.kanji.KanjiResponse;
import com.heyganba.model.entity.Vocabulary;
import lombok.Builder;

import java.util.List;

@Builder
public record DictionarySearchResponse(
        String query,
        int totalMatches,
        List<Word> vocabularies,
        List<KanjiResponse> kanjis,
        int page,
        boolean hasMore
) {
    public record Word(Long id, String word, String reading, String meaning, String sinoVietnamese,
                       String exampleSentence, String exampleReading, String exampleMeaning,
                       String source, String meaningLanguage) {
        public static Word from(Vocabulary v) {
            return new Word(v.getId(), v.getWord(), v.getReading(), v.getMeaning(), v.getSinoVietnamese(),
                    v.getExampleSentence(), v.getExampleReading(), v.getExampleMeaning(),
                    v.getDictionaryEntryId() == null ? "HeyGanba" : "JMdict / EDRDG", v.getDictionaryEntryId() == null ? "vi" : "en");
        }
    }
}
