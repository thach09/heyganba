package com.heyganba;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.service.DictionaryCuration;
import com.heyganba.service.DictionaryText;
import org.junit.jupiter.api.Test;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.GZIPInputStream;
import static org.assertj.core.api.Assertions.*;

class DictionaryCurationIntegrityTest {
    static final String PILOT = "/db/migration-staging/dictionary-coverage-pilot.json";
    static JsonNode pilot() throws IOException {
        return new ObjectMapper().readTree(DictionaryCurationIntegrityTest.class.getResourceAsStream(PILOT));
    }
    static Map<Long, String[]> snapshot() throws IOException {
        Map<Long, String[]> result = new HashMap<>();
        try (var reader = new BufferedReader(new InputStreamReader(new GZIPInputStream(
                DictionaryCurationIntegrityTest.class.getResourceAsStream("/dictionary/jmdict.tsv.gz")), StandardCharsets.UTF_8))) {
            for (String line; (line = reader.readLine()) != null;) {
                String[] fields = line.split("\t", -1);
                assertThat(fields).hasSize(5);
                assertThat(result.put(Long.parseLong(fields[0]), fields)).isNull();
            }
        }
        assertThat(result).hasSize(218867);
        return result;
    }
    static DictionaryCuration.Row row(JsonNode c) {
        return new DictionaryCuration.Row(c.path("jmdictId").asLong(), c.path("word").asText(), c.path("reading").asText(),
                c.path("word").asText(), c.path("reading").asText(), c.path("vietnameseMeaning").asText(), c.path("commonRank").asInt(),
                strings(c.path("vietnameseAliases")), strings(c.path("englishAliases")));
    }
    static List<String> strings(JsonNode array) {
        List<String> result = new ArrayList<>(); array.forEach(n -> result.add(n.asText())); return result;
    }

    @Test void everyReviewedAndDraftIdentityMatchesCanonicalSnapshot() throws Exception {
        var snapshot = snapshot();
        var reviewed = DictionaryCuration.read(getClass().getResourceAsStream("/dictionary/curated-ja-vi.tsv"));
        assertThat(reviewed).hasSize(204);
        assertThat(reviewed.stream().filter(r -> r.vietnamese().equals("bánh mì")).map(DictionaryCuration.Row::id))
                .containsExactly(1103090L);
        assertThat(snapshot.get(1103090L)[3]).startsWith("bread");
        assertThat(reviewed.stream().filter(r -> r.vietnamese().equals("xe buýt")).map(DictionaryCuration.Row::id))
                .containsExactly(1098390L);
        assertThat(snapshot.get(1098390L)[3]).startsWith("bus");
        for (var row : reviewed) {
            var source = snapshot.get(row.id());
            assertThat(source).as("Reviewed ID %s", row.id()).isNotNull();
            assertThat(row.sourceWord()).isEqualTo(source[1]);
            assertThat(row.sourceReading()).isEqualTo(source[2]);
        }
        JsonNode pilot = pilot();
        assertThat(pilot.path("notice").asText()).contains("DRAFT", "PENDING_REVIEW");
        assertThat(pilot.path("concepts").size()).isEqualTo(500);
        Set<Long> ids = new HashSet<>(); Set<String> concepts = new HashSet<>();
        for (var c : pilot.path("concepts")) {
            assertThat(ids.add(c.path("jmdictId").asLong())).as(c.path("conceptId").asText()).isTrue();
            assertThat(concepts.add(c.path("conceptId").asText())).isTrue();
            var source = snapshot.get(c.path("jmdictId").asLong());
            assertThat(source).isNotNull();
            assertThat(c.path("word").asText()).isEqualTo(source[1]);
            assertThat(c.path("reading").asText()).isEqualTo(source[2]);
            assertThat(c.path("englishSense").asText()).isEqualTo(source[3]);
            assertThat(c.path("reviewStatus").asText()).isEqualTo("PENDING_REVIEW");
            assertThat(c.path("confidence").asText()).isIn("A", "B", "C");
            assertThat(c.path("quality").asText()).isEqualTo(c.path("confidence").asText());
            if (c.path("confidence").asText().equals("C"))
                assertThat(c.path("reviewStatus").asText()).isNotEqualTo("APPROVED");
            assertThat(c.path("reviewNote").asText()).isNotBlank();
            for (String field : List.of("vi", "en", "word", "reading", "vietnameseMeaning")) {
                String value = c.path(field).asText();
                assertThat(value).isNotBlank().isEqualTo(value.strip());
                assertThat(value.codePoints().anyMatch(Character::isISOControl)).isFalse();
                assertThat(value).doesNotContain("|");
            }
            for (String field : List.of("vietnameseAliases", "englishAliases")) {
                Set<String> unique = new HashSet<>();
                for (String value : strings(c.path(field))) {
                    assertThat(value).isNotBlank().isEqualTo(value.strip()).hasSizeLessThanOrEqualTo(100).doesNotContain("|", ";");
                    assertThat(value.codePoints().anyMatch(Character::isISOControl)).isFalse();
                    assertThat(unique.add(DictionaryText.normalizePreservingDiacritics(value))).isTrue();
                }
            }
            var row = row(c);
            for (String alias : row.vietnameseAliases()) {
                assertThat(row.vietnameseSearchText()).contains(DictionaryText.normalize(alias), DictionaryText.normalizePreservingDiacritics(alias));
            }
            for (String query : strings(c.path("viAliases"))) {
                assertThat(row.vietnameseSearchText()).as("Preserved VI variant: %s", query)
                        .contains(DictionaryText.normalizePreservingDiacritics(query));
            }
            // New curation never increases a catalog entry's importance just to pass coverage.
            if (reviewed.stream().noneMatch(r -> r.id() == row.id())) assertThat(row.commonRank()).isEqualTo(1000);
        }
    }

    @Test void malformedRowsDuplicatesAndEmptyGlossesAreRejected() throws Exception {
        String valid = "1467640\t猫\tねこ\t猫\tねこ\tmèo\t1000";
        for (String data : List.of(valid + "\n" + valid, valid.replace("mèo", ""), valid.replace("mèo", "mèo\u0001"),
                valid + "\textra", valid.replace("1000", "-1"), valid + "\tcon mèo; con mèo\t")) {
            assertThatThrownBy(() -> DictionaryCuration.read(new ByteArrayInputStream(data.getBytes(StandardCharsets.UTF_8))))
                    .isInstanceOf(IOException.class);
        }
        var row = DictionaryCuration.read(new ByteArrayInputStream((valid + "\tcon mèo; mèo nhà\tpet cat").getBytes(StandardCharsets.UTF_8))).getFirst();
        assertThat(row.vietnamese()).isEqualTo("mèo");
        assertThat(row.vietnameseSearchText()).contains("con meo", "con mèo");
        assertThat(row.additionalSearchText()).endsWith(" | pet cat");
    }
}
