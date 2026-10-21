package com.heyganba.service.evidence;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.heyganba.service.VocabularyContentDigest;
import com.heyganba.service.VocabularyContentDigest.Content;
import com.heyganba.service.evidence.EvidenceVerificationContext.*;
import com.heyganba.service.evidence.VocabularyEvidenceReceipt.Field;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.time.Instant;
import java.util.Base64;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/** Synthetic metadata only. Test keys exist in memory and are never serialized or logged. */
final class ReceiptFixtures {
    static final ObjectMapper JSON = new ObjectMapper();
    static final Instant NOW = Instant.parse("2026-10-21T00:00:00Z");
    static final KeyPair TEST_KEY = newKey();
    static final String ISSUER = "synthetic-verifier";
    static final String KEY_ID = "test-only-key";
    static final String POLICY = "WEB_CROSS_CHECKED_2026_10_20_V1";
    static final String SUBJECT = "vocabulary:isolated-fixture:42";
    static final Content CONTENT = new Content("学习", "學習", "xuéxí", "học tập", "Động từ", null, null, null, null);

    private ReceiptFixtures() {}

    static KeyPair newKey() {
        try { return KeyPairGenerator.getInstance("Ed25519").generateKeyPair(); }
        catch (Exception error) { throw new AssertionError(error); }
    }

    static Trust trust() { return trust(TEST_KEY); }

    static Trust trust(KeyPair key) {
        return new Trust(Map.of(new KeyIdentity(ISSUER, KEY_ID), new TrustedKey(key.getPublic(),
                NOW.minusSeconds(3600), NOW.plusSeconds(3600), true)), Set.of(), Set.of(), NOW);
    }

    static Policy policy() {
        Set<Field> all = EnumSet.allOf(Field.class);
        return new Policy("WEB_CROSS_CHECKED", POLICY, "SEMANTIC_ASSERTION_V1", Map.of(
                "cedict-fixture", new SourceRegistration("CC_CEDICT", SourceKind.LEXICAL, all, Set.of()),
                "moe-fixture", new SourceRegistration("TAIWAN_MOE", SourceKind.LEXICAL, all, Set.of()),
                "cedict-mirror", new SourceRegistration("CC_CEDICT", SourceKind.LEXICAL, all, Set.of()),
                "cti-fixture", new SourceRegistration("CTI_HSK_SYLLABUS", SourceKind.SYLLABUS, Set.of(), Set.of("CTI_3.0_FIXTURE"))),
                true, true);
    }

    static ExpectedBinding expected() { return expected(CONTENT); }

    static ExpectedBinding expected(Content content) {
        Set<Field> present = EnumSet.copyOf(EvidenceVerificationContext.CORE);
        String[] values = {content.traditional(), content.hanViet(), content.exampleZh(), content.examplePinyin(), content.exampleVi()};
        Field[] fields = {Field.TRADITIONAL, Field.HAN_VIET, Field.EXAMPLE_ZH, Field.EXAMPLE_PINYIN, Field.EXAMPLE_VI};
        for (int i = 0; i < fields.length; i++) if (values[i] != null && !values[i].isBlank()) present.add(fields[i]);
        return new ExpectedBinding(SUBJECT, 7, VocabularyContentDigest.VERSION,
                VocabularyContentDigest.digest(VocabularyContentDigest.VERSION, content), present);
    }

    static ObjectNode payload() {
        ObjectNode p = JSON.createObjectNode();
        p.put("contractVersion", VocabularyEvidenceReceipt.VERSION);
        p.put("verificationId", "synthetic-receipt-001");
        p.put("issuerId", ISSUER);
        p.put("keyId", KEY_ID);
        p.put("verificationMethod", "WEB_CROSS_CHECKED");
        p.put("policyVersion", POLICY);
        p.putObject("subject").put("identity", SUBJECT).put("eligibilityRevision", 7)
                .put("contentDigestVersion", VocabularyContentDigest.VERSION).put("contentDigest", expected().contentDigest());
        ArrayNode sources = p.putArray("sources");
        sources.add(source("a", "cedict-fixture", "CC_CEDICT"));
        sources.add(source("b", "moe-fixture", "TAIWAN_MOE"));
        p.put("evidenceBundleSha256", "3".repeat(64));
        p.put("privateEvidenceRef", "urn:heyganba:evidence:synthetic-only");
        ObjectNode fields = p.putObject("fieldResults");
        for (Field field : Field.values()) {
            boolean present = expected().presentFields().contains(field);
            ObjectNode result = fields.putObject(field.name()).put("result", present ? "VERIFIED" : "NOT_PRESENT");
            ArrayNode refs = result.putArray("evidenceIds");
            if (present) refs.add("a").add("b");
        }
        p.putObject("capabilities").put("hanViet", false).put("examples", false);
        p.putArray("syllabusClaims");
        p.put("decisionVersion", "SEMANTIC_ASSERTION_V1");
        p.put("verificationRunId", "synthetic-run-001");
        p.put("issuedAtEpochSecond", NOW.minusSeconds(60).getEpochSecond());
        return p;
    }

    static ObjectNode source(String evidenceId, String sourceId, String family) {
        return JSON.createObjectNode().put("evidenceId", evidenceId).put("sourceId", sourceId).put("family", family)
                .put("snapshotSha256", "1".repeat(64)).put("entryId", "synthetic-entry")
                .put("senseId", "synthetic-sense").put("extractionSha256", "2".repeat(64));
    }

    static ObjectNode field(ObjectNode payload, Field field) { return (ObjectNode) payload.path("fieldResults").path(field.name()); }

    static byte[] sign(ObjectNode payload) { return signRaw(payload.toString().getBytes(StandardCharsets.UTF_8)); }

    static byte[] signRaw(byte[] payload) {
        return signRaw(payload, TEST_KEY, "HEYGANBA/VOCAB-EVIDENCE-RECEIPT/V1\0");
    }

    static byte[] signRaw(byte[] payload, KeyPair key, String domain) {
        try {
            Signature signer = Signature.getInstance("Ed25519");
            signer.initSign(key.getPrivate());
            signer.update(domain.getBytes(StandardCharsets.US_ASCII));
            signer.update(payload);
            ObjectNode envelope = JSON.createObjectNode().put("contractVersion", VocabularyEvidenceReceipt.VERSION)
                    .put("algorithm", "Ed25519").put("issuerId", ISSUER).put("keyId", KEY_ID)
                    .put("payload", Base64.getEncoder().encodeToString(payload))
                    .put("signature", Base64.getEncoder().encodeToString(signer.sign()));
            return JSON.writeValueAsBytes(envelope);
        } catch (Exception error) { throw new AssertionError(error); }
    }

    static ObjectNode envelope(byte[] serialized) {
        try { return (ObjectNode) JSON.readTree(serialized); }
        catch (Exception error) { throw new AssertionError(error); }
    }

    static byte[] bytes(ObjectNode node) { return node.toString().getBytes(StandardCharsets.UTF_8); }

    static EvidenceVerificationOutcome verify(byte[] serialized) {
        return new VocabularyEvidenceReceiptVerifier().verify(serialized, trust(), expected(), policy());
    }
}
