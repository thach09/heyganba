package com.heyganba.service;

import com.heyganba.model.entity.Vocabulary;
import org.junit.jupiter.api.Test;

import java.text.Normalizer;

import static org.assertj.core.api.Assertions.assertThat;

class VocabularyDigestV1CompatibilityTest {
    // Independent Python vectors use UTF-16 code-unit lengths, not code-point lengths,
    // and intentionally do not normalize V1. No Spring context or database is started.
    private static final String BASE = "f8349b00d2312820559467cf2beb5b584cd0018635f70f6bb89ca01b4c88f52e";

    private static Vocabulary base() {
        return Vocabulary.builder().word("学习").pinyin("xuéxí").meaningVi("học tập")
                .partOfSpeech("Động từ").hskLevel(1).build();
    }

    @Test void v1CoreGoldenVectorIsUnchanged() {
        assertThat(VocabularyProvenanceService.digest(base())).isEqualTo(BASE);
    }

    @Test void v1AllNineFieldsAndLegacyFallbackMatchTheSameGoldenVector() {
        Vocabulary modern = base();
        modern.setHanViet("học tập");
        modern.setExampleZh("我学习。");
        modern.setExamplePinyin("Wǒ xuéxí.");
        modern.setExampleVi("Tôi học.");
        modern.setHskLevel(2);
        Vocabulary legacy = Vocabulary.builder().word("学习").reading("xuéxí").meaning("học tập")
                .sinoVietnamese("học tập").exampleSentence("我学习。").exampleReading("Wǒ xuéxí.")
                .exampleMeaning("Tôi học.").hskLevel(2).partOfSpeech("Động từ").build();
        String expected = "7a5e322a55573379a115b7e0fb8dc3465750b124ca0c9e464b3e46d37ccebc0a";
        assertThat(VocabularyProvenanceService.digest(modern)).isEqualTo(expected);
        assertThat(VocabularyProvenanceService.digest(legacy)).isEqualTo(expected);
        modern.setReading("ignored legacy reading");
        modern.setMeaning("ignored legacy meaning");
        modern.setSinoVietnamese("ignored legacy HanViet");
        modern.setExampleSentence("ignored legacy sentence");
        modern.setExampleReading("ignored legacy example reading");
        modern.setExampleMeaning("ignored legacy example meaning");
        assertThat(VocabularyProvenanceService.digest(modern)).isEqualTo(expected);
    }

    @Test void v1NullStillEqualsEmptyAndEmptyModernValueDoesNotFallBack() {
        String expected = "0996440421ccaca0739c91ad01532245f3265c4738a8e309efae62c882c00533";
        assertThat(VocabularyProvenanceService.digest(Vocabulary.builder().hskLevel(null).build())).isEqualTo(expected);
        Vocabulary empty = Vocabulary.builder().word("").pinyin("").meaningVi("").hanViet("")
                .exampleZh("").examplePinyin("").exampleVi("").partOfSpeech("").hskLevel(null)
                .reading("must not fall back").meaning("must not fall back").sinoVietnamese("must not fall back")
                .exampleSentence("must not fall back").exampleReading("must not fall back")
                .exampleMeaning("must not fall back").build();
        assertThat(VocabularyProvenanceService.digest(empty)).isEqualTo(expected);
    }

    @Test void v1DoesNotNormalizeUnicode() {
        Vocabulary decomposed = base();
        decomposed.setPinyin(Normalizer.normalize(decomposed.getReading(), Normalizer.Form.NFD));
        decomposed.setMeaningVi(Normalizer.normalize(decomposed.getMeaning(), Normalizer.Form.NFD));
        assertThat(VocabularyProvenanceService.digest(decomposed))
                .isEqualTo("78c3271eec9c62663af9cc0a416219453129c66e20e3455faabf3c9f8cf685e4")
                .isNotEqualTo(BASE);
    }

    @Test void v1KeepsUtf16LengthForSupplementaryCharacters() {
        Vocabulary supplementary = Vocabulary.builder().word("𠀀").pinyin("hē").meaningVi("synthetic fixture")
                .hskLevel(null).partOfSpeech("noun").build();
        assertThat(VocabularyProvenanceService.digest(supplementary))
                .isEqualTo("df9269c1ef58e8c457d94f31b36fbc1f66079058b6afcaa517c7d7bffb3afecc");
    }

    @Test void v1ExcludedFieldsRemainExcluded() {
        Vocabulary word = base();
        word.setTraditional("學習");
        word.setAudioUrl("https://example.invalid/synthetic.mp3");
        word.setPinyinNormalized("xuexi");
        word.setCurriculumVersion("SYNTHETIC_TEST_GROUP");
        word.setHanVietVerified(true);
        word.setExampleVerified(true);
        assertThat(VocabularyProvenanceService.digest(word)).isEqualTo(BASE);
    }
}
