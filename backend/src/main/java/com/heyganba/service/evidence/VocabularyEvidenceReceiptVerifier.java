package com.heyganba.service.evidence;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.StreamReadConstraints;
import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.cfg.CoercionAction;
import com.fasterxml.jackson.databind.cfg.CoercionInputShape;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.type.LogicalType;
import com.heyganba.service.VocabularyContentDigest;
import com.heyganba.service.evidence.EvidenceVerificationContext.*;
import com.heyganba.service.evidence.VocabularyEvidenceReceipt.*;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.Signature;
import java.time.Instant;
import java.util.Base64;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import static com.heyganba.service.evidence.EvidenceVerificationOutcome.Status.*;

/**
 * Offline receipt authentication and structural validation only. No Spring bean, database,
 * URL fetch, signing operation or approval side effect. Uses its own strict Jackson mapper.
 *
 * <p>Envelope has exactly contractVersion, algorithm, issuerId, keyId, payload, signature.
 * Base64 uses canonical padded RFC 4648 basic encoding. Signature is Ed25519 over ASCII
 * {@code HEYGANBA/VOCAB-EVIDENCE-RECEIPT/V1}, a zero byte, then the exact decoded payload
 * bytes. No JSON reserialization or Unicode normalization occurs during authentication.
 * Payload must be UTF-8 JSON without a BOM; all unknown properties fail closed.
 *
 * <p>Caller-provided trust, policy, expected identity/revision/digest and presence set must
 * come from trusted application state, not the envelope or an admin's self-declarations.
 * This checks declared evidence relationships, not the referenced snapshot bytes/semantics.
 */
public final class VocabularyEvidenceReceiptVerifier {
    public static final int MAX_RECEIPT_BYTES = 49_152;
    public static final int MAX_PAYLOAD_BYTES = 32_768;
    private static final byte[] DOMAIN = "HEYGANBA/VOCAB-EVIDENCE-RECEIPT/V1\0".getBytes(StandardCharsets.US_ASCII);
    private static final ObjectMapper JSON = mapper();
    private static final Set<Field> EXAMPLES = Set.of(Field.EXAMPLE_ZH, Field.EXAMPLE_PINYIN, Field.EXAMPLE_VI);

    private record Envelope(String contractVersion, String algorithm, String issuerId, String keyId,
                            String payload, String signature) {}

    public EvidenceVerificationOutcome verify(byte[] serializedReceipt, Trust trust, ExpectedBinding expected,
                                               Policy policy) {
        Objects.requireNonNull(trust);
        Objects.requireNonNull(expected);
        Objects.requireNonNull(policy);
        if (serializedReceipt == null || serializedReceipt.length == 0 || serializedReceipt.length > MAX_RECEIPT_BYTES) {
            return EvidenceVerificationOutcome.failure(INVALID_RECEIPT);
        }
        try {
            Envelope envelope = parse(serializedReceipt, Envelope.class);
            if (!VocabularyEvidenceReceipt.VERSION.equals(envelope.contractVersion()) || !"Ed25519".equals(envelope.algorithm())) {
                return EvidenceVerificationOutcome.failure(UNSUPPORTED_VERSION);
            }
            EvidenceVerificationContext.token(envelope.issuerId());
            EvidenceVerificationContext.token(envelope.keyId());
            byte[] payload = base64(envelope.payload(), MAX_PAYLOAD_BYTES);
            byte[] signature = base64(envelope.signature(), 64);
            require(signature.length == 64);
            TrustedKey key = trust.keys().get(new KeyIdentity(envelope.issuerId(), envelope.keyId()));
            if (key == null) return EvidenceVerificationOutcome.failure(UNTRUSTED_ISSUER);
            if (!authentic(payload, signature, key)) return EvidenceVerificationOutcome.failure(INVALID_SIGNATURE);

            // Claims are not parsed/trusted until the exact payload has been authenticated.
            VocabularyEvidenceReceipt receipt = parse(payload, VocabularyEvidenceReceipt.class);
            if (!VocabularyEvidenceReceipt.VERSION.equals(receipt.contractVersion())
                    || !VocabularyContentDigest.VERSION.equals(receipt.subject().contentDigestVersion())) {
                return EvidenceVerificationOutcome.failure(UNSUPPORTED_VERSION);
            }
            require(envelope.issuerId().equals(receipt.issuerId()) && envelope.keyId().equals(receipt.keyId()));
            validateShape(receipt);
            Instant issuedAt = Instant.ofEpochSecond(receipt.issuedAtEpochSecond());
            require(!issuedAt.isAfter(trust.now()));
            if (!key.active() || trust.inactiveIssuers().contains(receipt.issuerId())
                    || trust.now().isBefore(key.notBefore()) || !trust.now().isBefore(key.notAfter())
                    || issuedAt.isBefore(key.notBefore()) || !issuedAt.isBefore(key.notAfter())
                    || trust.revokedReceipts().contains(new ReceiptIdentity(receipt.issuerId(), receipt.verificationId()))) {
                return EvidenceVerificationOutcome.failure(REVOKED_OR_INACTIVE);
            }
            if (!expected.subjectIdentity().equals(receipt.subject().identity())) return EvidenceVerificationOutcome.failure(SUBJECT_MISMATCH);
            if (expected.eligibilityRevision() != receipt.subject().eligibilityRevision()) return EvidenceVerificationOutcome.failure(REVISION_MISMATCH);
            if (!expected.contentDigest().equals(receipt.subject().contentDigest())) return EvidenceVerificationOutcome.failure(CONTENT_DIGEST_MISMATCH);
            if (!policy.verificationMethod().equals(receipt.verificationMethod()) || !policy.policyVersion().equals(receipt.policyVersion())
                    || !policy.decisionVersion().equals(receipt.decisionVersion())) return EvidenceVerificationOutcome.failure(POLICY_MISMATCH);
            validateFieldBindings(receipt, expected);
            if (!sourcePolicyMatches(receipt, policy)) return EvidenceVerificationOutcome.failure(POLICY_MISMATCH);
            return EvidenceVerificationOutcome.valid(receipt);
        } catch (IOException | IllegalArgumentException | java.time.DateTimeException error) {
            return EvidenceVerificationOutcome.failure(INVALID_RECEIPT);
        } catch (GeneralSecurityException error) {
            return EvidenceVerificationOutcome.failure(INVALID_SIGNATURE);
        }
    }

