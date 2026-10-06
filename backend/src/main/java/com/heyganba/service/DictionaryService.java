package com.heyganba.service;

import com.heyganba.common.exception.BadRequestException;
import com.heyganba.common.security.ContentAccess;
import com.heyganba.dto.dictionary.DictionarySearchResponse;
import com.heyganba.dto.dictionary.DictionarySearchResponse.Word;
import com.heyganba.model.entity.*;
import com.heyganba.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor
public class DictionaryService {
    private final VocabularyRepository vocabularyRepository;
    private final KanjiRepository kanjiRepository;
    private final DictionaryEntryRepository dictionaryEntryRepository;
    private static final int PAGE_SIZE = 40;

    public record Lookup(Word vocabulary, List<com.heyganba.dto.kanji.KanjiResponse> kanjis) {}

    @Transactional(readOnly = true)
    public Lookup lookup(Long id) {
        Word word;
        if (id < 0 && id != Long.MIN_VALUE) {
            DictionaryEntry d = dictionaryEntryRepository.findById(-id).orElseThrow(() -> new com.heyganba.common.exception.ResourceNotFoundException("Dictionary", "id", id));
            if (!Boolean.TRUE.equals(d.getActive())) throw new com.heyganba.common.exception.ResourceNotFoundException("Dictionary", "id", id);
            word = new Word(-d.getId(), d.getWord(), d.getReading(), d.getMeaning(), null, null, null, null, "JMdict / EDRDG", "en");
        } else {
            Vocabulary v = vocabularyRepository.findById(id).orElseThrow(() -> new com.heyganba.common.exception.ResourceNotFoundException("Vocabulary", "id", id));
            ContentAccess.requireVisible(v.getReviewStatus(), "Vocabulary", id);
            word = Word.from(v);
        }
        return new Lookup(word, kanjiRepository.findAllWithDetails().stream()
                .filter(k -> ContentAccess.isVisible(k.getReviewStatus()) && word.word().contains(k.getCharacter()))
                .map(k -> com.heyganba.dto.kanji.KanjiResponse.from(k, 0)).toList());
    }

    public DictionarySearchResponse search(String query) { return search(query, 0); }

    @Transactional(readOnly = true)
    public DictionarySearchResponse search(String query, int page) {
        String trimmed = query == null ? "" : query.trim();
        if (trimmed.length() > 100 || page < 0 || page > 1000) throw new BadRequestException("Từ khoá hoặc trang tra cứu không hợp lệ");
        if (trimmed.isEmpty()) return new DictionarySearchResponse("", 0, List.of(), List.of(), 0, false);
        String normalized = DictionaryText.normalize(trimmed);
        List<Word> course = vocabularyRepository.findCourseWords().stream()
                .filter(v -> ContentAccess.isVisible(v.getReviewStatus()))
                .filter(v -> DictionaryText.normalize(v.getWord() + " " + v.getReading() + " " + v.getMeaning() + " " + Objects.toString(v.getSinoVietnamese(), "")).contains(normalized))
                .sorted(Comparator.comparingInt(v -> v.getWord().equals(trimmed) || v.getReading().equals(trimmed) ? 0 : 1))
                .map(Word::from).toList();
        var catalog = dictionaryEntryRepository.search(DictionaryText.pattern(normalized), normalized, PageRequest.of(page, PAGE_SIZE));
        List<Word> words = new ArrayList<>();
        if (page == 0) words.addAll(course);
        catalog.forEach(d -> words.add(new Word(-d.getId(), d.getWord(), d.getReading(), d.getMeaning(), null, null, null, null, "JMdict / EDRDG", "en")));
        List<Kanji> kanjis = kanjiRepository.findAllWithDetails().stream()
                .filter(k -> ContentAccess.isVisible(k.getReviewStatus()))
                .filter(k -> DictionaryText.normalize(k.getCharacter() + " " + k.getMeaning() + " " + Objects.toString(k.getSinoVietnamese(), "") + " " + Objects.toString(k.getOnyomi(), "") + " " + Objects.toString(k.getKunyomi(), "")).contains(normalized))
                .limit(20).toList();
        return new DictionarySearchResponse(trimmed, Math.toIntExact(catalog.getTotalElements() + course.size() + kanjis.size()),
                words, page == 0 ? kanjis.stream().map(k -> com.heyganba.dto.kanji.KanjiResponse.from(k, 0)).toList() : List.of(), page, catalog.hasNext());
    }

    @Transactional
    public Vocabulary resolveNotebookWord(Long id) {
        if (id >= 0) {
            Vocabulary v = vocabularyRepository.findById(id).orElseThrow(() -> new BadRequestException("Không tìm thấy từ vựng"));
            ContentAccess.requireVisible(v.getReviewStatus(), "Vocabulary", id);
            return v;
        }
        if (id == Long.MIN_VALUE) throw new BadRequestException("ID từ điển không hợp lệ");
        // Source row lock prevents duplicate materialization across accounts and backend instances.
        DictionaryEntry d = dictionaryEntryRepository.findLockedById(-id).orElseThrow(() -> new BadRequestException("Không tìm thấy từ điển"));
        if (!Boolean.TRUE.equals(d.getActive())) throw new BadRequestException("Mục từ đã ngừng phát hành trong JMdict");
        return vocabularyRepository.findByDictionaryEntryId(-id).orElseGet(() -> {
            return vocabularyRepository.save(Vocabulary.builder().word(d.getWord()).reading(d.getReading()).meaning(d.getMeaning())
                    .dictionaryEntryId(d.getId()).reviewStatus(com.heyganba.model.enums.ReviewStatus.APPROVED)
                    .sourceRef("JMdict / EDRDG CC BY-SA 4.0, entry " + d.getId()).build());
        });
    }
}
