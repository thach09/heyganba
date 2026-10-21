package com.heyganba.service.evidence;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.heyganba.service.VocabularyContentDigest.Content;
import com.heyganba.service.evidence.EvidenceVerificationContext.*;
import com.heyganba.service.evidence.VocabularyEvidenceReceipt.Field;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Set;
import java.util.stream.Stream;

import static com.heyganba.service.evidence.EvidenceVerificationOutcome.Status.*;
import static com.heyganba.service.evidence.ReceiptFixtures.*;
import static org.assertj.core.api.Assertions.*;

class VocabularyEvidenceReceiptStructureTest {
    private static void failure(byte[] serialized, EvidenceVerificationOutcome.Status status) {
        var result = verify(serialized);
        assertThat(result.status()).isEqualTo(status);
        assertThat(result.receipt()).isEmpty();
    }

    static Stream<String> criticalClaims() {
        return Stream.of("contractVersion", "verificationId", "issuerId", "keyId", "verificationMethod", "policyVersion",
                "subject", "sources", "evidenceBundleSha256", "privateEvidenceRef", "fieldResults", "capabilities",
                "syllabusClaims", "decisionVersion", "verificationRunId", "issuedAtEpochSecond");
    }

    @ParameterizedTest
    @MethodSource("criticalClaims")
    void missingCriticalClaimsFailClosed(String property) {
        ObjectNode p = payload();
        p.remove(property);
        failure(sign(p), INVALID_RECEIPT);
    }

    @ParameterizedTest
    @MethodSource("criticalClaims")
    void nullCriticalClaimsFailClosed(String property) {
        failure(sign(payload().putNull(property)), INVALID_RECEIPT);
    }

    @ParameterizedTest
    @ValueSource(strings = {"contractVersion", "algorithm", "issuerId", "keyId", "payload", "signature"})
    void missingEnvelopeClaimsFailClosed(String property) {
        ObjectNode e = envelope(sign(payload()));
        e.remove(property);
        failure(bytes(e), INVALID_RECEIPT);
    }

    @Test void duplicateEnvelopeFieldsAreRejectedEvenWhenValuesMatch() {
        String e = envelope(sign(payload())).toString();
        failure(("{\"algorithm\":\"Ed25519\"," + e.substring(1)).getBytes(StandardCharsets.UTF_8), INVALID_RECEIPT);
    }

    @Test void duplicateAuthenticatedPayloadFieldsAreRejected() {
        String p = payload().toString();
        failure(signRaw(("{\"verificationId\":\"synthetic-receipt-001\"," + p.substring(1)).getBytes(StandardCharsets.UTF_8)), INVALID_RECEIPT);
    }

    @Test void escapedDuplicateNestedKeyIsRejected() {
        String p = payload().toString().replace("\"eligibilityRevision\":7",
                "\"eligibilityRevision\":7,\"eligibility\\u0052evision\":7");
        failure(signRaw(p.getBytes(StandardCharsets.UTF_8)), INVALID_RECEIPT);
    }

    @ParameterizedTest
    @ValueSource(strings = {"verified", "critical", "publicKey", "definitions"})
    void unknownClaimsIncludingSelfDeclaredVerificationCannotEstablishTrust(String property) {
        failure(sign(payload().put(property, true)), INVALID_RECEIPT);
        failure(bytes(envelope(sign(payload())).put(property, true)), INVALID_RECEIPT);
    }

    @Test void unknownNestedClaimIsRejected() {
        ObjectNode p = payload();
        ((ObjectNode) p.path("subject")).put("approved", true);
        failure(sign(p), INVALID_RECEIPT);
    }

    @ParameterizedTest
    @ValueSource(strings = {"%%%", "AA==\n", "a", "!!!!", "_w==", "AA"})
    void malformedOrNoncanonicalBase64IsRejected(String bad) {
        failure(bytes(envelope(sign(payload())).put("payload", bad)), INVALID_RECEIPT);
        failure(bytes(envelope(sign(payload())).put("signature", bad)), INVALID_RECEIPT);
    }

    @Test void truncatedSignatureIsRejected() {
        failure(bytes(envelope(sign(payload())).put("signature", Base64.getEncoder().encodeToString(new byte[63]))), INVALID_RECEIPT);
    }

