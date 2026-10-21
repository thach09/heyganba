package com.heyganba.service;

import com.heyganba.service.VocabularyContentDigest.Content;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;

class VocabularyContentDigestTest {
    // Fixed vectors independently computed with Python stdlib: NFC, UTF-8,
    // struct.pack('>I', byte_length), explicit 0/1 tags, hashlib.sha256.
    // These constants are not calculated by the Java implementation under test.
    private static final String BASE = "051363235ca768f973d7b8f7e345bb544af245ce8c19199a31abae10a61b104c";

    private static String[] fields() {
        return new String[]{"学习", "學習", "xuéxí", "học tập", "Động từ", null, null, null, null};
    }

    private static Content content(String[] f) {
        return new Content(f[0], f[1], f[2], f[3], f[4], f[5], f[6], f[7], f[8]);
    }

    private static String hash(String[] f) {
        return VocabularyContentDigest.digest(VocabularyContentDigest.VERSION, content(f));
    }

    @Test void explicitVersionAndIdenticalContentMatchIndependentGoldenVector() {
        assertThat(VocabularyContentDigest.VERSION).isEqualTo("VOCAB_CONTENT_V2");
        assertThat(hash(fields())).isEqualTo(BASE).matches("[0-9a-f]{64}");
        assertThat(hash(fields())).isEqualTo(BASE);
    }

    @ParameterizedTest(name = "academic field {0} changes digest")
    @ValueSource(ints = {0, 1, 2, 3, 4, 5, 6, 7, 8})
    void everyAcademicFieldIncludingTraditionalAndUnpublishedDraftsIsBound(int index) {
        String[] f = fields();
        f[index] = f[index] == null ? "synthetic optional draft" : f[index] + "!";
        assertThat(hash(f)).isNotEqualTo(BASE);
    }

    @Test void nullAndEmptyTraditionalHaveDistinctFixedVectors() {
        String[] f = fields();
        f[1] = null;
        assertThat(hash(f)).isEqualTo("0a034759812ce52a82e4744e8ec79f239afe5029ccf03bdbc764a2a58e73de0c");
        f[1] = "";
        assertThat(hash(f)).isEqualTo("390b9bb764380d225010ece0308172ce40e3c59137c0d013ef644d9d2d6ddc22");
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 5, 6, 7, 8})
    void nullDiffersFromEmptyInEveryNullablePosition(int index) {
        String[] f = fields();
        f[index] = null;
        String nullDigest = hash(f);
        f[index] = "";
        assertThat(hash(f)).isNotEqualTo(nullDigest);
    }

    @Test void nfcAndNfdHaveTheSameGoldenDigestWithoutMutatingInput() {
        String[] f = fields();
        for (int i = 0; i < f.length; i++) {
            if (f[i] != null) f[i] = Normalizer.normalize(f[i], Normalizer.Form.NFD);
        }
        Content decomposed = content(f);
        assertThat(decomposed.meaning()).isNotEqualTo("học tập");
        assertThat(VocabularyContentDigest.digest(VocabularyContentDigest.VERSION, decomposed)).isEqualTo(BASE);
        assertThat(decomposed.meaning()).isEqualTo(f[3]);
    }

    @Test void supplementaryCharactersMatchIndependentUtf8GoldenVector() {
        assertThat(hash(new String[]{"𠀀", "𠀁", "hē", "synthetic fixture", "noun", null, null, null, null}))
                .isEqualTo("33752a12de112faeef80d4a2cd2a0a6edf09cedd21093b2683ada44fb0dd4638");
    }

    @Test void allOptionalContentMatchesIndependentGoldenVector() {
        assertThat(hash(new String[]{"学习", "學習", "xuéxí", "học tập", "Động từ",
                "học tập", "我学习。", "Wǒ xuéxí.", "Tôi học."}))
                .isEqualTo("c5e6191112652688881b6acf183e14f9e614a622e0621a315a8d19f4e37b99fb");
    }

    static Stream<Object[]> malformedUnicode() {
        return IntStream.range(0, 9).boxed().flatMap(index -> Stream.of(
                new Object[]{index, "\uD800"}, new Object[]{index, "\uDC00"},
                new Object[]{index, "\uD800x"}, new Object[]{index, "\uDC00\uD800"}));
    }

    @ParameterizedTest(name = "reject malformed Unicode in field {0}, case {index}")
    @MethodSource("malformedUnicode")
    void rejectsMalformedUnicodeInEveryPosition(int index, String malformed) {
        String[] f = fields();
        f[index] = malformed;
        assertThatIllegalArgumentException().isThrownBy(() -> hash(f)).withMessage("Malformed Unicode");
    }

    static Stream<Object[]> missingCoreFields() {
        return Stream.of(0, 2, 3, 4).flatMap(index -> Arrays.asList(null, "", " \t\n").stream()
                .map(value -> new Object[]{index, value}));
    }

    @ParameterizedTest(name = "reject missing core field {0}, case {index}")
    @MethodSource("missingCoreFields")
    void rejectsMissingOrBlankCoreFields(int index, String missing) {
        String[] f = fields();
        f[index] = missing;
        assertThatIllegalArgumentException().isThrownBy(() -> hash(f));
    }

    @Test void rejectsMissingContent() {
        assertThatIllegalArgumentException().isThrownBy(() -> VocabularyContentDigest.digest(
                VocabularyContentDigest.VERSION, null)).withMessage("Content is required");
    }

    @Test void rejectsNullUnknownLegacyAndWrongCaseVersions() {
        for (String version : Arrays.asList(null, "", "VOCAB_CONTENT_V1", "VOCAB_CONTENT_V3", "vocab_content_v2")) {
            assertThatIllegalArgumentException().isThrownBy(() -> VocabularyContentDigest.digest(version, content(fields())))
                    .withMessage("Unsupported vocabulary digest version");
        }
    }

    @Test void fieldBoundariesAndOrderAreUnambiguous() {
        assertThat(hash(new String[]{"ab", null, "c", "meaning", "noun", null, null, null, null}))
                .isEqualTo("c77ae50d70741b2d74a4c2318fbea065b821badebfbe48ecbe6f307fac7974e7");
        assertThat(hash(new String[]{"a", null, "bc", "meaning", "noun", null, null, null, null}))
                .isEqualTo("adf87dafe9a8bae9719233543cadf24b3c405a62fdd404da7e66cca919e00229");
        String[] swapped = fields();
        swapped[0] = "學習";
        swapped[1] = "学习";
        assertThat(hash(swapped)).isNotEqualTo(BASE);
    }

    @Test void preservesToneUmlautCaseWhitespaceNewlineAndCompatibilityDistinctions() {
        for (String reading : new String[]{"xuexi", "XUÉXÍ", " xuéxí", "xuéxí ", "xuéxí\n"}) {
            String[] f = fields();
            f[2] = reading;
            assertThat(hash(f)).isNotEqualTo(BASE);
        }
        String[] f = fields();
        f[2] = "lǜ";
        String umlaut = hash(f);
        f[2] = "lù";
        assertThat(hash(f)).isNotEqualTo(umlaut);
        f[5] = "Ａ";
        String fullWidth = hash(f);
        f[5] = "A";
        assertThat(hash(f)).isNotEqualTo(fullWidth);
        f[6] = "line\r\nnext";
        String crlf = hash(f);
        f[6] = "line\nnext";
        assertThat(hash(f)).isNotEqualTo(crlf);
    }
}
