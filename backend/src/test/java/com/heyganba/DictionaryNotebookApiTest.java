package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.model.entity.*;
import com.heyganba.model.enums.*;
import com.heyganba.repository.DictionaryEntryRepository;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class DictionaryNotebookApiTest extends ContentApiTestBase {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired DictionaryEntryRepository dictionary;
    String token;
    Long userId;
    long notebookId;
    static final long ENTRY_ID = 9000000000L;

    @BeforeEach void prepare() throws Exception {
        dictionary.deleteAllByIdInBatch(java.util.List.of(ENTRY_ID, ENTRY_ID + 1, ENTRY_ID + 2, ENTRY_ID + 3));
        roleRepository.save(Role.builder().name(RoleName.ROLE_USER).build());
        roleRepository.save(Role.builder().name(RoleName.ROLE_ADMIN).build());
        dictionary.save(DictionaryEntry.builder().id(ENTRY_ID).word("学校").reading("がっこう").meaning("school")
                .vietnameseMeaning("trường học").vietnameseSearchText("truong hoc").commonRank(1)
                .searchText("学校 がっこう gakko gakkou school fixturecatalog").build());
        var auth = json.readTree(mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"notebook@test.example\",\"password\":\"Password123!\",\"fullName\":\"Notebook Test\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("data");
        token = auth.get("accessToken").asText(); userId = auth.get("userId").asLong();
        notebookId = json.readTree(mvc.perform(post("/notebooks").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Practice\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).at("/data/id").asLong();
    }

    @Test void publicLookupSupportsKanaKatakanaRomajiAndEnglish() throws Exception {
        for (String q : new String[]{"学校", "がっこう", "ガッコウ", "gakkou", "gakko", "school"}) {
            mvc.perform(get("/dictionary/search").param("q", q)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.vocabularies[?(@.word == '学校' && @.reading == 'がっこう')]", hasSize(1)));
        }
        assertThat(com.heyganba.service.DictionaryText.normalize("がっこう")).isEqualTo("がっこう");
        assertThat(com.heyganba.service.DictionaryText.normalize("trường học")).isEqualTo("truong hoc");
        assertThat(com.heyganba.service.DictionaryText.normalizePreservingDiacritics("h\u1ecfa")).isEqualTo("h\u1ecfa");
        assertThat(com.heyganba.service.DictionaryText.hasLatinDiacritics("h\u1ecfa")).isTrue();
    }

    @Test void exactSearchAliasesRankBeforeShorterPartialMatches() throws Exception {
        dictionary.save(DictionaryEntry.builder().id(ENTRY_ID + 1).word("仮").reading("かり").meaning("placeholder")
                .searchText("fixturecatalog-extra").build());
        mvc.perform(get("/dictionary/search").param("q", "fixturecatalog"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.vocabularies[0].id", is(-ENTRY_ID)));
    }

    @Test void dictionaryLookupAndVietnameseSearchExposeBothGlosses() throws Exception {
        mvc.perform(get("/dictionary/search").param("q", "trường học"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.vocabularies[0].word", is("学校")))
                .andExpect(jsonPath("$.data.vocabularies[0].vietnameseMeaning", is("trường học")))
                .andExpect(jsonPath("$.data.vocabularies[0].meaning", is("school")));
        mvc.perform(get("/dictionary/lookup/" + (-ENTRY_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.vocabulary.vietnameseMeaning", is("trường học")));
    }

    @Test void accentedVietnameseSearchKeepsToneMarksDistinct() throws Exception {
        dictionary.saveAll(java.util.List.of(
                DictionaryEntry.builder().id(ENTRY_ID + 2).word("\u706b\u4e8b").reading("\u304b\u3058").meaning("fire, conflagration")
                        .vietnameseMeaning("h\u1ecfa ho\u1ea1n").vietnameseSearchText("hoa hoan").commonRank(2).searchText("kaji fire fixture_fire").build(),
                DictionaryEntry.builder().id(ENTRY_ID + 3).word("\u679c\u7269").reading("\u304f\u3060\u3082\u306e").meaning("fruit")
                        .vietnameseMeaning("hoa qu\u1ea3").vietnameseSearchText("hoa qua").commonRank(1).searchText("kudamono fruit fixture_fruit").build()));

        mvc.perform(get("/dictionary/search").param("q", "h\u1ecfa"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.vocabularies[0].word", is("\u706b\u4e8b")))
                .andExpect(jsonPath("$.data.vocabularies[?(@.word == '\u679c\u7269')]", hasSize(0)));
        mvc.perform(get("/dictionary/search").param("q", "hoa"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.vocabularies[?(@.word == '\u679c\u7269')]", hasSize(1)));
    }

    @Test void draftsAndArchivedCourseWordsNeverLeakFromPublicSearch() throws Exception {
        for (ReviewStatus status : new ReviewStatus[]{ReviewStatus.PENDING_REVIEW, ReviewStatus.ARCHIVED}) {
            vocabularyRepository.save(Vocabulary.builder().word("非公開語").reading("ひこうかいご").meaning("hiddenfixture").reviewStatus(status).build());
        }
        mvc.perform(get("/dictionary/search").param("q", "hiddenfixture"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.vocabularies", hasSize(0)));
        mvc.perform(get("/dictionary/search").param("q", "hiddenfixture").header("Authorization", "Bearer " + adminAccessToken("dictionary-admin@test.example")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.vocabularies", hasSize(1)));
    }

    @Test void searchEscapesWildcardsAndRejectsOversizedOrInvalidPages() throws Exception {
        mvc.perform(get("/dictionary/search").param("q", "%"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.vocabularies[?(@.id == -9000000000)]", hasSize(0)));
        mvc.perform(get("/dictionary/search").param("q", "a".repeat(101))).andExpect(status().isBadRequest());
        mvc.perform(get("/dictionary/search").param("q", "学校").param("page", "-1")).andExpect(status().isBadRequest());
    }

    @Test void archivedCatalogEntriesCannotBeLookedUpOrSaved() throws Exception {
        var entry = dictionary.findById(ENTRY_ID).orElseThrow();
        entry.setActive(false); dictionary.save(entry);
        mvc.perform(get("/dictionary/lookup/" + (-ENTRY_ID))).andExpect(status().isNotFound());
        mvc.perform(post("/notebooks/" + notebookId + "/items").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"vocabularyId\":-9000000000}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/vocab/notebooks").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
    }

    @Test void importedWordCanBeSavedWithoutEnteringCurriculumSrs() throws Exception {
        var wordId = addWord(-ENTRY_ID);
        assertThat(vocabularyRepository.findById(wordId).orElseThrow().getDictionaryEntryId()).isEqualTo(ENTRY_ID);
        assertThat(vocabularyRepository.findNewForUser(userId, org.springframework.data.domain.PageRequest.of(0, 50)))
                .noneMatch(v -> v.getId().equals(wordId));
        mvc.perform(post("/notebooks/" + notebookId + "/items").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"vocabularyId\":-9000000000}"))
                .andExpect(status().isBadRequest());
    }

    @Test void notebookCannotImportDraftsOrBeEditedByAnotherUser() throws Exception {
        var draft = vocabularyRepository.save(Vocabulary.builder().word("未承認").reading("みしょうにん").meaning("draft").build());
        mvc.perform(post("/notebooks/" + notebookId + "/items").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"vocabularyId\":" + draft.getId() + "}"))
                .andExpect(status().isNotFound());
        mvc.perform(post("/notebooks/" + notebookId + "/items").header("Authorization", "Bearer " + adminAccessToken("other@test.example"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"vocabularyId\":-9000000000}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/notebooks")).andExpect(status().isUnauthorized());
    }

    @Test void serverGradesAnswersUpdatesMetricsAndRetryDoesNotDoubleAward() throws Exception {
        long wordId = addWord(-ENTRY_ID);
        String body = "{\"sessionId\":\"" + UUID.randomUUID() + "\",\"answers\":[{\"vocabularyId\":" + wordId + ",\"kind\":\"MEANING\",\"answer\":\"school\"}]}";
        for (int i=0; i<2; i++) mvc.perform(post("/notebooks/"+notebookId+"/practice-result").header("Authorization","Bearer "+token)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk()).andExpect(jsonPath("$.data.expEarned", is(10)));
        assertThat(studyActivityRepository.findByUserId(userId)).hasSize(1);
        assertThat(srsReviewRepository.count()).isZero();
        mvc.perform(get("/notebooks/"+notebookId).header("Authorization","Bearer "+token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].practiceCount", is(1))).andExpect(jsonPath("$.data.items[0].correctCount", is(1)));
        mvc.perform(get("/users/me/exp").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.data.totalExp", is(10)));
    }

    @Test void forgedCountsUnknownWordsAndRepeatedAnswersAreRejected() throws Exception {
        long wordId = addWord(-ENTRY_ID);
        mvc.perform(post("/notebooks/"+notebookId+"/practice-result").header("Authorization","Bearer "+token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"correctCount\":99999,\"totalCount\":99999}"))
                .andExpect(status().isBadRequest());
        String answer = "{\"vocabularyId\":" + wordId + ",\"kind\":\"MEANING\",\"answer\":\"school\"}";
        mvc.perform(post("/notebooks/"+notebookId+"/practice-result").header("Authorization","Bearer "+token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"sessionId\":\""+UUID.randomUUID()+"\",\"answers\":["+answer+","+answer+"]}"))
                .andExpect(status().isBadRequest());
        assertThat(studyActivityRepository.findByUserId(userId)).isEmpty();
    }

    long addWord(long id) throws Exception {
        return json.readTree(mvc.perform(post("/notebooks/"+notebookId+"/items").header("Authorization","Bearer "+token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"vocabularyId\":"+id+"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).at("/data/items/0/vocabularyId").asLong();
    }
}
