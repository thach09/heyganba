package com.heyganba.service.evidence;

import com.heyganba.service.VocabularyContentDigest;
import com.heyganba.service.evidence.VocabularyEvidenceReceipt.Field;

import java.security.PublicKey;
import java.security.interfaces.EdECPublicKey;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Explicit trusted caller configuration, never deserialized from a receipt or admin proposal.
 * Vocabulary currently has a database ID but no eligibility revision. The caller must supply
 * a dataset-qualified identity and a real revision authority; no DB lookup/default is provided.
 * Revocation and time are immutable snapshots for one verification call, with no network I/O.
 */
public final class EvidenceVerificationContext {
    private EvidenceVerificationContext() {}

    public static final Set<Field> CORE = Set.of(Field.WORD, Field.READING, Field.MEANING, Field.PART_OF_SPEECH);

    public record KeyIdentity(String issuerId, String keyId) {
        public KeyIdentity { token(issuerId); token(keyId); }
    }

    public record ReceiptIdentity(String issuerId, String verificationId) {
        public ReceiptIdentity { token(issuerId); token(verificationId); }
    }

    public record TrustedKey(PublicKey publicKey, Instant notBefore, Instant notAfter, boolean active) {
        public TrustedKey {
            if (!(publicKey instanceof EdECPublicKey edKey) || !"Ed25519".equals(edKey.getParams().getName())) {
                throw new IllegalArgumentException("An Ed25519 public key is required");
            }
            Objects.requireNonNull(notBefore);
            Objects.requireNonNull(notAfter);
            if (!notBefore.isBefore(notAfter)) throw new IllegalArgumentException("Invalid trust interval");
        }
    }

    public record Trust(Map<KeyIdentity, TrustedKey> keys, Set<String> inactiveIssuers,
                        Set<ReceiptIdentity> revokedReceipts, Instant now) {
        public Trust {
            keys = Map.copyOf(keys);
            inactiveIssuers = Set.copyOf(inactiveIssuers);
            revokedReceipts = Set.copyOf(revokedReceipts);
            Objects.requireNonNull(now);
        }
    }

    /** presentFields describes actual nonblank academic values, not publication capabilities. */
    public record ExpectedBinding(String subjectIdentity, long eligibilityRevision,
                                  String contentDigestVersion, String contentDigest,
                                  Set<Field> presentFields) {
        public ExpectedBinding {
            token(subjectIdentity);
            if (eligibilityRevision < 0) throw new IllegalArgumentException("A revision is required");
            if (!VocabularyContentDigest.VERSION.equals(contentDigestVersion)) {
                throw new IllegalArgumentException("Expected digest must use VOCAB_CONTENT_V2");
            }
            hash(contentDigest);
            presentFields = Set.copyOf(presentFields);
            if (!presentFields.containsAll(CORE)) throw new IllegalArgumentException("Core fields are required");
        }
    }

    public enum SourceKind { LEXICAL, SYLLABUS }

    /** A minimal registration snapshot; catalog maintenance/semantic verification is out of scope. */
    public record SourceRegistration(String family, SourceKind kind, Set<Field> allowedFields,
                                     Set<String> syllabusVersions) {
        public SourceRegistration {
            token(family);
            Objects.requireNonNull(kind);
            allowedFields = Set.copyOf(allowedFields);
            syllabusVersions = Set.copyOf(syllabusVersions);
            if (kind == SourceKind.SYLLABUS && (!allowedFields.isEmpty() || syllabusVersions.isEmpty())) {
                throw new IllegalArgumentException("Syllabus sources cannot establish lexical claims");
            }
            if (kind == SourceKind.LEXICAL && (allowedFields.isEmpty() || !syllabusVersions.isEmpty())) {
                throw new IllegalArgumentException("Invalid lexical source registration");
            }
        }
    }

    public record Policy(String verificationMethod, String policyVersion, String decisionVersion,
                         Map<String, SourceRegistration> sources, boolean allowHanViet,
                         boolean allowExamples) {
        public Policy {
            if (!"WEB_CROSS_CHECKED".equals(verificationMethod)) throw new IllegalArgumentException("Unsupported method");
            token(policyVersion);
            token(decisionVersion);
            sources = Map.copyOf(sources);
            sources.keySet().forEach(EvidenceVerificationContext::token);
        }
    }

    static void token(String value) {
        if (value == null || !value.matches("[A-Za-z0-9][A-Za-z0-9._:-]{0,159}")) {
            throw new IllegalArgumentException("Invalid metadata identifier");
        }
    }

    static void hash(String value) {
        if (value == null || !value.matches("[0-9a-f]{64}")) throw new IllegalArgumentException("Invalid SHA-256");
    }
}