    @Test void malformedUtf8CannotBeSilentlyReplaced() {
        failure(new byte[]{(byte) 0xC3, 0x28}, INVALID_RECEIPT);
        failure(signRaw(new byte[]{(byte) 0xC3, 0x28}), INVALID_RECEIPT);
    }

    @Test void escapedUnpairedSurrogateIsRejected() {
        String p = payload().toString().replace("synthetic-run-001", "\\uD800");
        failure(signRaw(p.getBytes(StandardCharsets.UTF_8)), INVALID_RECEIPT);
    }

    @Test void utf8BomIsRejectedForEnvelopeAndPayload() {
        failure(("\uFEFF" + envelope(sign(payload()))).getBytes(StandardCharsets.UTF_8), INVALID_RECEIPT);
        failure(signRaw(("\uFEFF" + payload()).getBytes(StandardCharsets.UTF_8)), INVALID_RECEIPT);
    }

    @Test void trailingJsonTokensFailClosed() {
        failure((envelope(sign(payload())) + " {}").getBytes(StandardCharsets.UTF_8), INVALID_RECEIPT);
        failure(signRaw((payload() + " {}").getBytes(StandardCharsets.UTF_8)), INVALID_RECEIPT);
    }

    @ParameterizedTest
    @ValueSource(strings = {"[]", "null", "true", "42", "\"text\"", ""})
    void nonobjectOrEmptyJsonIsRejected(String value) {
        failure(value.getBytes(StandardCharsets.UTF_8), INVALID_RECEIPT);
        failure(signRaw(value.getBytes(StandardCharsets.UTF_8)), INVALID_RECEIPT);
    }

    @Test void oversizedEnvelopeAndDecodedPayloadAreRejected() {
        failure(new byte[VocabularyEvidenceReceiptVerifier.MAX_RECEIPT_BYTES + 1], INVALID_RECEIPT);
        failure(signRaw(new byte[VocabularyEvidenceReceiptVerifier.MAX_PAYLOAD_BYTES + 1]), INVALID_RECEIPT);
    }

    @Test void excessiveNestingIsRejectedBeforeBinding() {
        String deep = "[".repeat(20) + "0" + "]".repeat(20);
        failure(signRaw(("{\"bomb\":" + deep + "}").getBytes(StandardCharsets.UTF_8)), INVALID_RECEIPT);
    }

    @Test void excessiveTokenCountAndPropertyLengthAreRejected() {
        failure(signRaw(("{\"bomb\":[" + "0,".repeat(5000) + "0]}").getBytes(StandardCharsets.UTF_8)), INVALID_RECEIPT);
        failure(sign(payload().put("x".repeat(81), "too long")), INVALID_RECEIPT);
    }

    @Test void valuesCannotBeCoercedToTheRequiredTypes() {
        ObjectNode p = payload().put("verificationId", 123);
        failure(sign(p), INVALID_RECEIPT);
        p = payload();
        ((ObjectNode) p.path("subject")).put("eligibilityRevision", "7");
        failure(sign(p), INVALID_RECEIPT);
        ((ObjectNode) p.path("subject")).put("eligibilityRevision", 7.5);
        failure(sign(p), INVALID_RECEIPT);
        p = payload();
        ((ObjectNode) p.path("capabilities")).put("hanViet", "false");
        failure(sign(p), INVALID_RECEIPT);
        p = payload();
        field(p, Field.WORD).put("result", 0);
        failure(sign(p), INVALID_RECEIPT);
    }

    @Test void emptyOrExcessiveEvidenceSourcesAreRejected() {
        ObjectNode p = payload();
        p.putArray("sources");
        failure(sign(p), INVALID_RECEIPT);
        for (int i = 0; i < 9; i++) ((ArrayNode) p.path("sources")).add(source("e" + i, "cedict-fixture", "CC_CEDICT"));
        failure(sign(p), INVALID_RECEIPT);
    }

    @ParameterizedTest
    @EnumSource(Field.class)
    void everyFieldLevelResultMustBeExplicit(Field field) {
        ObjectNode p = payload();
        ((ObjectNode) p.path("fieldResults")).remove(field.name());
        failure(sign(p), INVALID_RECEIPT);
    }