    private static void validateShape(VocabularyEvidenceReceipt r) {
        for (String id : List.of(r.verificationId(), r.issuerId(), r.keyId(), r.verificationMethod(), r.policyVersion(),
                r.subject().identity(), r.decisionVersion(), r.verificationRunId())) EvidenceVerificationContext.token(id);
        require(r.subject().eligibilityRevision() >= 0 && r.issuedAtEpochSecond() >= 0);
        EvidenceVerificationContext.hash(r.subject().contentDigest());
        EvidenceVerificationContext.hash(r.evidenceBundleSha256());
        require(r.privateEvidenceRef().matches("urn:heyganba:evidence:[A-Za-z0-9._:-]{1,160}"));
        require(!r.sources().isEmpty() && r.sources().size() <= 8 && r.syllabusClaims().size() <= 32);
        require(r.fieldResults().keySet().equals(EnumSet.allOf(Field.class)));
        Set<String> evidenceIds = new HashSet<>();
        for (SourceEvidence s : r.sources()) {
            for (String id : List.of(s.evidenceId(), s.sourceId(), s.family(), s.entryId(), s.senseId())) EvidenceVerificationContext.token(id);
            require(evidenceIds.add(s.evidenceId()));
            EvidenceVerificationContext.hash(s.snapshotSha256());
            EvidenceVerificationContext.hash(s.extractionSha256());
        }
        for (FieldVerification field : r.fieldResults().values()) {
            references(field.evidenceIds(), evidenceIds);
            require(field.result() == Result.VERIFIED ? !field.evidenceIds().isEmpty() : field.evidenceIds().isEmpty());
        }
        Set<String> classifications = new HashSet<>();
        for (SyllabusClaim claim : r.syllabusClaims()) {
            EvidenceVerificationContext.token(claim.syllabusVersion());
            EvidenceVerificationContext.token(claim.officialId());
            require(claim.officialLevel() >= 1 && claim.officialLevel() <= 9 && !claim.evidenceIds().isEmpty());
            references(claim.evidenceIds(), evidenceIds);
            require(classifications.add(claim.syllabusVersion() + "/" + claim.officialId()));
        }
    }

