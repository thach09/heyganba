package com.heyganba.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.service.VocabularyContentDigest;
import com.heyganba.service.evidence.VocabularyEvidenceReceipt.Field;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.*;
import java.time.Instant;
import java.util.*;

/** Synthetic data and an ephemeral test key only. Never signs real source assessments. */
public final class PublicationCatalogFixture {
    private final ObjectMapper json = new ObjectMapper();
    private final KeyPair keys;
    private final Path root;
    private final ObjectNode catalog;
    private final String snapshotA, snapshotB, extractionA, extractionB, bundle;

    public PublicationCatalogFixture() {
        try {
            root = Files.createTempDirectory("heyganba-publication-fixture-");
            Files.createDirectories(root.resolve("objects"));
            keys = KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
            snapshotA = object("SYNTHETIC_SOURCE_A_NOT_REAL_LANGUAGE_DATA");
            snapshotB = object("SYNTHETIC_SOURCE_B_NOT_REAL_LANGUAGE_DATA");
            extractionA = object("SYNTHETIC_EXTRACTION_A"); extractionB = object("SYNTHETIC_EXTRACTION_B");
            bundle = object("SYNTHETIC_EVIDENCE_BUNDLE");
            catalog = json.createObjectNode();
            catalog.put("version", "VOCAB_PUBLICATION_CATALOG_V1").put("instanceId", "fixture");
            ObjectNode key = catalog.putArray("keys").addObject();
            key.put("issuerId", "fixture-issuer").put("keyId", "fixture-key")
                    .put("publicKeyX509", Base64.getEncoder().encodeToString(keys.getPublic().getEncoded()))
                    .put("notBefore", Instant.now().minusSeconds(3600).toString())
                    .put("notAfter", Instant.now().plusSeconds(86400).toString()).put("active", true);
            catalog.putArray("inactiveIssuers"); catalog.putArray("revokedReceipts");
            ObjectNode policy = catalog.putObject("policy");
            policy.put("verificationMethod", "WEB_CROSS_CHECKED").put("policyVersion", "fixture-policy")
                    .put("decisionVersion", "fixture-decision").put("allowHanViet", true).put("allowExamples", true);
            ObjectNode sources = policy.putObject("sources"), rights = catalog.putObject("rights");
            for (String id : List.of("source-a", "source-b")) {
                ObjectNode source = sources.putObject(id);
                source.put("family", id).put("kind", "LEXICAL"); source.putArray("syllabusVersions");
                for (Field field : Field.values()) source.withArray("allowedFields").add(field.name());
                ObjectNode license = rights.putObject(id);
                license.put("status", "CLEARED").put("decisionRef", "SYNTHETIC_TEST_ONLY")
                        .put("licenseId", "SYNTHETIC_TEST_ONLY").put("notAfter", Instant.now().plusSeconds(86400).toString());
                license.putArray("scopes").add("CORE_FIELDS").add("OPTIONAL_FIELDS");
            }
            catalog.putObject("receipts"); write();
        } catch (Exception error) { throw new IllegalStateException(error); }
    }
    public void reset() {
        catalog.putObject("receipts"); catalog.putArray("revokedReceipts"); write();
    }
    public Path path() { return root.resolve("catalog.json"); }
    public ObjectNode catalog() { return catalog; }
    public String snapshotA() { return snapshotA; }
    public void write() {
        try { Files.write(path(), json.writeValueAsBytes(catalog)); }
        catch (Exception error) { throw new IllegalStateException(error); }
    }
    public String object(String value) throws Exception {
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        Files.write(root.resolve("objects").resolve(hash), bytes); return hash;
    }
    public ObjectNode payload(Vocabulary v, long revision) {
        String digest = VocabularyContentDigest.digest(VocabularyContentDigest.VERSION,
                new VocabularyContentDigest.Content(v.getWord(), v.getTraditional(), v.getReading(), v.getMeaning(),
                        v.getPartOfSpeech(), v.getSinoVietnamese(), v.getExampleSentence(), v.getExampleReading(), v.getExampleMeaning()));
        ObjectNode receipt = json.createObjectNode();
        receipt.put("contractVersion", "VOCAB_EVIDENCE_RECEIPT_V1").put("verificationId", "fixture-" + v.getId())
                .put("issuerId", "fixture-issuer").put("keyId", "fixture-key").put("verificationMethod", "WEB_CROSS_CHECKED")
                .put("policyVersion", "fixture-policy").put("decisionVersion", "fixture-decision")
                .put("verificationRunId", "fixture-run").put("issuedAtEpochSecond", Instant.now().minusSeconds(1).getEpochSecond())
                .put("evidenceBundleSha256", bundle).put("privateEvidenceRef", "urn:heyganba:evidence:fixture");
        receipt.putObject("subject").put("identity", "fixture:vocabulary:" + v.getId())
                .put("eligibilityRevision", revision).put("contentDigestVersion", VocabularyContentDigest.VERSION).put("contentDigest", digest);
        var sourceArray = receipt.putArray("sources");
        for (String id : List.of("a", "b")) sourceArray.addObject().put("evidenceId", id).put("sourceId", "source-" + id)
                .put("family", "source-" + id).put("snapshotSha256", id.equals("a") ? snapshotA : snapshotB)
                .put("entryId", "fixture-entry").put("senseId", "fixture-sense")
                .put("extractionSha256", id.equals("a") ? extractionA : extractionB);
        String[] values = {v.getWord(), v.getTraditional(), v.getReading(), v.getMeaning(), v.getPartOfSpeech(),
                v.getSinoVietnamese(), v.getExampleSentence(), v.getExampleReading(), v.getExampleMeaning()};
        ObjectNode results = receipt.putObject("fieldResults");
        for (Field field : Field.values()) {
            boolean present = values[field.ordinal()] != null && !values[field.ordinal()].isBlank();
            ObjectNode result = results.putObject(field.name()).put("result", present ? "VERIFIED" : "NOT_PRESENT");
            var ids = result.putArray("evidenceIds"); if (present) ids.add("a").add("b");
        }
        receipt.putObject("capabilities").put("hanViet", v.getSinoVietnamese() != null && !v.getSinoVietnamese().isBlank())
                .put("examples", v.getExampleSentence() != null && !v.getExampleSentence().isBlank());
        receipt.putArray("syllabusClaims"); return receipt;
    }
    public void register(Vocabulary v, long revision) { put(v.getId(), payload(v, revision), false); }
    public void put(long vocabularyId, ObjectNode payload, boolean invalidSignature) {
        try {
            byte[] bytes = json.writeValueAsBytes(payload);
            Signature signer = Signature.getInstance("Ed25519"); signer.initSign(keys.getPrivate());
            signer.update("HEYGANBA/VOCAB-EVIDENCE-RECEIPT/V1\0".getBytes(StandardCharsets.US_ASCII)); signer.update(bytes);
            byte[] signature = signer.sign(); if (invalidSignature) signature[0] ^= 1;
            ObjectNode envelope = json.createObjectNode().put("contractVersion", "VOCAB_EVIDENCE_RECEIPT_V1")
                    .put("algorithm", "Ed25519").put("issuerId", "fixture-issuer").put("keyId", "fixture-key")
                    .put("payload", Base64.getEncoder().encodeToString(bytes)).put("signature", Base64.getEncoder().encodeToString(signature));
            ((ObjectNode) catalog.path("receipts")).put("fixture:vocabulary:" + vocabularyId,
                    Base64.getEncoder().encodeToString(json.writeValueAsBytes(envelope))); write();
        } catch (Exception error) { throw new IllegalStateException(error); }
    }
}
