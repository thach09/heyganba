package com.heyganba.service;

import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.heyganba.common.exception.BadRequestException;
import com.heyganba.common.exception.ResourceNotFoundException;
import com.heyganba.common.security.ContentAccess;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.model.enums.ReviewStatus;
import com.heyganba.repository.AuditLogRepository;
import com.heyganba.service.evidence.EvidenceVerificationContext.*;
import com.heyganba.service.evidence.VocabularyEvidenceReceipt;
import com.heyganba.service.evidence.VocabularyEvidenceReceipt.*;
import com.heyganba.service.evidence.VocabularyEvidenceReceiptVerifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.*;

/** Server-owned, offline publication authority. No URL fetch, admin registration or signing.
 * Missing/malformed catalog, revoked evidence or missing reuse rights always deny publication.
 * Catalog and content-addressed objects must be mounted read-only outside release resources.
 * A request observes one catalog snapshot; the next request observes revocations immediately.
 */
@Service
public final class VocabularyPublicationAuthority {
    private static final ObjectMapper JSON = JsonMapper.builder()
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION).build();
    private final AuditLogRepository audit;
    private final String catalogPath;
    private final VocabularyEvidenceReceiptVerifier verifier = new VocabularyEvidenceReceiptVerifier();

    public VocabularyPublicationAuthority(AuditLogRepository audit,
            @Value("${app.vocabulary.publication.catalog:}") String catalogPath) {
        this.audit = audit;
        this.catalogPath = catalogPath;
    }

    private record Catalog(String instance, Trust trust, Policy policy, JsonNode rights,
                           JsonNode envelopes, Path objects, Set<String> checkedObjects) {}
    public record Proof(String verificationId, String contentDigest) {}

    public boolean canRead(Vocabulary vocabulary) {
        return vocabulary != null && (ContentAccess.canSeePendingReview() || (vocabulary.getReviewStatus() == ReviewStatus.APPROVED
                && proof(vocabulary).isPresent()));
    }

    public void requireVisible(Vocabulary vocabulary) {
        if (!canRead(vocabulary)) throw new ResourceNotFoundException("Vocabulary", "id", vocabulary == null ? null : vocabulary.getId());
    }

    public Proof requireEligible(Vocabulary vocabulary) {
        return proof(vocabulary).orElseThrow(() -> new BadRequestException(
                "Chưa có bằng chứng tin cậy và quyền sử dụng phù hợp để xuất bản mục từ."));
    }

    public Optional<Proof> proof(Vocabulary vocabulary) {
        try {
            if (vocabulary == null || vocabulary.getId() == null || vocabulary.getId() <= 0) return Optional.empty();
            Catalog catalog = catalog();
            if (catalog == null) return Optional.empty();
            String identity = catalog.instance() + ":vocabulary:" + vocabulary.getId();
            String envelope = catalog.envelopes().path(identity).textValue();
            if (envelope == null) return Optional.empty();
            var content = new VocabularyContentDigest.Content(vocabulary.getWord(), vocabulary.getTraditional(),
                    vocabulary.getReading(), vocabulary.getMeaning(), vocabulary.getPartOfSpeech(),
                    vocabulary.getSinoVietnamese(), vocabulary.getExampleSentence(),
                    vocabulary.getExampleReading(), vocabulary.getExampleMeaning());
            String digest = VocabularyContentDigest.digest(VocabularyContentDigest.VERSION, content);
            Set<Field> present = EnumSet.noneOf(Field.class);
            String[] fields = {content.word(), content.traditional(), content.reading(), content.meaning(),
                    content.partOfSpeech(), content.hanViet(), content.exampleZh(), content.examplePinyin(), content.exampleVi()};
            for (Field field : Field.values()) if (fields[field.ordinal()] != null && !fields[field.ordinal()].isBlank()) present.add(field);
            long revision = audit.vocabularyEligibilityRevision(vocabulary.getId());
            var binding = new ExpectedBinding(identity, revision, VocabularyContentDigest.VERSION, digest, present);
            var result = verifier.verify(Base64.getDecoder().decode(envelope), catalog.trust(), binding, catalog.policy());
            if (result.receipt().isEmpty()) return Optional.empty();
            var receipt = result.receipt().get();
            // Until capability-aware projections are released, never expose retained optional drafts.
            if ((!receipt.capabilities().hanViet() && present.contains(Field.HAN_VIET))
                    || (!receipt.capabilities().examples() && present.stream().anyMatch(f -> f.name().startsWith("EXAMPLE_")))) return Optional.empty();
            if (!objectExists(catalog, receipt.evidenceBundleSha256())) return Optional.empty();
            for (SourceEvidence source : receipt.sources()) {
                JsonNode rights = catalog.rights().path(source.sourceId());
                if (!"CLEARED".equals(text(rights, "status")) || text(rights, "decisionRef").isBlank()
                        || text(rights, "licenseId").isBlank()
                        || !Instant.parse(text(rights, "notAfter")).isAfter(catalog.trust().now())) return Optional.empty();
                Set<String> scopes = strings(rights.path("scopes"));
                var registration = catalog.policy().sources().get(source.sourceId());
                if (registration.kind() == SourceKind.SYLLABUS) {
                    if (!scopes.contains("SYLLABUS_IDS")) return Optional.empty();
                } else {
                    if (!scopes.contains("CORE_FIELDS")) return Optional.empty();
                    boolean optional = receipt.fieldResults().entrySet().stream()
                            .anyMatch(e -> (e.getKey() == Field.HAN_VIET || e.getKey().name().startsWith("EXAMPLE_"))
                                    && e.getValue().result() == Result.VERIFIED && e.getValue().evidenceIds().contains(source.evidenceId()));
                    if (optional && !scopes.contains("OPTIONAL_FIELDS")) return Optional.empty();
                }
                if (!objectExists(catalog, source.snapshotSha256()) || !objectExists(catalog, source.extractionSha256())) return Optional.empty();
            }
            return Optional.of(new Proof(receipt.issuerId() + ":" + receipt.verificationId(), digest));
        } catch (Exception ignored) {
            // Do not expose parser paths, private evidence, trust configuration or crypto errors.
            return Optional.empty();
        }
    }

    private Catalog catalog() {
        if (catalogPath == null || catalogPath.isBlank()) return null;
        RequestAttributes request = RequestContextHolder.getRequestAttributes();
        String key = getClass().getName() + ":" + catalogPath;
        if (request != null) {
            Object cached = request.getAttribute(key, RequestAttributes.SCOPE_REQUEST);
            if (cached instanceof Catalog snapshot) return snapshot;
            if (Boolean.FALSE.equals(cached)) return null;
        }
        Catalog loaded = loadCatalog();
        if (request != null) request.setAttribute(key, loaded == null ? Boolean.FALSE : loaded, RequestAttributes.SCOPE_REQUEST);
        return loaded;
    }

    private Catalog loadCatalog() {
        try {
            Path file = Path.of(catalogPath).toRealPath();
            if (!Files.isRegularFile(file) || Files.size(file) > 8_388_608) return null;
            JsonNode root = JSON.readTree(Files.readAllBytes(file));
            if (!"VOCAB_PUBLICATION_CATALOG_V1".equals(text(root, "version"))) return null;
            String instance = text(root, "instanceId");
            if (!instance.matches("[A-Za-z0-9][A-Za-z0-9._-]{0,63}")) return null;
            Map<KeyIdentity, TrustedKey> keys = new HashMap<>();
            for (JsonNode key : array(root, "keys")) {
                var identity = new KeyIdentity(text(key, "issuerId"), text(key, "keyId"));
                var publicKey = KeyFactory.getInstance("Ed25519").generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(text(key, "publicKeyX509"))));
                if (!key.path("active").isBoolean()) return null;
                var value = new TrustedKey(publicKey, Instant.parse(text(key, "notBefore")), Instant.parse(text(key, "notAfter")), key.path("active").booleanValue());
                if (keys.put(identity, value) != null) return null;
            }
            Set<ReceiptIdentity> revoked = new HashSet<>();
            for (JsonNode item : array(root, "revokedReceipts")) revoked.add(new ReceiptIdentity(text(item, "issuerId"), text(item, "verificationId")));
            JsonNode policy = root.path("policy");
            Map<String, SourceRegistration> sources = new HashMap<>();
            var iterator = policy.path("sources").fields();
            while (iterator.hasNext()) {
                var entry = iterator.next(); var value = entry.getValue();
                Set<Field> fields = EnumSet.noneOf(Field.class);
                for (String field : strings(value.path("allowedFields"))) fields.add(Field.valueOf(field));
                sources.put(entry.getKey(), new SourceRegistration(text(value, "family"), SourceKind.valueOf(text(value, "kind")), fields, strings(value.path("syllabusVersions"))));
            }
            if (!policy.path("allowHanViet").isBoolean() || !policy.path("allowExamples").isBoolean()
                    || !root.path("rights").isObject() || !root.path("receipts").isObject()) return null;
            return new Catalog(instance, new Trust(keys, strings(root.path("inactiveIssuers")), revoked, Instant.now()),
                    new Policy(text(policy, "verificationMethod"), text(policy, "policyVersion"), text(policy, "decisionVersion"), sources,
                            policy.path("allowHanViet").booleanValue(), policy.path("allowExamples").booleanValue()),
                    root.path("rights"), root.path("receipts"), file.getParent().resolve("objects"), java.util.concurrent.ConcurrentHashMap.newKeySet());
        } catch (Exception ignored) { return null; }
    }

    private static boolean objectExists(Catalog catalog, String digest) throws Exception {
        if (!digest.matches("[0-9a-f]{64}")) return false;
        if (catalog.checkedObjects().contains(digest)) return true;
        if (Files.isSymbolicLink(catalog.objects()) || !Files.isDirectory(catalog.objects())) return false;
        Path object = catalog.objects().resolve(digest);
        if (!Files.isRegularFile(object) || Files.isSymbolicLink(object) || Files.size(object) > 33_554_432) return false;
        String actual = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(object)));
        if (!actual.equals(digest)) return false;
        catalog.checkedObjects().add(digest);
        return true;
    }
    private static String text(JsonNode node, String key) {
        JsonNode value = node.get(key);
        if (value == null || !value.isTextual() || value.textValue().isBlank()) throw new IllegalArgumentException("Incomplete publication catalog");
        return value.textValue();
    }
    private static JsonNode array(JsonNode node, String key) {
        if (!node.path(key).isArray()) throw new IllegalArgumentException("Incomplete publication catalog");
        return node.path(key);
    }
    private static Set<String> strings(JsonNode node) {
        if (!node.isArray()) throw new IllegalArgumentException("Expected metadata array");
        Set<String> values = new HashSet<>();
        for (JsonNode value : node) {
            if (!value.isTextual() || value.textValue().isBlank() || !values.add(value.textValue())) throw new IllegalArgumentException("Invalid metadata set");
        }
        return Set.copyOf(values);
    }
}