    @Test void incompleteCoreOrTraditionalVerificationIsRejected() {
        for (Field f : Set.of(Field.WORD, Field.TRADITIONAL, Field.READING, Field.MEANING, Field.PART_OF_SPEECH)) {
            ObjectNode p = payload();
            field(p, f).put("result", "NOT_VERIFIED").putArray("evidenceIds");
            failure(sign(p), INVALID_RECEIPT);
        }
    }

    @Test void forgedOptionalCapabilityCannotPublishUnverifiedOrAbsentContent() {
        ObjectNode p = payload();
        ((ObjectNode) p.path("capabilities")).put("hanViet", true);
        failure(sign(p), INVALID_RECEIPT);
        p = payload();
        ((ObjectNode) p.path("capabilities")).put("examples", true);
        failure(sign(p), INVALID_RECEIPT);
        p = payload();
        field(p, Field.HAN_VIET).put("result", "VERIFIED").putArray("evidenceIds").add("a");
        failure(sign(p), INVALID_RECEIPT);
    }

    @Test void optionalDraftCanRemainUnverifiedAndCannotBePromotedByCapabilityAlone() {
        Content draft = new Content(CONTENT.word(), CONTENT.traditional(), CONTENT.reading(), CONTENT.meaning(), CONTENT.partOfSpeech(),
                "synthetic draft", null, null, null);
        ObjectNode p = payload();
        ((ObjectNode) p.path("subject")).put("contentDigest", expected(draft).contentDigest());
        field(p, Field.HAN_VIET).put("result", "NOT_VERIFIED");
        var verifier = new VocabularyEvidenceReceiptVerifier();
        assertThat(verifier.verify(sign(p), trust(), expected(draft), policy()).status()).isEqualTo(VALID);
        ((ObjectNode) p.path("capabilities")).put("hanViet", true);
        assertThat(verifier.verify(sign(p), trust(), expected(draft), policy()).status()).isEqualTo(INVALID_RECEIPT);
    }

    @Test void verifiedOptionalCapabilityStillRequiresTrustedPolicyPermission() {
        Content optional = new Content(CONTENT.word(), CONTENT.traditional(), CONTENT.reading(), CONTENT.meaning(), CONTENT.partOfSpeech(),
                "synthetic value", "synthetic sentence", "synthetic reading", "synthetic meaning");
        ObjectNode p = payload();
        ((ObjectNode) p.path("subject")).put("contentDigest", expected(optional).contentDigest());
        for (Field f : Set.of(Field.HAN_VIET, Field.EXAMPLE_ZH, Field.EXAMPLE_PINYIN, Field.EXAMPLE_VI)) {
            field(p, f).put("result", "VERIFIED").putArray("evidenceIds").add("a");
        }
        ((ObjectNode) p.path("capabilities")).put("hanViet", true).put("examples", true);
        var verifier = new VocabularyEvidenceReceiptVerifier();
        assertThat(verifier.verify(sign(p), trust(), expected(optional), policy()).status()).isEqualTo(VALID);
        Policy restricted = new Policy(policy().verificationMethod(), POLICY, policy().decisionVersion(), policy().sources(), false, false);
        assertThat(verifier.verify(sign(p), trust(), expected(optional), restricted).status()).isEqualTo(POLICY_MISMATCH);
    }

    @ParameterizedTest
    @ValueSource(strings = {"snapshotSha256", "extractionSha256", "entryId", "senseId"})
    void missingSnapshotExtractionOrEntryIdentityIsRejected(String property) {
        ObjectNode p = payload();
        ((ObjectNode) p.path("sources").get(0)).remove(property);
        failure(sign(p), INVALID_RECEIPT);
        p = payload();
        ((ObjectNode) p.path("sources").get(0)).put(property, "");
        failure(sign(p), INVALID_RECEIPT);
    }

    @Test void unknownSourceAndUnregisteredFamilyClaimsAreRejected() {
        ObjectNode p = payload();
        ((ObjectNode) p.path("sources").get(0)).put("sourceId", "self-declared-source");
        failure(sign(p), POLICY_MISMATCH);
        p = payload();
        ((ObjectNode) p.path("sources").get(0)).put("family", "SELF_DECLARED_INDEPENDENT");
        failure(sign(p), POLICY_MISMATCH);
    }

