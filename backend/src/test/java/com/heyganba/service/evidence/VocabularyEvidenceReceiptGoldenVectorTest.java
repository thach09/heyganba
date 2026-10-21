package com.heyganba.service.evidence;

import com.heyganba.service.evidence.EvidenceVerificationContext.*;
import org.junit.jupiter.api.Test;

import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;

import static com.heyganba.service.evidence.EvidenceVerificationOutcome.Status.*;
import static com.heyganba.service.evidence.ReceiptFixtures.*;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Fixed public-only vector: payload assembled independently with Python stdlib; signature
 * made once with a separate Java 21 program using an ephemeral test key. No private key
 * was serialized. Tests never call ReceiptFixtures.sign to obtain the expected signature.
 */
class VocabularyEvidenceReceiptGoldenVectorTest {
    private static final String PUBLIC_KEY = "MCowBQYDK2VwAyEA/UWDKt91gWzcuPmiT05lfCYeBIvEY9+VDokiVXL5oL4=";
    private static final String SIGNATURE = "/via2BxHQozMSQ9dyHyaYqaf0UJZ20gjLXNFRaKYXSVFMm0wqyHVqEG7V15SJ3sa5uEY3zIgDUob28n0I0EsAQ==";
    private static final String PAYLOAD_BASE64 =
            "eyJjb250cmFjdFZlcnNpb24iOiJWT0NBQl9FVklERU5DRV9SRUNFSVBUX1YxIiwidmVyaWZpY2F0aW9uSWQiOiJzeW50aGV0aWMt" +
            "cmVjZWlwdC0wMDEiLCJpc3N1ZXJJZCI6InN5bnRoZXRpYy12ZXJpZmllciIsImtleUlkIjoidGVzdC1vbmx5LWtleSIsInZlcmlm" +
            "aWNhdGlvbk1ldGhvZCI6IldFQl9DUk9TU19DSEVDS0VEIiwicG9saWN5VmVyc2lvbiI6IldFQl9DUk9TU19DSEVDS0VEXzIwMjZf" +
            "MTBfMjBfVjEiLCJzdWJqZWN0Ijp7ImlkZW50aXR5Ijoidm9jYWJ1bGFyeTppc29sYXRlZC1maXh0dXJlOjQyIiwiZWxpZ2liaWxp" +
            "dHlSZXZpc2lvbiI6NywiY29udGVudERpZ2VzdFZlcnNpb24iOiJWT0NBQl9DT05URU5UX1YyIiwiY29udGVudERpZ2VzdCI6IjA1" +
            "MTM2MzIzNWNhNzY4Zjk3M2Q3YjhmN2UzNDViYjU0NGFmMjQ1Y2U4YzE5MTk5YTMxYWJhZTEwYTYxYjEwNGMifSwic291cmNlcyI6" +
            "W3siZXZpZGVuY2VJZCI6ImEiLCJzb3VyY2VJZCI6ImNlZGljdC1maXh0dXJlIiwiZmFtaWx5IjoiQ0NfQ0VESUNUIiwic25hcHNo" +
            "b3RTaGEyNTYiOiIxMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTEx" +
            "IiwiZW50cnlJZCI6InN5bnRoZXRpYy1lbnRyeSIsInNlbnNlSWQiOiJzeW50aGV0aWMtc2Vuc2UiLCJleHRyYWN0aW9uU2hhMjU2" +
            "IjoiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMiJ9LHsiZXZp" +
            "ZGVuY2VJZCI6ImIiLCJzb3VyY2VJZCI6Im1vZS1maXh0dXJlIiwiZmFtaWx5IjoiVEFJV0FOX01PRSIsInNuYXBzaG90U2hhMjU2" +
            "IjoiMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMSIsImVudHJ5" +
            "SWQiOiJzeW50aGV0aWMtZW50cnkiLCJzZW5zZUlkIjoic3ludGhldGljLXNlbnNlIiwiZXh0cmFjdGlvblNoYTI1NiI6IjIyMjIy" +
            "MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIifV0sImV2aWRlbmNlQnVu" +
            "ZGxlU2hhMjU2IjoiMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMz" +
            "MyIsInByaXZhdGVFdmlkZW5jZVJlZiI6InVybjpoZXlnYW5iYTpldmlkZW5jZTpzeW50aGV0aWMtb25seSIsImZpZWxkUmVzdWx0" +
            "cyI6eyJXT1JEIjp7InJlc3VsdCI6IlZFUklGSUVEIiwiZXZpZGVuY2VJZHMiOlsiYSIsImIiXX0sIlRSQURJVElPTkFMIjp7InJl" +
            "c3VsdCI6IlZFUklGSUVEIiwiZXZpZGVuY2VJZHMiOlsiYSIsImIiXX0sIlJFQURJTkciOnsicmVzdWx0IjoiVkVSSUZJRUQiLCJl" +
            "dmlkZW5jZUlkcyI6WyJhIiwiYiJdfSwiTUVBTklORyI6eyJyZXN1bHQiOiJWRVJJRklFRCIsImV2aWRlbmNlSWRzIjpbImEiLCJi" +
            "Il19LCJQQVJUX09GX1NQRUVDSCI6eyJyZXN1bHQiOiJWRVJJRklFRCIsImV2aWRlbmNlSWRzIjpbImEiLCJiIl19LCJIQU5fVklF" +
            "VCI6eyJyZXN1bHQiOiJOT1RfUFJFU0VOVCIsImV2aWRlbmNlSWRzIjpbXX0sIkVYQU1QTEVfWkgiOnsicmVzdWx0IjoiTk9UX1BS" +
            "RVNFTlQiLCJldmlkZW5jZUlkcyI6W119LCJFWEFNUExFX1BJTllJTiI6eyJyZXN1bHQiOiJOT1RfUFJFU0VOVCIsImV2aWRlbmNl" +
            "SWRzIjpbXX0sIkVYQU1QTEVfVkkiOnsicmVzdWx0IjoiTk9UX1BSRVNFTlQiLCJldmlkZW5jZUlkcyI6W119fSwiY2FwYWJpbGl0" +
            "aWVzIjp7ImhhblZpZXQiOmZhbHNlLCJleGFtcGxlcyI6ZmFsc2V9LCJzeWxsYWJ1c0NsYWltcyI6W10sImRlY2lzaW9uVmVyc2lv" +
            "biI6IlNFTUFOVElDX0FTU0VSVElPTl9WMSIsInZlcmlmaWNhdGlvblJ1bklkIjoic3ludGhldGljLXJ1bi0wMDEiLCJpc3N1ZWRB" +
            "dEVwb2NoU2Vjb25kIjoxNzkyNTQwNzQwfQo=";

