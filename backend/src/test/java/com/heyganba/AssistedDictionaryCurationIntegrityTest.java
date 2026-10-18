package com.heyganba;

import com.heyganba.service.AssistedDictionaryCuration;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AssistedDictionaryCurationIntegrityTest {
    private static final String BATCH_PREFIX = "/db/migration-staging/vietnamese-assisted-batch-";
    private static final String RUNTIME_RESOURCE = "/dictionary/assisted-ja-vi.tsv";

    @Test void allBatchesPinIdentityAndSenseToTheBundledJmdictAndExcludeNonAConfidence() throws Exception {
        var source = DictionaryCurationIntegrityTest.snapshot();
        Set<Long> ids = new HashSet<>();
        int total = 0;
        for (String batch : new String[]{"a", "b", "c", "d", "e", "f"}) {
            var rows = AssistedDictionaryCuration.read(getClass().getResourceAsStream(BATCH_PREFIX + batch + ".tsv"));
            assertThat(rows.size()).isBetween(batch.equals("a") ? 343 : 800, batch.equals("a") ? 343 : 900);
            for (var row : rows) {
                assertThat(ids.add(row.id())).isTrue();
                var jmdict = source.get(row.id());
                assertThat(jmdict).as("JMdict ID %s", row.id()).isNotNull();
                assertThat(row.word()).isEqualTo(jmdict[1]);
                assertThat(row.reading()).isEqualTo(jmdict[2]);
                assertThat(row.englishSense()).isEqualTo(jmdict[3]);
                assertThat(row.vietnameseMeaning()).isNotBlank();
                assertThat(row.status()).isEqualTo("ASSISTED");
                assertThat(row.confidence()).isEqualTo("A");
                assertThat(row.reviewNote()).isNotBlank();
            }
            total += rows.size();
        }
        assertThat(total).isEqualTo(4796);
        var pilot = DictionaryCurationIntegrityTest.pilot();
        for (var concept : pilot.path("concepts")) {
            if (concept.path("confidence").asText().equals("C")
                    && !DictionaryCurationIntegrityTest.reviewedIds().contains(concept.path("jmdictId").asLong()))
                assertThat(ids).doesNotContain(concept.path("jmdictId").asLong());
        }
    }

    @Test void runtimeResourceContainsOnlyTheValidatedAssistedRows() throws Exception {
        var rows = AssistedDictionaryCuration.read(getClass().getResourceAsStream(RUNTIME_RESOURCE));
        assertThat(rows).hasSize(4796);
        assertThat(rows).allSatisfy(row -> {
            assertThat(row.status()).isEqualTo("ASSISTED");
            assertThat(row.confidence()).isEqualTo("A");
        });
    }

    @Test void rejectsDuplicateEmptyNeedsReviewBAndCConfidenceRows() {
        String valid = "1467640\t猫\tねこ\tcat\tmèo\tcon mèo\t\tASSISTED\tA\tClear basic animal sense";
        for (String data : new String[]{valid + "\n" + valid, valid.replace("\tmèo\t", "\t\t"),
                valid.replace("\tASSISTED\t", "\tNEEDS_REVIEW\t"), valid.replace("\tA\t", "\tB\t"),
                valid.replace("\tA\t", "\tC\t"),
                valid.replace("\tmèo\t", "\tmèo\u0001\t")}) {
            assertThatThrownBy(() -> AssistedDictionaryCuration.read(new ByteArrayInputStream(data.getBytes(StandardCharsets.UTF_8))))
                    .isInstanceOf(java.io.IOException.class);
        }
    }
}
