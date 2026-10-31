package com.heyganba.service.evidence;

import java.util.Optional;

/** VALID means authenticated, structurally consistent and context-bound; NOT semantic approval. */
public final class EvidenceVerificationOutcome {
    public enum Status {
        VALID, INVALID_SIGNATURE, UNTRUSTED_ISSUER, UNSUPPORTED_VERSION, INVALID_RECEIPT,
        SUBJECT_MISMATCH, REVISION_MISMATCH, CONTENT_DIGEST_MISMATCH, POLICY_MISMATCH,
        REVOKED_OR_INACTIVE
    }

    private final Status status;
    private final VocabularyEvidenceReceipt receipt;

    private EvidenceVerificationOutcome(Status status, VocabularyEvidenceReceipt receipt) {
        this.status = status;
        this.receipt = receipt;
    }

    static EvidenceVerificationOutcome valid(VocabularyEvidenceReceipt receipt) {
        return new EvidenceVerificationOutcome(Status.VALID, receipt);
    }

    static EvidenceVerificationOutcome failure(Status status) {
        return new EvidenceVerificationOutcome(status, null);
    }

    public Status status() { return status; }

    /** Failure outcomes expose no untrusted claims, raw evidence or parser/crypto diagnostics. */
    public Optional<VocabularyEvidenceReceipt> receipt() { return Optional.ofNullable(receipt); }
}
