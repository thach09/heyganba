package com.heyganba;

import com.heyganba.model.entity.GrammarRule;
import com.heyganba.model.entity.Kanji;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.model.enums.ReviewStatus;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Runs against H2 and the CI PostgreSQL/Flyway schema, including real INSERTs. */
class ContentPersistenceContractTest extends ContentApiTestBase {

    @Test
    void vocabularyCompatibilityWritePreservesOptionalFieldsAndReadingFallback() {
        Vocabulary saved = vocabularyRepository.saveAndFlush(Vocabulary.builder()
                .word("学").reading("xué").meaning("học").build());

        Vocabulary reloaded = vocabularyRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getPinyin()).isNull();
        assertThat(reloaded.getPinyinNormalized()).isNull();
        assertThat(reloaded.getHanViet()).isNull();
        assertThat(reloaded.getMeaningVi()).isNull();
        assertThat(reloaded.getReading()).isEqualTo("xué");
        assertThat(reloaded.getMeaning()).isEqualTo("học");
        assertThat(reloaded.getReviewStatus()).isEqualTo(ReviewStatus.PENDING_REVIEW);
    }

    @Test
    void hanziDraftCanBeStoredBeforeOptionalReadingsAndMeaningAreProvided() {
        Kanji saved = kanjiRepository.saveAndFlush(Kanji.builder().character("学").build());

        Kanji reloaded = kanjiRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getPinyin()).isNull();
        assertThat(reloaded.getHanViet()).isNull();
        assertThat(reloaded.getMeaningVi()).isNull();
        assertThat(reloaded.getReviewStatus()).isEqualTo(ReviewStatus.PENDING_REVIEW);
    }

    @Test
    void grammarDraftCanBeStoredWithoutOptionalExamples() {
        GrammarRule saved = grammarRuleRepository.saveAndFlush(GrammarRule.builder()
                .title("Câu với 是").structure("A 是 B").explanation("Câu giới thiệu.")
                .orderIndex(1).build());

        GrammarRule reloaded = grammarRuleRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getExamplesJson()).isNull();
        assertThat(reloaded.getReviewStatus()).isEqualTo(ReviewStatus.PENDING_REVIEW);
    }
}
