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
    @Test void retainedSupplementalDraftsCannotBePublishedWithCoreCapabilities() {
        word.setSinoVietnamese("UNVERIFIED");
        word.setExampleSentence("UNVERIFIED EXAMPLE");
        ObjectNode payload = fixture.payload(word, 0);
        ((ObjectNode) payload.path("capabilities")).put("hanViet", false).put("examples", false);
        for (String field : java.util.List.of("HAN_VIET", "EXAMPLE_ZH")) {
            ObjectNode result = (ObjectNode) payload.path("fieldResults").path(field);
            result.put("result", "NOT_VERIFIED").putArray("evidenceIds");
        }
        fixture.put(word.getId(), payload, false);
        assertThat(authority.canRead(word)).isFalse();
    }
    @Test void coreSubsetRequiresNewActualContentDigestAndCurrentRevision() {
        word.setSinoVietnamese("DRAFT RETAINED OUTSIDE PUBLIC ROW");
        fixture.register(word, 0);
        word.setSinoVietnamese(null);
        assertThat(authority.canRead(word)).isFalse(); // original V2 digest cannot bind a mask
        when(audit.vocabularyEligibilityRevision(word.getId())).thenReturn(1L);
        fixture.register(word, 0);
        assertThat(authority.canRead(word)).isFalse();
        fixture.register(word, 1);
        assertThat(authority.canRead(word)).isTrue();
        word.setExampleSentence("REINTRODUCED DRAFT");
        assertThat(authority.canRead(word)).isFalse();
    }
    @Test void signedFalseOptionalPresenceDoesNotMatchRetainedDatabaseFields() {
        word.setSinoVietnamese("UNVERIFIED");
        ObjectNode payload = fixture.payload(word, 0);
        ((ObjectNode) payload.path("capabilities")).put("hanViet", false);
        ((ObjectNode) payload.path("fieldResults").path("HAN_VIET")).put("result", "NOT_PRESENT").putArray("evidenceIds");
        fixture.put(word.getId(), payload, false);
        assertThat(authority.canRead(word)).isFalse();
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
