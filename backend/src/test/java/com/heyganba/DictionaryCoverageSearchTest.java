package com.heyganba;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.model.entity.DictionaryEntry;
import com.heyganba.repository.DictionaryEntryRepository;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Data/query regressions in an isolated fixture catalog; full-catalog ranks are measured separately over HTTP. */
class DictionaryCoverageSearchTest extends ContentApiTestBase {
    @Autowired DictionaryEntryRepository dictionary;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test void intendedIdsAppearForMandatoryBilingualQueriesAndEveryTheme() throws Exception {
        Set<String> required = Set.of("cat","dog","lion","elephant","strawberry","watermelon","motorcycle","truck",
                "refrigerator","washing machine","firefighter","hairdresser","accountant","veterinarian");
        var snapshot = DictionaryCurationIntegrityTest.snapshot();
        List<JsonNode> chosen = new ArrayList<>(); Set<String> themes = new HashSet<>();
        for (var c : DictionaryCurationIntegrityTest.pilot().path("concepts")) {
            if (required.contains(c.path("en").asText()) || themes.add(c.path("category").asText())) chosen.add(c);
        }
        List<Long> ids = chosen.stream().map(c->c.path("jmdictId").asLong()).toList();
        long courseCount = vocabularyRepository.count(), srsCount=srsReviewRepository.count();
        try {
            for (var c : chosen) {
                var row=DictionaryCurationIntegrityTest.row(c); var source=snapshot.get(row.id());
                dictionary.save(DictionaryEntry.builder().id(row.id()).word(source[1]).reading(source[2]).meaning(source[3])
                        .searchText(source[4] + " | " + row.additionalSearchText()).vietnameseMeaning(row.vietnamese())
                        .vietnameseSearchText(row.vietnameseSearchText()).commonRank(row.commonRank()).build());
            }
            for (var c : chosen) {
                List<String> queries = new ArrayList<>(List.of(c.path("vi").asText(),c.path("en").asText()));
                queries.addAll(DictionaryCurationIntegrityTest.strings(c.path("vietnameseAliases")));
                queries.addAll(DictionaryCurationIntegrityTest.strings(c.path("englishAliases")));
                for (String query : queries) {
                    var response=json.readTree(mvc.perform(get("/dictionary/search").param("q",query)).andExpect(status().isOk())
                            .andReturn().getResponse().getContentAsString()).at("/data/vocabularies");
                    List<Long> resultIds=new ArrayList<>(); response.forEach(w->resultIds.add(w.path("id").asLong()));
                    int index=resultIds.indexOf(-c.path("jmdictId").asLong());
                    assertThat(index).as("%s expected %s for %s",query,c.path("word").asText(),c.path("conceptId").asText()).isBetween(0,9);
                }
            }
            assertThat(vocabularyRepository.count()).isEqualTo(courseCount);
            assertThat(srsReviewRepository.count()).isEqualTo(srsCount);
        } finally { dictionary.deleteAllByIdInBatch(ids); }
    }
}
