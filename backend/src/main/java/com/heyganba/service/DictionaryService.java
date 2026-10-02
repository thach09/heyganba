package com.heyganba.service;

import com.heyganba.dto.dictionary.DictionarySearchResponse;
import com.heyganba.model.entity.Kanji;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.repository.KanjiRepository;
import com.heyganba.repository.VocabularyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DictionaryService {

    private final VocabularyRepository vocabularyRepository;
    private final KanjiRepository kanjiRepository;

    @Transactional(readOnly = true)
    public DictionarySearchResponse search(String query) {
        if (query == null || query.isBlank()) {
            return DictionarySearchResponse.builder()
                    .query("")
                    .totalMatches(0)
                    .vocabularies(List.of())
                    .kanjis(List.of())
                    .build();
        }

        String trimmed = query.trim();
        List<Vocabulary> vocabs = vocabularyRepository.searchVocabulary(trimmed, PageRequest.of(0, 40));
        List<Kanji> kanjis = kanjiRepository.searchWithDetails(trimmed);
        if (kanjis.size() > 20) {
            kanjis = kanjis.subList(0, 20);
        }

        return DictionarySearchResponse.builder()
                .query(trimmed)
                .totalMatches(vocabs.size() + kanjis.size())
                .vocabularies(vocabs)
                .kanjis(kanjis)
                .build();
    }
}
