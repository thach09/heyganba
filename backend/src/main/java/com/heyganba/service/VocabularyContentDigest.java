package com.heyganba.service;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.util.Arrays;
import java.util.HexFormat;

/**
 * Standalone academic-content codec; deliberately not wired into publication or persistence.
 * This does not replace {@link VocabularyLegacyDigest#digest} (the historical V1 codec).
 *
 * <p>V2 fields, in order: word, traditional, reading, meaning, partOfSpeech, hanViet,
 * exampleZh, examplePinyin, exampleVi. Callers supply effective academic values, including
 * unpublished optional drafts, not learner DTOs. For legacy entities use the non-null
 * modern-column fallback implemented by Vocabulary's effective getters; empty is not null.
 *
 * <p>Excluded: audioUrl (media location, not audio identity), pinyinNormalized (search index),
 * verification flags/status (publication capabilities), curriculumVersion/hskLevel (grouping
 * and classification), source/evidence identities, database IDs and lesson placement.
 * A future verification contract must bind capabilities, classification and subject identity
 * separately; this digest alone is neither approval nor proof of source correctness.
 *
 * <p>Canonical bytes start with ASCII {@code HEYGANBA/VOCAB-CONTENT/V2} and a zero byte.
 * Each of the nine strings is encoded as 0x00 for null, otherwise 0x01 followed by an
 * unsigned four-byte big-endian UTF-8 byte length and the NFC UTF-8 bytes. Null and empty
 * differ. No trimming, case folding, NFKC, tone folding or newline conversion is applied.
 * Malformed UTF-16 is rejected before normalization/encoding. Output is lowercase SHA-256.
 */
public final class VocabularyContentDigest {
    public static final String VERSION = "VOCAB_CONTENT_V2";
    private static final byte[] DOMAIN = "HEYGANBA/VOCAB-CONTENT/V2\0".getBytes(StandardCharsets.US_ASCII);

    private VocabularyContentDigest() {}

    /** All nine positions are explicit; the four core lexical fields must be nonblank. */
    public record Content(String word, String traditional, String reading, String meaning,
                          String partOfSpeech, String hanViet, String exampleZh,
                          String examplePinyin, String exampleVi) {
        public Content {
            requireText("word", word);
            requireText("reading", reading);
            requireText("meaning", meaning);
            requireText("partOfSpeech", partOfSpeech);
            for (String value : Arrays.asList(word, traditional, reading, meaning, partOfSpeech,
                    hanViet, exampleZh, examplePinyin, exampleVi)) {
                requireWellFormedUnicode(value);
            }
        }
    }

    /** Requires an explicit version; unknown versions (including V1) are never inferred. */
    public static String digest(String version, Content content) {
        if (!VERSION.equals(version)) throw new IllegalArgumentException("Unsupported vocabulary digest version");
        if (content == null) throw new IllegalArgumentException("Content is required");
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        bytes.writeBytes(DOMAIN);
        for (String value : Arrays.asList(content.word(), content.traditional(), content.reading(),
                content.meaning(), content.partOfSpeech(), content.hanViet(), content.exampleZh(),
                content.examplePinyin(), content.exampleVi())) {
            if (value == null) {
                bytes.write(0);
            } else {
                byte[] utf8 = Normalizer.normalize(value, Normalizer.Form.NFC).getBytes(StandardCharsets.UTF_8);
                bytes.write(1);
                bytes.writeBytes(ByteBuffer.allocate(Integer.BYTES).putInt(utf8.length).array());
                bytes.writeBytes(utf8);
            }
        }
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes.toByteArray()));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 is unavailable", error);
        }
    }

    private static void requireText(String field, String value) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(field + " is required");
    }

    private static void requireWellFormedUnicode(String value) {
        if (value == null) return;
        for (int i = 0; i < value.length(); i++) {
            char unit = value.charAt(i);
            if (Character.isHighSurrogate(unit)) {
                if (i + 1 >= value.length() || !Character.isLowSurrogate(value.charAt(i + 1))) {
                    throw new IllegalArgumentException("Malformed Unicode");
                }
                i++;
            } else if (Character.isLowSurrogate(unit)) {
                throw new IllegalArgumentException("Malformed Unicode");
            }
        }
    }
}
