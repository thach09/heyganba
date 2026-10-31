package com.heyganba;

import com.heyganba.support.ContentApiTestBase;
import com.heyganba.model.entity.*;
import com.heyganba.model.enums.*;
import com.heyganba.service.*;
import com.heyganba.dto.exam.ExamGenerateRequest;
import com.heyganba.dto.notebook.*;
import com.heyganba.common.exception.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@org.springframework.test.context.TestPropertySource(properties="app.legacy-phonetics-enabled=true")
class VocabularyPublicationApiTest extends ContentApiTestBase {
    @Autowired MockMvc mvc;
    @Autowired VocabularyService vocabulary;
    @Autowired DictionaryService dictionary;
    @Autowired FlashcardService flashcards;
    @Autowired VocabNotebookService notebooks;
    @Autowired ExamService exams;
    @Autowired KanjiService hanzi;
    @Autowired AdminContentService admin;
    @Autowired LearningInsightsService insights;

    private User learner() {
        Role role = roleRepository.save(Role.builder().name(RoleName.ROLE_USER).build());
        return userRepository.save(User.builder().email("publication@fixture.test").fullName("Fixture")
                .passwordHash("NOT_A_REAL_CREDENTIAL").role(role).isActive(true).build());
    }
    private Vocabulary word(String spelling, String meaning) {
        return persistApprovedVocabulary(Vocabulary.builder().word(spelling).reading("fixture")
                .meaning(meaning).hskLevel(1).build());
    }
    @Test void coreSubsetReturnsNoSupplementalFieldsAndReintroducedDraftIsWithheldAcrossReads() throws Exception {
        User user = learner();
        Vocabulary core = word("core-subset-fixture", "Synthetic core meaning");
        var notebook = notebooks.createNotebook(user.getId(), new CreateNotebookRequest("Fixture", null));
        notebooks.addWordToNotebook(user.getId(), notebook.id(), new AddNotebookItemRequest(core.getId(), null));
        mvc.perform(get("/vocabulary/" + core.getId())).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.word").value("core-subset-fixture"))
                .andExpect(jsonPath("$.data.hanViet").doesNotExist())
                .andExpect(jsonPath("$.data.exampleZh").doesNotExist())
                .andExpect(jsonPath("$.data.examplePinyin").doesNotExist())
                .andExpect(jsonPath("$.data.exampleVi").doesNotExist());
        mvc.perform(get("/dictionary/lookup/" + core.getId())).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.vocabulary.word").value("core-subset-fixture"))
                .andExpect(jsonPath("$.data.vocabulary.sinoVietnamese").doesNotExist())
                .andExpect(jsonPath("$.data.vocabulary.exampleSentence").doesNotExist())
                .andExpect(jsonPath("$.data.vocabulary.exampleReading").doesNotExist())
                .andExpect(jsonPath("$.data.vocabulary.exampleMeaning").doesNotExist());
        assertThat(flashcards.getDueToday(user.getId(), null)).hasSize(1);
        core.setSinoVietnamese("UNVERIFIED DRAFT");
        core.setExampleSentence("UNVERIFIED EXAMPLE");
        vocabularyRepository.saveAndFlush(core);
        mvc.perform(get("/vocabulary/" + core.getId())).andExpect(status().isNotFound());
        mvc.perform(get("/dictionary/lookup/" + core.getId())).andExpect(status().isNotFound());
        assertThat(dictionary.search("core-subset-fixture", 0).vocabularies()).isEmpty();
        assertThat(flashcards.getDueToday(user.getId(), null)).isEmpty();
        assertThat(notebooks.listNotebooks(user.getId()).getFirst().items()).isEmpty();
        assertThat(vocabularyRepository.findById(core.getId())).isPresent();
    }
    @Test void approvedFlagAndSelfDeclaredUrlNeverGrantPublicAccessOrApproval() throws Exception {
        Vocabulary draft = vocabularyRepository.save(Vocabulary.builder().word("untrusted").reading("fixture")
                .meaning("fixture").partOfSpeech("TEST_ONLY").sourceRef("https://publisher.example/claim")
                .reviewStatus(ReviewStatus.APPROVED).build());
        mvc.perform(get("/vocabulary/" + draft.getId())).andExpect(status().isNotFound());
        mvc.perform(get("/dictionary/lookup/" + draft.getId())).andExpect(status().isNotFound());
        assertThat(dictionary.search("untrusted", 0).vocabularies()).isEmpty();
        assertThatThrownBy(() -> admin.approveContent(null, "VOCABULARY", draft.getId(), null))
                .isInstanceOf(BadRequestException.class);
        mvc.perform(post("/admin/review-queue/VOCABULARY/" + draft.getId() + "/approve"))
                .andExpect(status().isUnauthorized());
        User user = learner();
        String token = jwtTokenProvider.generateAccessToken(com.heyganba.config.UserPrincipal.create(user));
        mvc.perform(post("/admin/review-queue/VOCABULARY/" + draft.getId() + "/approve")
                .header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
    }
    @Test void receiptRevocationRemovesVocabularyDictionaryNotebookAndWarmedSrsWithoutDeletingLearningData() {
        User user = learner(); Vocabulary word = word("fixture-word", "fixture-meaning");
        var notebook = notebooks.createNotebook(user.getId(), new CreateNotebookRequest("Fixture", null));
        notebooks.addWordToNotebook(user.getId(), notebook.id(), new AddNotebookItemRequest(word.getId(), null));
        assertThat(dictionary.lookup(word.getId()).vocabulary().word()).isEqualTo(word.getWord());
        assertThat(flashcards.getDueToday(user.getId(), null)).extracting(c -> c.vocabularyId()).contains(word.getId());
        assertThat(notebooks.listNotebooks(user.getId()).getFirst().items()).hasSize(1);
        publicationCatalog.catalog().withArray("revokedReceipts").addObject()
                .put("issuerId", "fixture-issuer").put("verificationId", "fixture-" + word.getId());
        publicationCatalog.write();
        // Direct service calls below model a new request after the operator publishes revocation.
        org.springframework.web.context.request.RequestContextHolder.resetRequestAttributes();
        assertThatThrownBy(() -> vocabulary.getWordById(word.getId())).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> dictionary.lookup(word.getId())).isInstanceOf(ResourceNotFoundException.class);
        assertThat(flashcards.getDueToday(user.getId(), null)).isEmpty();
        assertThat(notebooks.listNotebooks(user.getId()).getFirst().items()).isEmpty();
        assertThat(vocabularyRepository.findById(word.getId())).isPresent();
        assertThat(insights.insights(user.getId()).levels().getFirst().totalWords()).isZero();
    }
    @Test void editedAndRestoredContentCannotReplayAnOldApprovalReceipt() {
        Vocabulary word = word("original", "meaning");
        auditLogRepository.save(AuditLog.builder().tableName("vocabulary").recordId(word.getId()).action("UPDATE").build());
        assertThatThrownBy(() -> admin.approveContent(null, "VOCABULARY", word.getId(), null)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> vocabulary.getWordById(word.getId())).isInstanceOf(ResourceNotFoundException.class);
    }
    @Test void revokedSourceBlocksRecoveryOfAnAlreadyGeneratedExam() throws Exception {
        User user = learner(); Vocabulary revoke = null;
        for (int i = 0; i < 4; i++) revoke = word("word-" + i, "meaning-" + i);
        var exam = exams.generate(user.getId(), new ExamGenerateRequest(5, 10, null));
        assertThat(exams.getExam(user.getId(), exam.examId()).questions()).isNotEmpty();
        var stored = new com.fasterxml.jackson.databind.ObjectMapper().readTree(mockExamRepository.findById(exam.examId()).orElseThrow().getQuestionsJson());
        long sourceId = stored.get(0).path("publications").get(0).path("vocabularyId").asLong();
        publicationCatalog.catalog().withArray("revokedReceipts").addObject()
                .put("issuerId", "fixture-issuer").put("verificationId", "fixture-" + sourceId);
        publicationCatalog.write();
        // Direct service calls below model a new request after the operator publishes revocation.
        org.springframework.web.context.request.RequestContextHolder.resetRequestAttributes();
        assertThatThrownBy(() -> exams.getExam(user.getId(), exam.examId())).isInstanceOf(BadRequestException.class);
    }
    @Test void approvalRequiresProofAndContentEditsWithdrawBothModernAndLegacyRepresentations() {
        Vocabulary word = word("fixture", "old-meaning"); word.setReviewStatus(ReviewStatus.PENDING_REVIEW);
        vocabularyRepository.saveAndFlush(word);
        assertThatThrownBy(() -> vocabulary.getWordById(word.getId())).isInstanceOf(ResourceNotFoundException.class);
        admin.approveContent(null, "VOCABULARY", word.getId(), "fixture approval");
        assertThat(vocabulary.getWordById(word.getId()).meaningVi()).isEqualTo("old-meaning");
        long auditCount = auditLogRepository.count();
        admin.approveContent(null, "VOCABULARY", word.getId(), "duplicate");
        assertThat(auditLogRepository.count()).isEqualTo(auditCount);
        var edit = com.heyganba.dto.admin.AdminVocabularyRequest.builder().word("fixture").reading("new-reading").meaning("new-meaning").build();
        Vocabulary changed = admin.updateVocabulary(null, word.getId(), edit);
        assertThat(changed.getReading()).isEqualTo("new-reading");
        assertThat(changed.getPinyin()).isEqualTo("new-reading");
        assertThat(changed.getMeaning()).isEqualTo("new-meaning");
        assertThat(changed.getMeaningVi()).isEqualTo("new-meaning");
        assertThat(changed.getReviewStatus()).isEqualTo(ReviewStatus.PENDING_REVIEW);
        assertThatThrownBy(() -> admin.approveContent(null, "VOCABULARY", word.getId(), null)).isInstanceOf(BadRequestException.class);
    }
    @Test void hanziCompoundsResolveOnlyCurrentlyAuthorizedVocabulary() {
        Vocabulary word = word("学校", "fixture-meaning");
        Kanji character = persistApprovedKanji(Kanji.builder().character("学").meaningVi("fixture")
                .exampleWordsJson("[{\"word\":\"学校\",\"vi\":\"untrusted embedded definition\"}]").build());
        assertThat(hanzi.getKanjiById(null, character.getId()).exampleWordsJson()).contains("fixture-meaning")
                .doesNotContain("untrusted embedded definition");
        publicationCatalog.catalog().withArray("revokedReceipts").addObject()
                .put("issuerId", "fixture-issuer").put("verificationId", "fixture-" + word.getId());
        publicationCatalog.write(); org.springframework.web.context.request.RequestContextHolder.resetRequestAttributes();
        assertThat(hanzi.getKanjiById(null, character.getId()).exampleWordsJson()).isEqualTo("[]");
    }

    @Test void withdrawnHistoricalReviewsDoNotHideTheCountOfNewEligibleWords() {
        User user = learner(); Vocabulary old = word("withdrawn", "old"); Vocabulary fresh = word("fresh", "new");
        srsReviewRepository.save(SrsReview.builder().user(user).vocabulary(old).repetitions(2).intervalDays(1)
                .easeFactor(2.5).dueDate(java.time.Instant.now().minusSeconds(1)).build());
        publicationCatalog.catalog().withArray("revokedReceipts").addObject()
                .put("issuerId", "fixture-issuer").put("verificationId", "fixture-" + old.getId());
        publicationCatalog.write(); org.springframework.web.context.request.RequestContextHolder.resetRequestAttributes();
        assertThat(flashcards.stats(user.getId()).availableNewWords()).isEqualTo(1);
        assertThat(flashcards.stats(user.getId()).learnedWords()).isZero();
        assertThat(flashcards.getDueToday(user.getId(), 10)).extracting(c -> c.vocabularyId()).containsExactly(fresh.getId());
        assertThat(srsReviewRepository.countByUserId(user.getId())).isEqualTo(1);
    }

}
