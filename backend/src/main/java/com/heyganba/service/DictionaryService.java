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
import java.util.regex.Pattern;

@Service @RequiredArgsConstructor
public class DictionaryService {
    private final VocabularyRepository vocabularyRepository;
    private final KanjiRepository kanjiRepository;
    private final DictionaryEntryRepository dictionaryEntryRepository;
    private static final int PAGE_SIZE = 20;
    private record RankedWord(Word word, int relevance, int commonRank) {}
    private static final Comparator<RankedWord> WORD_ORDER = Comparator.comparingInt(RankedWord::relevance)
            .thenComparingInt(RankedWord::commonRank)
            .thenComparingInt(candidate -> candidate.word().word().codePointCount(0, candidate.word().word().length()))
            .thenComparing(candidate -> candidate.word().word()).thenComparing(candidate -> candidate.word().reading());

    public record Lookup(Word vocabulary, List<com.heyganba.dto.kanji.KanjiResponse> kanjis) {}

    @Transactional(readOnly = true)
    public Lookup lookup(Long id) {
        Word word;
        if (id < 0 && id != Long.MIN_VALUE) {
            DictionaryEntry d = dictionaryEntryRepository.findById(-id).orElseThrow(() -> new com.heyganba.common.exception.ResourceNotFoundException("Dictionary", "id", id));
            if (!Boolean.TRUE.equals(d.getActive())) throw new com.heyganba.common.exception.ResourceNotFoundException("Dictionary", "id", id);
            word = dictionaryWord(d);
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
        String vietnameseQuery = DictionaryText.normalizePreservingDiacritics(trimmed);
        boolean toneSensitive = DictionaryText.hasLatinDiacritics(trimmed);
        String vietnameseSearch = toneSensitive ? vietnameseQuery : normalized;
        Pattern englishToken = tokenPattern(normalized);
        Pattern vietnameseToken = tokenPattern(vietnameseSearch);
        List<RankedWord> matchedCourse = vocabularyRepository.findCourseWords().stream()
                .filter(v -> ContentAccess.isVisible(v.getReviewStatus()))
                .map(v -> new RankedWord(Word.from(v), relevance(v.getWord(), v.getReading(), v.getMeaning(), null,
                        v.getSinoVietnamese(), normalized, vietnameseSearch, toneSensitive), 1000))
                .filter(candidate -> candidate.relevance() < 9)
                .sorted(WORD_ORDER).toList();
        int courseStart = Math.min(page * PAGE_SIZE, matchedCourse.size());
        List<RankedWord> coursePage = matchedCourse.subList(courseStart, Math.min(courseStart + PAGE_SIZE, matchedCourse.size()));
        String catalogPattern = toneSensitive ? DictionaryText.pattern(vietnameseQuery) : DictionaryText.pattern(normalized);
        var catalog = dictionaryEntryRepository.search(catalogPattern, DictionaryText.pattern(vietnameseSearch),
                DictionaryText.pattern(vietnameseQuery), DictionaryText.prefix(normalized), normalized, vietnameseSearch,
                PageRequest.of(page, PAGE_SIZE));
        List<RankedWord> candidates = new ArrayList<>(coursePage);
        catalog.forEach(d -> candidates.add(new RankedWord(dictionaryWord(d), Math.min(
                relevance(d.getWord(), d.getReading(), d.getMeaning(), d.getVietnameseMeaning(), null,
                        normalized, vietnameseSearch, toneSensitive),
                metadataRelevance(d, normalized, vietnameseSearch, toneSensitive, englishToken, vietnameseToken)), d.getCommonRank())));
        Map<String, RankedWord> distinct = new LinkedHashMap<>();
        candidates.stream().sorted(WORD_ORDER).forEach(candidate -> distinct.putIfAbsent(
                DictionaryText.normalize(candidate.word().word()) + "|" + DictionaryText.normalize(candidate.word().reading()), candidate));
        List<Word> words = distinct.values().stream().map(RankedWord::word).toList();
        List<Kanji> kanjis = kanjiRepository.findAllWithDetails().stream()
                .filter(k -> ContentAccess.isVisible(k.getReviewStatus()))
                .filter(k -> toneSensitive
                        ? DictionaryText.normalizePreservingDiacritics(k.getSinoVietnamese()).contains(vietnameseQuery)
                        : DictionaryText.normalize(k.getCharacter() + " " + k.getMeaning() + " " + Objects.toString(k.getSinoVietnamese(), "") + " " + Objects.toString(k.getOnyomi(), "") + " " + Objects.toString(k.getKunyomi(), "")).contains(normalized))
                .limit(20).toList();
        return new DictionarySearchResponse(trimmed, Math.toIntExact(catalog.getTotalElements() + matchedCourse.size() + kanjis.size()),
                words, page == 0 ? kanjis.stream().map(k -> com.heyganba.dto.kanji.KanjiResponse.from(k, 0)).toList() : List.of(), page,
                catalog.hasNext() || courseStart + coursePage.size() < matchedCourse.size());
    }

    private Word dictionaryWord(DictionaryEntry d) {
        return new Word(-d.getId(), d.getWord(), d.getReading(), d.getMeaning(), d.getVietnameseMeaning(), null,
                null, null, null, "JMdict / EDRDG", "en");
    }

    private static int relevance(String word, String reading, String english, String vietnamese, String sinoVietnamese,
                                 String query, String vietnameseQuery, boolean toneSensitive) {
        if (!toneSensitive) {
            String normalizedWord = DictionaryText.normalize(word);
            String normalizedReading = DictionaryText.normalize(reading);
            if (normalizedWord.equals(query) || normalizedReading.equals(query)) return 0;
            if (normalizedWord.startsWith(query) || normalizedReading.startsWith(query)) return 1;
            if (normalizedWord.contains(query) || normalizedReading.contains(query)) return 2;
        }
        String vi = toneSensitive
                ? DictionaryText.normalizePreservingDiacritics(Objects.toString(vietnamese, ""))
                : DictionaryText.normalize(Objects.toString(vietnamese, ""));
        String viQuery = toneSensitive ? vietnameseQuery : query;
        if (vi.equals(viQuery)) return 3;
        if (containsToken(vi, viQuery)) return 4;
        String en = DictionaryText.normalize(Objects.toString(english, ""));
        if (!toneSensitive && en.equals(query)) return 4;
        if (!toneSensitive && containsToken(en, query)) return 7;
        String hanViet = toneSensitive
                ? DictionaryText.normalizePreservingDiacritics(Objects.toString(sinoVietnamese, ""))
                : DictionaryText.normalize(Objects.toString(sinoVietnamese, ""));
        if (hanViet.equals(viQuery) || containsToken(hanViet, viQuery)) return 5;
        if (toneSensitive ? vi.contains(viQuery) : vi.contains(query) || en.contains(query)) return 8;
        return 9;
    }

    private static boolean containsToken(String value, String query) {
        if (value.isEmpty()) return false;
        return tokenPattern(query).matcher(value).find();
    }

    private static Pattern tokenPattern(String query) {
        return Pattern.compile("(?<![\\p{L}\\p{N}])" + Pattern.quote(query) + "(?![\\p{L}\\p{N}])");
    }

    // Search metadata participates in the same relevance scale as displayed glosses.
    // Previously repository alias hits were re-sorted as unrelated (9), below partial glosses (8).
    private static int metadataRelevance(DictionaryEntry entry, String query, String vietnameseQuery, boolean toneSensitive,
                                         Pattern englishToken, Pattern vietnameseToken) {
        int rank = 9;
        String vi = Objects.toString(entry.getVietnameseSearchText(), "");
        for (String alias : vi.split(" \\| ")) {
            if (alias.equals(vietnameseQuery)) return 3;
            if (vietnameseToken.matcher(alias).find()) rank = Math.min(rank, 4);
            else if (alias.contains(vietnameseQuery)) rank = Math.min(rank, 8);
        }
        if (rank <= 4) return rank;
        if (!toneSensitive) {
            for (String alias : entry.getSearchText().split(" \\| ")) {
                if (alias.equals("^ " + query)) return 4;
                else if (alias.equals("= " + query) || alias.equals(query)) rank = Math.min(rank, 5);
                else if (alias.equals("~ " + query)) rank = Math.min(rank, 6);
                else if (englishToken.matcher(alias).find()) rank = Math.min(rank, 7);
                else if (alias.contains(query)) rank = Math.min(rank, 8);
            }
        }
        return rank;
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
