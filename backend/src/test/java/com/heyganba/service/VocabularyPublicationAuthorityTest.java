package com.heyganba.service;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.model.enums.ReviewStatus;
import com.heyganba.repository.AuditLogRepository;
import com.heyganba.support.PublicationCatalogFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.nio.file.Files;
import java.time.Instant;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class VocabularyPublicationAuthorityTest {
    PublicationCatalogFixture fixture;
    AuditLogRepository audit;
    VocabularyPublicationAuthority authority;
    Vocabulary word;
    @BeforeEach void setup() {
        fixture = new PublicationCatalogFixture(); audit = mock(AuditLogRepository.class);
        authority = new VocabularyPublicationAuthority(audit, fixture.path().toString());
        word = Vocabulary.builder().id(101L).word("fixture").pinyin("fixture").meaningVi("Synthetic meaning")
                .partOfSpeech("TEST_ONLY").reviewStatus(ReviewStatus.APPROVED).build();
        fixture.register(word, 0);
    }
    @Test void validReceiptAndIndependentRightsAllowPublishedCore() {
        assertThat(authority.canRead(word)).isTrue();
        assertThat(authority.requireEligible(word).verificationId()).isEqualTo("fixture-issuer:fixture-101");
    }
    @Test void noServerCatalogCannotBeReplacedByAnApprovedFlagOrPublisherUrl() {
        word.setSourceRef("https://www.collinsdictionary.com/dictionary/chinese-english/fixture");
        assertThat(new VocabularyPublicationAuthority(audit, "").canRead(word)).isFalse();
    }
    @Test void invalidSignatureCannotAuthorizePublication() {
        fixture.put(word.getId(), fixture.payload(word, 0), true);
        assertThat(authority.canRead(word)).isFalse();
    }
    @Test void modifiedContentInvalidatesTheReceipt() {
        word.setMeaningVi("changed"); assertThat(authority.canRead(word)).isFalse();
    }
    @Test void receiptForAnotherVocabularyCannotBeReplayed() {
        ObjectNode payload = fixture.payload(word, 0);
        ((ObjectNode) payload.path("subject")).put("identity", "fixture:vocabulary:102");
        fixture.put(101, payload, false); assertThat(authority.canRead(word)).isFalse();
    }
    @Test void mutationOrWithdrawalRequiresANewEligibilityRevisionEvenAfterContentIsRestored() {
        when(audit.vocabularyEligibilityRevision(101L)).thenReturn(9L);
        assertThat(authority.canRead(word)).isFalse();
        fixture.register(word, 9); assertThat(authority.canRead(word)).isTrue();
    }
    @Test void revokedEvidenceIsRejectedOnTheNextCall() {
        assertThat(authority.canRead(word)).isTrue();
        fixture.catalog().withArray("revokedReceipts").addObject().put("issuerId", "fixture-issuer").put("verificationId", "fixture-101");
        fixture.write(); assertThat(authority.canRead(word)).isFalse();
    }
    @Test void aSignatureDoesNotGrantMissingRedistributionRights() {
        ((ObjectNode) fixture.catalog().path("rights")).remove("source-a"); fixture.write();
        assertThat(authority.canRead(word)).isFalse();
    }
    @Test void expiredRightsAreNotPublicationPermission() {
        ((ObjectNode) fixture.catalog().path("rights").path("source-a")).put("notAfter", Instant.now().minusSeconds(1).toString());
        fixture.write(); assertThat(authority.canRead(word)).isFalse();
    }
    @Test void incompleteMetadataCannotBeSignedIntoVisibility() {
        word.setPartOfSpeech(null); assertThat(authority.canRead(word)).isFalse();
    }
    @Test void missingOrModifiedSourceObjectsFailClosed() throws Exception {
        Files.writeString(fixture.path().getParent().resolve("objects").resolve(fixture.snapshotA()), "tampered");
        assertThat(authority.canRead(word)).isFalse();
    }
    @Test void reviewStatusStillCannotBeEscalatedByAValidReceipt() {
        word.setReviewStatus(ReviewStatus.PENDING_REVIEW); assertThat(authority.canRead(word)).isFalse();
    }
    @Test void malformedCatalogDoesNotLeakPrivatePathsOrParserErrors() throws Exception {
        Files.writeString(fixture.path(), "not JSON private fixture");
        assertThatThrownBy(() -> authority.requireEligible(word)).hasMessageNotContaining(fixture.path().toString())
                .hasMessageNotContaining("private fixture");
    }
}
