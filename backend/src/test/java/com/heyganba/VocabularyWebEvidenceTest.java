package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.dto.dictionary.DictionarySearchResponse;
import com.heyganba.dto.flashcard.FlashcardDueResponse;
import com.heyganba.dto.vocabulary.VocabularyWordResponse;
import com.heyganba.model.entity.User;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.repository.VocabularyRepository;
import com.heyganba.service.AuditLogService;
import com.heyganba.service.VocabularyProvenanceService;
import com.heyganba.service.VocabularyProvenanceService.Evidence;
import com.heyganba.service.VocabularyProvenanceService.Source;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class VocabularyWebEvidenceTest {
    private VocabularyProvenanceService service;
    private Vocabulary word;
    private final User admin = User.builder().id(77L).build();
    static Source fixtureSource(String url, String family, String word, String reading, Set<String> fields, String status) {
        return new Source("Synthetic test evidence",family,url,"FIXTURE_NOT_REAL_REVIEW",word,reading,Instant.now(),status,fields,"Fixture only",null);
    }
    static final Set<String> CORE = Set.of("WORD","READING","MEANING","PART_OF_SPEECH");
    static Evidence fixtureEvidence(String word, String reading) {
        return evidence(List.of(fixtureSource("https://www.mdbg.net/chinese/dictionary", "CC_CEDICT",word,reading,CORE,"RETRIEVED"),
                fixtureSource("https://language.moe.gov.tw/fixture", "TAIWAN_MOE",word,reading,CORE,"RETRIEVED")),false);
    }
    static Evidence evidence(List<Source> sources, boolean examples) {
        return new Evidence("TEST_FIXTURE_ONLY","fixture-v1","Synthetic lexical fixture","Synthetic editorial meaning fixture",null,null,null,
                "WEB_CROSS_CHECKED",VocabularyProvenanceService.POLICY,sources,false,examples);
    }
    // Future provenance metadata assertions belong to this unpublished feature graph,
    // not the independently committed V1 codec tests. No assertion is skipped.
    @Test void futurePublicationMetadataDoesNotChangeLegacyDigest() {
        Vocabulary item = Vocabulary.builder().word("fixture").pinyin("fixture")
                .meaningVi("synthetic").hskLevel(1).partOfSpeech("fixture").build();
        String before = com.heyganba.service.VocabularyLegacyDigest.digest(item);
        item.setCurriculumVersion("SYNTHETIC_TEST_GROUP");
        item.setHanVietVerified(true);
        item.setExampleVerified(true);
        assertThat(VocabularyProvenanceService.digest(item)).isEqualTo(before);
    }

    @BeforeEach void setup() {
        var repository=mock(VocabularyRepository.class);
        service=new VocabularyProvenanceService(repository,mock(AuditLogService.class),new ObjectMapper().findAndRegisterModules());
        word=Vocabulary.builder().id(1L).word("水").pinyin("shuǐ").meaningVi("nước").hanViet("Draft optional field")
                .exampleZh("Draft example").hskLevel(null).partOfSpeech("Danh từ").build();
        when(repository.findById(1L)).thenReturn(Optional.of(word));
    }
    @Test void twoIndependentSourcesAndCurrentDigestAllowExplicitReviewWithoutTeacherIdentity() {
        service.save(admin,1L,fixtureEvidence(word.getWord(),word.getReading()));
        assertThat(service.complete(word)).isTrue();
        assertThat(word.getReviewStatus().name()).isEqualTo("PENDING_REVIEW");
        service.recordReview(admin,word);
        assertThat(word.getReviewedBy()).isEqualTo(77L); // operator, not a teacher signature
        assertThat(word.publishedHanViet()).isNull();
        assertThat(word.publishedExampleSentence()).isNull();
        assertThat(word.getExampleSentence()).isEqualTo("Draft example"); // retained for later verification
    }
    @Test void differentMirrorNamesDoNotCreateIndependentDictionarySources() {
        service.save(admin,1L,evidence(List.of(
                fixtureSource("https://www.mdbg.net/one","MDBG", "水","shuǐ",CORE,"RETRIEVED"),
                fixtureSource("https://www.purpleculture.net/two","A_DIFFERENT_LABEL", "水","shuǐ",CORE,"RETRIEVED")),false));
        assertThat(service.complete(word)).isFalse();
    }
    @Test void collinsDictionaryEvidenceIsIndependentButUnrelatedPublisherPagesCannotApprove() {
        var cedict = fixtureEvidence(word.getWord(), word.getReading()).sources().get(0);
        service.save(admin, 1L, evidence(List.of(cedict,
                fixtureSource("https://www.collinsdictionary.com/dictionary/chinese-english/fixture", "COLLINS",
                        word.getWord(), word.getReading(), CORE, "RETRIEVED")), false));
        assertThat(service.complete(word)).isTrue();
        service.save(admin, 1L, evidence(List.of(cedict,
                fixtureSource("https://www.collinsdictionary.com/translator", "COLLINS",
                        word.getWord(), word.getReading(), CORE, "RETRIEVED")), false));
        assertThat(service.complete(word)).isFalse();
    }
    @Test void missingMeaningEvidenceCannotApprove() {
        var e=fixtureEvidence("水","shuǐ");
        var second=e.sources().get(1);
        service.save(admin,1L,evidence(List.of(e.sources().get(0),fixtureSource(second.reference(),second.dataFamily(),"水","shuǐ",Set.of("WORD","READING"),"RETRIEVED")),false));
        assertThat(service.complete(word)).isFalse();
    }
    @Test void inaccessibleSourceCannotApprove() {
        var e=fixtureEvidence("水","shuǐ");
        service.save(admin,1L,evidence(List.of(e.sources().get(0),fixtureSource("https://language.moe.gov.tw/fixture","TAIWAN_MOE","水","shuǐ",CORE,"UNAVAILABLE")),false));
        assertThat(service.complete(word)).isFalse();
    }
    @Test void editingMeaningInvalidatesEvidenceDigest() {
        service.save(admin,1L,fixtureEvidence("水","shuǐ"));
        word.setMeaningVi("Changed after source check");
        assertThat(service.complete(word)).isFalse();
    }
    @Test void optionalExamplesRequireTheirOwnEvidenceOnlyWhenPublished() {
        service.save(admin,1L,evidence(fixtureEvidence("水","shuǐ").sources(),true));
        assertThat(service.complete(word)).isFalse();
    }
    @Test void unverifiedOptionalFieldsAreOmittedFromVocabularyDictionaryAndSrsDtos() {
        service.save(admin,1L,fixtureEvidence(word.getWord(), word.getReading()));
        service.recordReview(admin, word);

        var vocabulary = VocabularyWordResponse.from(word);
        assertThat(vocabulary.hanViet()).isNull();
        assertThat(vocabulary.exampleZh()).isNull();
        assertThat(vocabulary.examplePinyin()).isNull();
        assertThat(vocabulary.exampleVi()).isNull();

        var dictionary = DictionarySearchResponse.Word.from(word);
        assertThat(dictionary.sinoVietnamese()).isNull();
        assertThat(dictionary.exampleSentence()).isNull();
        assertThat(dictionary.exampleReading()).isNull();
        assertThat(dictionary.exampleMeaning()).isNull();

        var srs = FlashcardDueResponse.fromNewVocabulary(word);
        assertThat(srs.hanViet()).isNull();
        assertThat(srs.sinoVietnamese()).isNull();
        assertThat(srs.exampleZh()).isNull();
        assertThat(srs.examplePinyin()).isNull();
        assertThat(srs.exampleVi()).isNull();
        assertThat(srs.exampleSentence()).isNull();
        assertThat(srs.exampleReading()).isNull();
        assertThat(srs.exampleMeaning()).isNull();
    }

    @Test void evidenceForAnotherReadingCannotBeReusedByDroppingTones() {
        service.save(admin,1L,fixtureEvidence("水","shui"));
        assertThat(service.complete(word)).isFalse();
    }
    @Test void hskLabelNeedsAnOfficialSyllabusReference() {
        var e=fixtureEvidence("水","shuǐ");
        service.save(admin,1L,new Evidence(e.curriculumVersion(),e.sourceVersion(),e.lexicalSourceRef(),e.meaningSourceRef(),null,null,1,e.verificationMethod(),e.verificationPolicyVersion(),e.sources(),false,false));
        assertThat(service.complete(word)).isFalse();
    }
}
