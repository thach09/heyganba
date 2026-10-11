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
    private static final String BATCH = "/db/migration-staging/vietnamese-assisted-batch-a.tsv";

    @Test void batchPinsIdentityAndSenseToTheBundledJmdictAndExcludesCConfidence() throws Exception {
        var source = DictionaryCurationIntegrityTest.snapshot();
        var rows = AssistedDictionaryCuration.read(getClass().getResourceAsStream(BATCH));
        assertThat(rows).hasSize(343);
        Set<Long> ids = new HashSet<>();
        for (var row : rows) {
            assertThat(ids.add(row.id())).isTrue();
            var jmdict = source.get(row.id());
            assertThat(jmdict).as("JMdict ID %s", row.id()).isNotNull();
            assertThat(row.word()).isEqualTo(jmdict[1]);
            assertThat(row.reading()).isEqualTo(jmdict[2]);
            assertThat(row.englishSense()).isEqualTo(jmdict[3]);
            assertThat(row.vietnameseMeaning()).isNotBlank();
            assertThat(row.status()).isEqualTo("ASSISTED");
            assertThat(row.confidence()).isIn("A", "B");
            assertThat(row.reviewNote()).isNotBlank();
        }
        var pilot = DictionaryCurationIntegrityTest.pilot();
        for (var concept : pilot.path("concepts")) {
            if (concept.path("confidence").asText().equals("C")
                    && !DictionaryCurationIntegrityTest.reviewedIds().contains(concept.path("jmdictId").asLong()))
                assertThat(ids).doesNotContain(concept.path("jmdictId").asLong());
        }
    }

    @Test void rejectsDuplicateEmptyNeedsReviewAndCConfidenceRows() {
        String valid = "1467640\t猫\tねこ\tcat\tmèo\tcon mèo\t\tASSISTED\tA\tClear basic animal sense";
        for (String data : new String[]{valid + "\n" + valid, valid.replace("\tmèo\t", "\t\t"),
                valid.replace("\tASSISTED\t", "\tNEEDS_REVIEW\t"), valid.replace("\tA\t", "\tC\t"),
                valid.replace("\tmèo\t", "\tmèo\u0001\t")}) {
            assertThatThrownBy(() -> AssistedDictionaryCuration.read(new ByteArrayInputStream(data.getBytes(StandardCharsets.UTF_8))))
                    .isInstanceOf(java.io.IOException.class);
        }
    }
}
