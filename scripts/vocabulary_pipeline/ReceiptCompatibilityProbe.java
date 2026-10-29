import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.service.VocabularyContentDigest;
import com.heyganba.service.evidence.VocabularyEvidenceReceiptVerifier;
import com.heyganba.service.evidence.VocabularyEvidenceReceipt.Field;
import com.heyganba.service.evidence.EvidenceVerificationContext.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.time.Instant;
import java.util.*;

/** Integration test only: ephemeral key, synthetic fixture, no catalog registration or output key. */
class ReceiptCompatibilityProbe {
    public static void main(String[] args) throws Exception {
        var json = new ObjectMapper();
        if (args.length == 2 && "--digest-batch".equals(args[0])) {
            var batch = json.readTree(Files.readAllBytes(Path.of(args[1])));
            if (!batch.isArray()) throw new AssertionError("Candidate array required");
            int checked = 0;
            for (var candidate : batch) {
                var c = candidate.path("content");
                String computed = VocabularyContentDigest.digest(VocabularyContentDigest.VERSION,
                    new VocabularyContentDigest.Content(c.path("word").asText(null), c.path("traditional").asText(null),
                        c.path("reading").asText(null), c.path("meaning").asText(null), c.path("partOfSpeech").asText(null),
                        c.path("hanViet").asText(null), c.path("exampleZh").asText(null), c.path("examplePinyin").asText(null), c.path("exampleVi").asText(null)));
                if (!computed.equals(candidate.path("expectedDigest").asText())) throw new AssertionError("Batch digest mismatch at index " + checked);
                checked++;
            }
            System.out.println(checked + "/" + checked + " actual snapshot content digests match Java V2; no signing performed");
            return;
        }
        byte[] payload = Files.readAllBytes(Path.of(args[0]));
        var value = json.readTree(payload);
        String actualDigest = VocabularyContentDigest.digest(VocabularyContentDigest.VERSION,
            new VocabularyContentDigest.Content("测试", "測試", "cè shì", "thử nghiệm", "noun", null, null, null, null));
        if (!actualDigest.equals(value.path("subject").path("contentDigest").asText()))
            throw new AssertionError("Python/Java content digest mismatch");
        KeyPair key = KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
        Signature signer = Signature.getInstance("Ed25519"); signer.initSign(key.getPrivate());
        signer.update("HEYGANBA/VOCAB-EVIDENCE-RECEIPT/V1\0".getBytes(StandardCharsets.US_ASCII)); signer.update(payload);
        var envelope = json.createObjectNode().put("contractVersion", "VOCAB_EVIDENCE_RECEIPT_V1")
            .put("algorithm", "Ed25519").put("issuerId", "test").put("keyId", "key")
            .put("payload", Base64.getEncoder().encodeToString(payload))
            .put("signature", Base64.getEncoder().encodeToString(signer.sign()));
        Instant now = Instant.now();
        var trust = new Trust(Map.of(new KeyIdentity("test", "key"), new TrustedKey(key.getPublic(), Instant.EPOCH, now.plusSeconds(60), true)), Set.of(), Set.of(), now);
        var expected = new ExpectedBinding("fixture:vocabulary:1", 0, VocabularyContentDigest.VERSION, actualDigest,
            Set.of(Field.WORD, Field.TRADITIONAL, Field.READING, Field.MEANING, Field.PART_OF_SPEECH));
        var policy = new Policy("WEB_CROSS_CHECKED", "JIAYOU_LEXICAL_V1_1", "JIAYOU_LEXICAL_V1_1",
            Map.of("a", new SourceRegistration("cedict", SourceKind.LEXICAL, Set.of(Field.values()), Set.of()),
                   "b", new SourceRegistration("wiktionary", SourceKind.LEXICAL, Set.of(Field.values()), Set.of())), false, false);
        var verifier = new VocabularyEvidenceReceiptVerifier();
        byte[] bytes = json.writeValueAsBytes(envelope);
        if (verifier.verify(bytes, trust, expected, policy).receipt().isEmpty()) throw new AssertionError("Generated V1 receipt rejected");
        var untrusted = new Trust(Map.of(), Set.of(), Set.of(), now);
        if (verifier.verify(bytes, untrusted, expected, policy).receipt().isPresent()) throw new AssertionError("Untrusted issuer accepted");
        var stale = new ExpectedBinding("fixture:vocabulary:1", 1, VocabularyContentDigest.VERSION, actualDigest, expected.presentFields());
        if (verifier.verify(bytes, trust, stale, policy).receipt().isPresent()) throw new AssertionError("Stale revision accepted");
        var wrongDigest = new ExpectedBinding("fixture:vocabulary:1", 0, VocabularyContentDigest.VERSION, "0".repeat(64), expected.presentFields());
        if (verifier.verify(bytes, trust, wrongDigest, policy).receipt().isPresent()) throw new AssertionError("Stale digest accepted");
        envelope.put("signature", Base64.getEncoder().encodeToString(new byte[64]));
        if (verifier.verify(json.writeValueAsBytes(envelope), trust, expected, policy).receipt().isPresent()) throw new AssertionError("Tampering accepted");
        System.out.println("5/5 receipt compatibility checks passed; no real receipt, key or trust catalog issued");
    }
}