    private static boolean sourcePolicyMatches(VocabularyEvidenceReceipt r, Policy policy) {
        Map<String, SourceRegistration> registrations = new HashMap<>();
        for (SourceEvidence s : r.sources()) {
            SourceRegistration registration = policy.sources().get(s.sourceId());
            if (registration == null || !registration.family().equals(s.family())) return false;
            registrations.put(s.evidenceId(), registration);
        }
        for (Map.Entry<Field, FieldVerification> field : r.fieldResults().entrySet()) {
            Set<String> families = new HashSet<>();
            for (String evidenceId : field.getValue().evidenceIds()) {
                SourceRegistration source = registrations.get(evidenceId);
                if (source.kind() != SourceKind.LEXICAL || !source.allowedFields().contains(field.getKey())) return false;
                families.add(source.family());
            }
            if (EvidenceVerificationContext.CORE.contains(field.getKey()) && families.size() < 2) return false;
        }
        for (SyllabusClaim claim : r.syllabusClaims()) {
            for (String id : claim.evidenceIds()) {
                SourceRegistration source = registrations.get(id);
                if (source.kind() != SourceKind.SYLLABUS || !source.syllabusVersions().contains(claim.syllabusVersion())) return false;
            }
        }
        return (!r.capabilities().hanViet() || policy.allowHanViet()) && (!r.capabilities().examples() || policy.allowExamples());
    }

    private static void validateFieldBindings(VocabularyEvidenceReceipt r, ExpectedBinding expected) {
        for (Field field : Field.values()) {
            Result result = r.fieldResults().get(field).result();
            if (!expected.presentFields().contains(field)) require(result == Result.NOT_PRESENT);
            else if (EvidenceVerificationContext.CORE.contains(field) || field == Field.TRADITIONAL) require(result == Result.VERIFIED);
            else require(result != Result.NOT_PRESENT);
        }
        if (r.capabilities().hanViet()) require(r.fieldResults().get(Field.HAN_VIET).result() == Result.VERIFIED);
        if (r.capabilities().examples()) {
            for (Field field : EXAMPLES) require(r.fieldResults().get(field).result() == Result.VERIFIED);
        }
    }

    private static void references(List<String> references, Set<String> known) {
        require(references.size() <= 8 && new HashSet<>(references).size() == references.size() && known.containsAll(references));
    }

    private static boolean authentic(byte[] payload, byte[] signature, TrustedKey key) throws GeneralSecurityException {
        Signature verifier = Signature.getInstance("Ed25519");
        verifier.initVerify(key.publicKey());
        verifier.update(DOMAIN);
        verifier.update(payload);
        return verifier.verify(signature);
    }

    private static byte[] base64(String encoded, int limit) {
        require(encoded.length() <= 4 * ((limit + 2) / 3));
        byte[] decoded = Base64.getDecoder().decode(encoded);
        require(decoded.length <= limit && Base64.getEncoder().encodeToString(decoded).equals(encoded));
        return decoded;
    }

    private static <T> T parse(byte[] bytes, Class<T> type) throws IOException {
        String text = utf8(bytes);
        require(!text.startsWith("\uFEFF"));
        JsonNode node = JSON.readTree(text);
        require(node != null && node.isObject());
        wellFormed(node);
        return JSON.treeToValue(node, type);
    }

    private static String utf8(byte[] bytes) throws CharacterCodingException {
        return StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
    }

    private static void wellFormed(JsonNode node) {
        if (node.isTextual()) unicode(node.textValue());
        if (node.isObject()) node.fieldNames().forEachRemaining(VocabularyEvidenceReceiptVerifier::unicode);
        if (node.isContainerNode()) node.forEach(VocabularyEvidenceReceiptVerifier::wellFormed);
    }

    private static void unicode(String value) {
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (Character.isHighSurrogate(c)) {
                require(i + 1 < value.length() && Character.isLowSurrogate(value.charAt(i + 1)));
                i++;
            } else require(!Character.isLowSurrogate(c));
        }
    }

    private static ObjectMapper mapper() {
        JsonFactory factory = JsonFactory.builder().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
                .streamReadConstraints(StreamReadConstraints.builder().maxNestingDepth(12).maxStringLength(MAX_RECEIPT_BYTES)
                        .maxNameLength(80).maxNumberLength(20).maxDocumentLength(MAX_RECEIPT_BYTES).maxTokenCount(4096).build()).build();
        ObjectMapper mapper = JsonMapper.builder(factory)
                .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, DeserializationFeature.FAIL_ON_TRAILING_TOKENS,
                        DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES, DeserializationFeature.FAIL_ON_NULL_CREATOR_PROPERTIES,
                        DeserializationFeature.FAIL_ON_NUMBERS_FOR_ENUMS)
                .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS).disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT).build();
        for (CoercionInputShape shape : List.of(CoercionInputShape.Integer, CoercionInputShape.Float, CoercionInputShape.Boolean)) {
            mapper.coercionConfigFor(LogicalType.Textual).setCoercion(shape, CoercionAction.Fail);
        }
        return mapper;
    }

    private static void require(boolean condition) {
        if (!condition) throw new IllegalArgumentException("Invalid receipt");
    }
}
