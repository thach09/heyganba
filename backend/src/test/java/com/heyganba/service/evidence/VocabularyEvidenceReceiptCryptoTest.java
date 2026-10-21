package com.heyganba.service.evidence;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.heyganba.service.VocabularyContentDigest.Content;
import com.heyganba.service.evidence.EvidenceVerificationContext.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.util.Base64;
import java.util.Map;
import java.util.Set;

import static com.heyganba.service.evidence.EvidenceVerificationOutcome.Status.*;
import static com.heyganba.service.evidence.ReceiptFixtures.*;
import static org.assertj.core.api.Assertions.*;

class VocabularyEvidenceReceiptCryptoTest {
    private final VocabularyEvidenceReceiptVerifier verifier = new VocabularyEvidenceReceiptVerifier();

    private static void failure(EvidenceVerificationOutcome outcome, EvidenceVerificationOutcome.Status status) {
        assertThat(outcome.status()).isEqualTo(status);
        assertThat(outcome.receipt()).isEmpty();
    }

    @Test void validTrustedReceiptAuthenticatesWithoutClaimingSemanticAssessment() {
        // Fake snapshot hashes and synthetic entry IDs are intentional: VALID cannot prove
        // that these sources were read or that the Chinese meaning was assessed correctly.
        var outcome = verify(sign(payload()));
        assertThat(outcome.status()).isEqualTo(VALID);
        assertThat(outcome.receipt()).isPresent();
        assertThat(outcome.receipt().orElseThrow().subject().contentDigest()).isEqualTo(expected().contentDigest());
        assertThat(outcome.receipt().orElseThrow().sources().getFirst().entryId()).isEqualTo("synthetic-entry");
    }

    @Test void modifiedSignedPayloadIsRejectedBeforeItsClaimsAreParsed() {
        ObjectNode envelope = envelope(sign(payload()));
        envelope.put("payload", Base64.getEncoder().encodeToString("not even JSON".getBytes(StandardCharsets.UTF_8)));
        failure(verify(bytes(envelope)), INVALID_SIGNATURE);
    }

    @Test void modifiedSignatureIsRejected() {
        ObjectNode envelope = envelope(sign(payload()));
        byte[] signature = Base64.getDecoder().decode(envelope.path("signature").asText());
        signature[0] ^= 1;
        envelope.put("signature", Base64.getEncoder().encodeToString(signature));
        failure(verify(bytes(envelope)), INVALID_SIGNATURE);
    }

    @ParameterizedTest
    @ValueSource(strings = {"issuerId", "keyId"})
    void unknownIssuerOrKeyCannotEstablishTrust(String property) {
        ObjectNode envelope = envelope(sign(payload())).put(property, "unknown");
        failure(verify(bytes(envelope)), UNTRUSTED_ISSUER);
    }

    @Test void incorrectConfiguredKeyRejectsRealSignature() {
        failure(verifier.verify(sign(payload()), trust(newKey()), expected(), policy()), INVALID_SIGNATURE);
    }

    @ParameterizedTest
    @ValueSource(strings = {"issuerId", "keyId"})
    void envelopeAndSignedIdentityMustMatch(String property) {
        ObjectNode p = payload().put(property, "different-signed-identity");
        failure(verify(sign(p)), INVALID_RECEIPT);
    }

    @ParameterizedTest
    @ValueSource(strings = {"none", "HS256", "Ed448", "ed25519"})
    void algorithmCannotBeSelectedByUntrustedInput(String algorithm) {
        failure(verify(bytes(envelope(sign(payload())).put("algorithm", algorithm))), UNSUPPORTED_VERSION);
    }

    @Test void unsupportedEnvelopeVersionFailsClosed() {
        failure(verify(bytes(envelope(sign(payload())).put("contractVersion", "FUTURE"))), UNSUPPORTED_VERSION);
    }

    @ParameterizedTest
    @ValueSource(strings = {"contractVersion", "contentDigestVersion"})
    void unsupportedAuthenticatedContractOrDigestVersionFailsClosed(String property) {
        ObjectNode p = payload();
        if (property.equals("contentDigestVersion")) ((ObjectNode) p.path("subject")).put(property, "VOCAB_CONTENT_V1");
        else p.put(property, "FUTURE");
        failure(verify(sign(p)), UNSUPPORTED_VERSION);
    }

    @Test void wrongSubjectAndReplayAgainstAnotherVocabularyAreRejected() {
        ExpectedBinding other = new ExpectedBinding("vocabulary:isolated-fixture:43", 7,
                expected().contentDigestVersion(), expected().contentDigest(), expected().presentFields());
        failure(verifier.verify(sign(payload()), trust(), other, policy()), SUBJECT_MISMATCH);
    }