    @Test void independentlyGeneratedFixedPublicVectorAuthenticatesExactBytes() throws Exception {
        byte[] payload = Base64.getDecoder().decode(PAYLOAD_BASE64);
        assertThat(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(payload)))
                .isEqualTo("94484672a7d5674d5c6320b157818a5afd5d8c223f9b7557f27cb98cd26375a9");
        var result = new VocabularyEvidenceReceiptVerifier().verify(envelopeBytes(SIGNATURE), fixedTrust(), expected(), policy());
        assertThat(result.status()).isEqualTo(VALID);
        assertThat(result.receipt()).isPresent();
    }

    @Test void fixedVectorWithModifiedSignatureFails() throws Exception {
        byte[] signature = Base64.getDecoder().decode(SIGNATURE);
        signature[0] ^= 1;
        var result = new VocabularyEvidenceReceiptVerifier().verify(
                envelopeBytes(Base64.getEncoder().encodeToString(signature)), fixedTrust(), expected(), policy());
        assertThat(result.status()).isEqualTo(INVALID_SIGNATURE);
        assertThat(result.receipt()).isEmpty();
    }

    private static byte[] envelopeBytes(String signature) {
        return bytes(JSON.createObjectNode().put("contractVersion", VocabularyEvidenceReceipt.VERSION)
                .put("algorithm", "Ed25519").put("issuerId", ISSUER).put("keyId", KEY_ID)
                .put("payload", PAYLOAD_BASE64).put("signature", signature));
    }

    private static Trust fixedTrust() throws Exception {
        var publicKey = KeyFactory.getInstance("Ed25519").generatePublic(
                new X509EncodedKeySpec(Base64.getDecoder().decode(PUBLIC_KEY)));
        return new Trust(Map.of(new KeyIdentity(ISSUER, KEY_ID), new TrustedKey(publicKey,
                NOW.minusSeconds(3600), NOW.plusSeconds(3600), true)), Set.of(), Set.of(), NOW);
    }
}
