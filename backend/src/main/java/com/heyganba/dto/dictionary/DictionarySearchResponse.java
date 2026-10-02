package com.heyganba.dto.dictionary;

import com.heyganba.model.entity.Kanji;
import com.heyganba.model.entity.Vocabulary;
import lombok.Builder;

import java.util.List;

@Builder
public record DictionarySearchResponse(
        String query,
        int totalMatches,
        List<Vocabulary> vocabularies,
        List<Kanji> kanjis
) {
}
