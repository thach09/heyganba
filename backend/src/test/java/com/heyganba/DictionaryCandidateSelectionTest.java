package com.heyganba;

import com.heyganba.model.entity.DictionaryEntry;
import com.heyganba.repository.DictionaryEntryRepository;
import com.heyganba.service.DictionarySearchText;
import com.heyganba.service.DictionaryService;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.ArrayList;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

class DictionaryCandidateSelectionTest extends ContentApiTestBase {
    @Autowired DictionaryEntryRepository dictionary;
    @Autowired DictionaryService search;

    @Test void wholeGlossBeatsMoreThanOnePageOfCompoundsWithoutFrequencyBoosts() {
        List<Long> ids = new ArrayList<>();
        try {
            for (int i = 0; i < 45; i++) {
                long id = 9000000L + i; ids.add(id);
                String meaning = "commuter fixture spacecraft model " + i;
                dictionary.save(DictionaryEntry.builder().id(id).word("複合" + i).reading("ふくごう" + i)
                        .meaning(meaning).searchText(DictionarySearchText.catalog("ふくごう " + meaning, meaning))
                        .commonRank(1).build());
            }
            long exactId = 9000100L; ids.add(exactId);
            String meaning = "fixture spacecraft (fictional; esp. spacecraft), fixture starship / to explore fixtures (space)";
            dictionary.save(DictionaryEntry.builder().id(exactId).word("検証船").reading("けんしょうせん")
                    .meaning(meaning).searchText(DictionarySearchText.catalog("うちゅうせん uchuusen " + meaning, meaning))
                    .commonRank(1000).build());
            for (String query : List.of("fixture spacecraft", "fixture starship", "explore fixtures", "to explore fixtures")) {
                var results = search.search(query).vocabularies();
                assertThat(results.getFirst().id()).as(query).isEqualTo(-exactId);
            }
            assertThat(dictionary.findById(exactId).orElseThrow().getCommonRank()).isEqualTo(1000);
            var first = search.search("fixture spacecraft", 0);
            var second = search.search("fixture spacecraft", 1);
            assertThat(first.hasMore()).isTrue();
            assertThat(second.vocabularies()).isNotEmpty();
            assertThat(second.vocabularies().stream().map(w -> w.id())).doesNotContain(-exactId);
        } finally { dictionary.deleteAllByIdInBatch(ids); }
    }

    @Test void parentheticalCommasDoNotCreateExactTranslationTerms() {
        String indexed = DictionarySearchText.catalog("original", "bird (rare, regional), to fly / aviation");
        assertThat(indexed).contains(" | ^ bird | = to fly | = fly | ~ aviation")
                .doesNotContain("| ^ rare", "| = regional");
    }
}
