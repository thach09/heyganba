package com.heyganba.service;

import com.heyganba.model.entity.Vocabulary;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Objects;

/** Frozen historical V1 codec. A matching checksum is not publication authorization.
 * Keep UTF-16 lengths, null-as-empty and effective legacy getters; never infer V2.
 */
public final class VocabularyLegacyDigest {
    private VocabularyLegacyDigest() {}

    public static String digest(Vocabulary vocabulary) {
        Objects.requireNonNull(vocabulary, "Vocabulary is required");
        StringBuilder content = new StringBuilder();
        for (Object field : Arrays.asList(vocabulary.getWord(), vocabulary.getReading(),
                vocabulary.getMeaning(), vocabulary.getSinoVietnamese(), vocabulary.getExampleSentence(),
                vocabulary.getExampleReading(), vocabulary.getExampleMeaning(), vocabulary.getHskLevel(),
                vocabulary.getPartOfSpeech())) {
            String value = field == null ? "" : field.toString();
            content.append(value.length()).append(':').append(value);
        }
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(content.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 is unavailable", error);
        }
    }
}