    @Test void twoRegisteredMirrorsRemainOneIndependentFamily() {
        ObjectNode p = payload();
        ((ObjectNode) p.path("sources").get(1)).put("sourceId", "cedict-mirror").put("family", "CC_CEDICT");
        failure(sign(p), POLICY_MISMATCH);
    }

    @Test void syllabusSourceCannotEstablishLexicalMeaningOrPos() {
        ObjectNode p = payload();
        ((ObjectNode) p.path("sources").get(1)).put("sourceId", "cti-fixture").put("family", "CTI_HSK_SYLLABUS");
        failure(sign(p), POLICY_MISMATCH);
    }

    @Test void danglingDuplicateAndMissingEvidenceReferencesAreRejected() {
        ObjectNode p = payload();
        field(p, Field.MEANING).putArray("evidenceIds").add("unknown");
        failure(sign(p), INVALID_RECEIPT);
        p = payload();
        field(p, Field.MEANING).putArray("evidenceIds").add("a").add("a");
        failure(sign(p), INVALID_RECEIPT);
        p = payload();
        field(p, Field.MEANING).putArray("evidenceIds");
        failure(sign(p), INVALID_RECEIPT);
        p = payload();
        ((ObjectNode) p.path("sources").get(1)).put("evidenceId", "a");
        failure(sign(p), INVALID_RECEIPT);
    }

    private static ObjectNode withSyllabusClaim() {
        ObjectNode p = payload();
        ((ArrayNode) p.path("sources")).add(source("c", "cti-fixture", "CTI_HSK_SYLLABUS"));
        ((ArrayNode) p.path("syllabusClaims")).addObject().put("syllabusVersion", "CTI_3.0_FIXTURE")
                .put("officialId", "synthetic-official-id").put("officialLevel", 9).putArray("evidenceIds").add("c");
        return p;
    }

    @Test void syllabusClassificationIsSeparateAndPreservesLevelNine() {
        var result = verify(sign(withSyllabusClaim()));
        assertThat(result.status()).isEqualTo(VALID);
        assertThat(result.receipt().orElseThrow().syllabusClaims().getFirst().officialLevel()).isEqualTo(9);
        assertThat(result.receipt().orElseThrow().subject().contentDigest()).isEqualTo(expected().contentDigest());
    }

    @Test void unsupportedSyllabusVersionAndLexicalSourceForClassificationFailClosed() {
        ObjectNode p = withSyllabusClaim();
        ((ObjectNode) p.path("syllabusClaims").get(0)).put("syllabusVersion", "SELF_DECLARED_SYLLABUS");
        failure(sign(p), POLICY_MISMATCH);
        p = withSyllabusClaim();
        ((ObjectNode) p.path("syllabusClaims").get(0)).putArray("evidenceIds").add("a");
        failure(sign(p), POLICY_MISMATCH);
    }

    @Test void invalidAndDuplicateSyllabusClassificationIsRejected() {
        ObjectNode p = withSyllabusClaim();
        ((ObjectNode) p.path("syllabusClaims").get(0)).put("officialLevel", 10);
        failure(sign(p), INVALID_RECEIPT);
        p = withSyllabusClaim();
        ((ArrayNode) p.path("syllabusClaims")).add(p.path("syllabusClaims").get(0).deepCopy());
        failure(sign(p), INVALID_RECEIPT);
    }

    @Test void privateReferenceMustBeOpaqueAndCannotBecomeUrlOrLocalPath() {
        failure(sign(payload().put("privateEvidenceRef", "https://example.invalid/snapshot")), INVALID_RECEIPT);
        failure(sign(payload().put("privateEvidenceRef", "C:\\private\\snapshot")), INVALID_RECEIPT);
    }

    @Test void nullReceiptReturnsTypedFailure() { failure(null, INVALID_RECEIPT); }

    @Test void acceptedReceiptCollectionsAreImmutable() {
        var receipt = verify(sign(payload())).receipt().orElseThrow();
        assertThatThrownBy(() -> receipt.sources().clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> receipt.fieldResults().clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> receipt.fieldResults().get(Field.WORD).evidenceIds().clear()).isInstanceOf(UnsupportedOperationException.class);
    }
}
