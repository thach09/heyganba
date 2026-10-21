package com.heyganba.service.evidence;

import java.util.List;
import java.util.Map;

/**
 * Public metadata only. A signed assertion is not proof that its semantic assessment is true.
 * All JSON properties are required, including empty lists and explicit NOT_PRESENT results.
 * No source definitions, private snapshots or signing credentials belong in this contract.
 */
public record VocabularyEvidenceReceipt(
        String contractVersion, String verificationId, String issuerId, String keyId,
        String verificationMethod, String policyVersion, Subject subject,
        List<SourceEvidence> sources, String evidenceBundleSha256, String privateEvidenceRef,
        Map<Field, FieldVerification> fieldResults, Capabilities capabilities,
        List<SyllabusClaim> syllabusClaims, String decisionVersion, String verificationRunId,
        Long issuedAtEpochSecond) {

    public static final String VERSION = "VOCAB_EVIDENCE_RECEIPT_V1";

    public VocabularyEvidenceReceipt {
        sources = List.copyOf(sources);
        fieldResults = Map.copyOf(fieldResults);
        syllabusClaims = List.copyOf(syllabusClaims);
    }

    public enum Field {
        WORD, TRADITIONAL, READING, MEANING, PART_OF_SPEECH,
        HAN_VIET, EXAMPLE_ZH, EXAMPLE_PINYIN, EXAMPLE_VI
    }

    public enum Result { VERIFIED, NOT_VERIFIED, NOT_PRESENT }

    public record Subject(String identity, Long eligibilityRevision, String contentDigestVersion,
                          String contentDigest) {}

    /** evidenceId is unique within a receipt; sourceId references trusted caller registration. */
    public record SourceEvidence(String evidenceId, String sourceId, String family,
                                 String snapshotSha256, String entryId, String senseId,
                                 String extractionSha256) {}

    public record FieldVerification(Result result, List<String> evidenceIds) {
        public FieldVerification { evidenceIds = List.copyOf(evidenceIds); }
    }

    public record Capabilities(Boolean hanViet, Boolean examples) {}

    /** Separate from the academic digest; levels 7-9 are not relabeled as HSK 1-6. */
    public record SyllabusClaim(String syllabusVersion, String officialId, Integer officialLevel,
                                List<String> evidenceIds) {
        public SyllabusClaim { evidenceIds = List.copyOf(evidenceIds); }
    }
}