    @Test void staleEligibilityRevisionIsRejected() {
        ObjectNode p = payload();
        ((ObjectNode) p.path("subject")).put("eligibilityRevision", 6);
        failure(verify(sign(p)), REVISION_MISMATCH);
    }

    @Test void wrongWellFormedV2DigestIsRejected() {
        ObjectNode p = payload();
        ((ObjectNode) p.path("subject")).put("contentDigest", "a".repeat(64));
        failure(verify(sign(p)), CONTENT_DIGEST_MISMATCH);
    }

    @Test void validSignatureCannotBeReusedAfterOnlyTraditionalContentChanges() {
        Content changed = new Content(CONTENT.word(), "学习", CONTENT.reading(), CONTENT.meaning(), CONTENT.partOfSpeech(),
                null, null, null, null);
        failure(verifier.verify(sign(payload()), trust(), expected(changed), policy()), CONTENT_DIGEST_MISMATCH);
    }

    @ParameterizedTest
    @ValueSource(strings = {"policyVersion", "verificationMethod", "decisionVersion"})
    void staleOrDifferentPolicyMethodAndDecisionAreRejected(String property) {
        failure(verify(sign(payload().put(property, "STALE"))), POLICY_MISMATCH);
    }

    @Test void revokedVerificationIdentityIsRejected() {
        Trust revoked = new Trust(trust().keys(), Set.of(), Set.of(new ReceiptIdentity(ISSUER, "synthetic-receipt-001")), NOW);
        failure(verifier.verify(sign(payload()), revoked, expected(), policy()), REVOKED_OR_INACTIVE);
    }

    @Test void inactiveIssuerIsRejected() {
        Trust inactive = new Trust(trust().keys(), Set.of(ISSUER), Set.of(), NOW);
        failure(verifier.verify(sign(payload()), inactive, expected(), policy()), REVOKED_OR_INACTIVE);
    }

    @Test void inactiveKeyIsRejected() {
        Trust inactive = new Trust(Map.of(new KeyIdentity(ISSUER, KEY_ID), new TrustedKey(TEST_KEY.getPublic(),
                NOW.minusSeconds(3600), NOW.plusSeconds(3600), false)), Set.of(), Set.of(), NOW);
        failure(verifier.verify(sign(payload()), inactive, expected(), policy()), REVOKED_OR_INACTIVE);
    }

    @ParameterizedTest
    @ValueSource(longs = {-3601, 3600})
    void notYetValidOrExpiredTrustedKeyIsRejected(long offset) {
        Trust shifted = new Trust(trust().keys(), Set.of(), Set.of(), NOW.plusSeconds(offset));
        ObjectNode p = payload();
        if (offset < 0) p.put("issuedAtEpochSecond", NOW.plusSeconds(offset).getEpochSecond());
        failure(verifier.verify(sign(p), shifted, expected(), policy()), REVOKED_OR_INACTIVE);
    }

    @Test void issuanceOutsideTrustedKeyIntervalIsRejected() {
        failure(verify(sign(payload().put("issuedAtEpochSecond", NOW.minusSeconds(3601).getEpochSecond()))), REVOKED_OR_INACTIVE);
    }

    @Test void futureIssuanceIsInvalid() {
        failure(verify(sign(payload().put("issuedAtEpochSecond", NOW.plusSeconds(1).getEpochSecond()))), INVALID_RECEIPT);
    }

    @Test void revocationIsScopedToIssuerAndReceiptIdentity() {
        Trust unrelated = new Trust(trust().keys(), Set.of(), Set.of(new ReceiptIdentity("another-issuer", "synthetic-receipt-001")), NOW);
        assertThat(verifier.verify(sign(payload()), unrelated, expected(), policy()).status()).isEqualTo(VALID);
    }

    @Test void exactWhitespaceBytesAreAuthenticatedWithoutReserialization() throws Exception {
        byte[] pretty = JSON.writerWithDefaultPrettyPrinter().writeValueAsBytes(payload());
        assertThat(verify(signRaw(pretty)).status()).isEqualTo(VALID);
        ObjectNode envelope = envelope(signRaw(pretty));
        envelope.put("payload", Base64.getEncoder().encodeToString(bytes(payload())));
        failure(verify(bytes(envelope)), INVALID_SIGNATURE);
    }

    @Test void signatureFromAnotherDomainCannotBeReplayed() {
        failure(verify(signRaw(bytes(payload()), TEST_KEY, "")), INVALID_SIGNATURE);
    }

    @Test void testKeyPairsAreOnlyEphemeralPublicKeyContextIsExplicit() {
        KeyPair another = newKey();
        assertThat(another.getPublic().getEncoded()).isNotEqualTo(TEST_KEY.getPublic().getEncoded());
        assertThat(verify(signRaw(bytes(payload()), another, "HEYGANBA/VOCAB-EVIDENCE-RECEIPT/V1\0")).status())
                .isEqualTo(INVALID_SIGNATURE);
    }
}
