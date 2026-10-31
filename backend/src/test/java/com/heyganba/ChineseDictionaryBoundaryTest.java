package com.heyganba;

import com.heyganba.model.entity.DictionaryEntry;
import com.heyganba.repository.DictionaryEntryRepository;
import com.heyganba.service.DictionaryService;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import static org.assertj.core.api.Assertions.*;

/** Retiring a Japanese release gate must also remove its production data path. */
class ChineseDictionaryBoundaryTest extends ContentApiTestBase {
    @Autowired DictionaryEntryRepository catalog;
    @Autowired DictionaryService dictionary;

    @Test void japaneseResourcesAndCurationCodeAreAbsentFromTheChineseRuntime() throws Exception {
        for (String resource : new String[]{"/dictionary/jmdict.tsv.gz", "/dictionary/assisted-ja-vi.tsv",
                "/db/migration-staging/vietnamese-assisted-batch-a.tsv"})
            assertThat(getClass().getResource(resource)).as(resource).isNull();
        // The curation helpers are compiled in test-classes only, not the application classes.
        var location = Class.forName("com.heyganba.service.DictionaryCuration")
                .getProtectionDomain().getCodeSource().getLocation().toString();
        assertThat(location).endsWith("test-classes/");
    }

    @Test void japaneseCatalogRowsCannotBeSearchedOrMaterializedInTheChineseProfile() {
        long id = 9_100_000_001L;
        try {
            catalog.save(DictionaryEntry.builder().id(id).word("学校").reading("がっこう")
                    .meaning("school").searchText("学校 がっこう school").commonRank(1).build());
            assertThat(dictionary.search("がっこう").vocabularies()).isEmpty();
            assertThatThrownBy(() -> dictionary.lookup(-id))
                    .isInstanceOf(com.heyganba.common.exception.ResourceNotFoundException.class);
            assertThatThrownBy(() -> dictionary.resolveNotebookWord(-id))
                    .isInstanceOf(com.heyganba.common.exception.BadRequestException.class);
        } finally { catalog.deleteById(id); }
    }
}
