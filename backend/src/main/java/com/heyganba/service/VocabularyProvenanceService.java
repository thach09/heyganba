package com.heyganba.service;

import com.heyganba.common.exception.BadRequestException;
import com.heyganba.model.entity.User;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.model.enums.ReviewStatus;
import com.heyganba.repository.VocabularyRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.net.URI;
import java.text.Normalizer;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class VocabularyProvenanceService {
    private final VocabularyRepository vocabulary;
    private final VocabularyPublicationAuthority publication;
    private final AuditLogService audit;
    private final ObjectMapper json;
    public static final String POLICY = "WEB_CROSS_CHECKED_2026_10_20_V1";
    public record Source(String provider, String dataFamily, String reference, String entryId,
            String subjectWord, String subjectReading, Instant accessedAt, String accessStatus,
            Set<String> supports, String observation, String snapshotSha256) {}

    public record Evidence(@NotBlank @Size(max=100) String curriculumVersion,
            @NotBlank @Size(max=100) String sourceVersion,
            @NotBlank @Size(max=2000) String lexicalSourceRef,
            @NotBlank @Size(max=2000) String meaningSourceRef,
            @Size(max=2000) String hanVietSourceRef, @Size(max=2000) String exampleSourceRef,
            @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(6) Integer hskLevel,
            String verificationMethod, String verificationPolicyVersion, List<Source> sources,
            boolean publishHanViet, boolean publishExamples) {}
    public record Snapshot(Evidence evidence, Instant importedAt, Instant recordedAt, Instant reviewedAt,
            Long reviewedBy, boolean completeForCurrentContent) {}

    private Vocabulary find(Long id) {
        return vocabulary.findById(id).orElseThrow(() -> new BadRequestException("Không tìm thấy từ vựng."));
    }
    @Transactional(readOnly=true)
    public Snapshot get(Long id) { return snapshot(find(id)); }

    @Transactional
    public Snapshot save(User admin, Long id, Evidence e) {
        Vocabulary v = vocabulary.findByIdForUpdate(id).orElseThrow(() -> new BadRequestException("Vocabulary not found"));
        v.setCurriculumVersion(clean(e.curriculumVersion())); v.setSourceVersion(clean(e.sourceVersion()));
        v.setLexicalSourceRef(clean(e.lexicalSourceRef())); v.setMeaningSourceRef(clean(e.meaningSourceRef()));
        v.setHanVietSourceRef(clean(e.hanVietSourceRef())); v.setExampleSourceRef(clean(e.exampleSourceRef()));
        v.setHskLevel(e.hskLevel()); // Explicit reviewer assignment; null preserves an unclassified curriculum item.
        v.setVerificationMethod(e.verificationMethod()); v.setVerificationPolicyVersion(e.verificationPolicyVersion());
        v.setHanVietVerified(e.publishHanViet()); v.setExampleVerified(e.publishExamples());
        try { v.setVerificationEvidenceJson(json.writeValueAsString(e)); }
        catch (com.fasterxml.jackson.core.JsonProcessingException error) { throw new IllegalArgumentException("Invalid evidence", error); }
        v.setProvenanceContentSha256(digest(v)); v.setProvenanceRecordedAt(Instant.now());
        v.setReviewedAt(null); v.setReviewedBy(null);
        v.setReviewStatus(ReviewStatus.PENDING_REVIEW); v.setNeedsHumanCheck(true);
        vocabulary.save(v);
        audit.logAction(admin,"vocabulary",id,"PROVENANCE_UPDATE",null,"PENDING_REVIEW");
        return snapshot(v);
    }
    public void requireComplete(Vocabulary v) {
        if (!complete(v)) throw new BadRequestException("Cần hai nguồn từ điển độc lập đã truy cập, đúng nội dung và phiên bản chính sách. Hán Việt hoặc ví dụ thiếu nguồn có thể giữ riêng chưa xuất bản.");
    }
    public boolean complete(Vocabulary v) {
        return publication.proof(v).isPresent();
    }
    public void recordReview(User admin, Vocabulary v) {
        requireComplete(v); v.setReviewedAt(Instant.now()); v.setReviewedBy(admin.getId());
    }
    private boolean sourcePolicySatisfied(Vocabulary v) {
        try {
            Evidence e = json.readValue(v.getVerificationEvidenceJson(), Evidence.class);
            if (e.sources() == null || e.sources().size() > 8 || e.publishHanViet() != Boolean.TRUE.equals(v.getHanVietVerified())
                    || e.publishExamples() != Boolean.TRUE.equals(v.getExampleVerified())) return false;
            Set<String> independent = new HashSet<>();
            // A named internal course grouping is not an official HSK classification.
            // Its per-entry CTI classification is recorded separately in the source evidence.
            boolean level = v.getHskLevel() == null || v.getCurriculumVersion().startsWith("INTERNAL_"), hanViet = !e.publishHanViet(), examples = !e.publishExamples();
            for (Source s : e.sources()) {
                if (!validSource(s, v)) continue;
                String family = canonicalFamily(s);
                if (s.supports().containsAll(Set.of("WORD", "READING", "MEANING", "PART_OF_SPEECH"))
                        && !family.equals("CTI_HSK_SYLLABUS")) independent.add(family);
                level |= family.equals("CTI_HSK_SYLLABUS") && s.supports().contains("HSK_LEVEL");
                hanViet |= s.supports().contains("HAN_VIET"); examples |= s.supports().contains("EXAMPLES");
            }
            return independent.size() >= 2 && level && hanViet && examples;
        } catch (RuntimeException | com.fasterxml.jackson.core.JsonProcessingException ignored) { return false; }
    }
    private boolean validSource(Source s, Vocabulary v) {
        if (s == null || !present(s.provider()) || !present(s.entryId()) || !present(s.observation())
                || s.supports() == null || !"RETRIEVED".equals(s.accessStatus()) || s.accessedAt() == null
                || s.accessedAt().isAfter(Instant.now().plusSeconds(300))
                || s.accessedAt().isBefore(Instant.now().minusSeconds(366L*86400))
                || !(v.getWord().equals(s.subjectWord()) || (v.getTraditional() != null && v.getTraditional().equals(s.subjectWord())))
                || !normalizedReading(v.getReading()).equals(normalizedReading(s.subjectReading()))) return false;
        return canonicalFamily(s) != null;
    }
    private static boolean domain(String host, String domain) { return host.equals(domain) || host.endsWith("." + domain); }
    private static String canonicalFamily(Source s) {
        if (!present(s.reference()) || !present(s.dataFamily())) return null;
        try {
            URI uri = URI.create(s.reference()); String host = uri.getHost();
            if (!"https".equals(uri.getScheme()) || host == null || uri.getUserInfo() != null) return null;
            host = host.toLowerCase(java.util.Locale.ROOT);
            // Data ancestry, not hostname count: two CC-CEDICT mirrors remain one source.
            if (domain(host,"mdbg.net") || domain(host,"cc-cedict.org") || domain(host,"yellowbridge.com") || domain(host,"purpleculture.net")) return "CC_CEDICT";
            if (domain(host,"moe.gov.tw") || host.equals("www.moedict.tw")) return "TAIWAN_MOE";
            if (host.equals("dictionary.cambridge.org")) return "CAMBRIDGE";
            if (host.equals("www.collinsdictionary.com") || host.equals("collinsdictionary.com"))
                return s.dataFamily().equals("COLLINS") && uri.getPath().startsWith("/dictionary/chinese-english/") ? "COLLINS" : null;
            if (domain(host,"wiktionary.org")) return s.dataFamily().equals("CC_CEDICT") ? "CC_CEDICT" : "WIKTIONARY";
            if (domain(host,"zdic.net")) return Set.of("ZDIC_OWN", "CC_CEDICT", "TAIWAN_MOE").contains(s.dataFamily()) ? s.dataFamily() : null;
            if (host.equals("hsk.cn-bj.ufileos.com") || domain(host,"chinesetest.cn")) return "CTI_HSK_SYLLABUS";
            return null;
        } catch (IllegalArgumentException ignored) { return null; }
    }
    private static String normalizedReading(String text) {
        return Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFC).toLowerCase(java.util.Locale.ROOT).replaceAll("[\\s'’]", "");
    }
    private List<Source> sources(Vocabulary v) {
        try { return json.readValue(v.getVerificationEvidenceJson(), Evidence.class).sources(); }
        catch (RuntimeException | com.fasterxml.jackson.core.JsonProcessingException ignored) { return List.of(); }
    }
    private Snapshot snapshot(Vocabulary v) {
        return new Snapshot(new Evidence(v.getCurriculumVersion(),v.getSourceVersion(),v.getLexicalSourceRef(),
                v.getMeaningSourceRef(),v.getHanVietSourceRef(),v.getExampleSourceRef(),v.getHskLevel(),v.getVerificationMethod(),
                v.getVerificationPolicyVersion(),sources(v),Boolean.TRUE.equals(v.getHanVietVerified()),Boolean.TRUE.equals(v.getExampleVerified())),v.getCreatedAt(),
                v.getProvenanceRecordedAt(),v.getReviewedAt(),v.getReviewedBy(),complete(v));
    }
    private static String clean(String s) { return s == null ? null : s.trim(); }
    private static boolean present(String s) { return s != null && !s.isBlank(); }
    public static String digest(Vocabulary v) {
        return VocabularyLegacyDigest.digest(v);
    }
}
