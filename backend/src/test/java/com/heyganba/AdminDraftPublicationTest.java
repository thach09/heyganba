package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.heyganba.config.UserPrincipal;
import com.heyganba.model.entity.*;
import com.heyganba.model.enums.*;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.assertj.core.api.Assertions.assertThat;

class AdminDraftPublicationTest extends ContentApiTestBase {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String learner() {
        Role role = roleRepository.save(Role.builder().name(RoleName.ROLE_USER).build());
        User user = userRepository.save(User.builder().email("draft-reader@audit.test").fullName("Reader")
                .passwordHash("test-only-unused").role(role).build());
        return jwtTokenProvider.generateAccessToken(UserPrincipal.create(user));
    }
    private long create(String path, String token, ObjectNode body) throws Exception {
        var result = mvc.perform(post(path).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body.toString()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.reviewStatus").value("PENDING_REVIEW"))
                .andReturn();
        return json.readTree(result.getResponse().getContentAsString()).path("data").path("id").asLong();
    }
    @Test void vocabularyRequiresExplicitApprovalAndEditsReplaceCanonicalFields() throws Exception {
        String admin = adminAccessToken("draft-admin@audit.test"); String user = learner();
        var body = json.createObjectNode().put("word", "你好").put("reading", "nǐ hǎo").put("meaning", "xin chào")
                .put("sinoVietnamese", "nhĩ hảo").put("reviewStatus", "APPROVED");
        long id = create("/admin/vocabulary", admin, body);
        mvc.perform(get("/admin/vocabulary/" + id + "/provenance").header("Authorization", "Bearer " + user))
                .andExpect(status().isForbidden());
        assertThat(vocabularyRepository.findById(id).orElseThrow().getNeedsHumanCheck()).isTrue();
        mvc.perform(get("/admin/review-queue?onlyNeedsCheck=true").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].id").value(id));
        mvc.perform(get("/vocabulary/" + id).header("Authorization", "Bearer " + user)).andExpect(status().isNotFound());
        mvc.perform(get("/admin/vocabulary").header("Authorization", "Bearer " + admin)).andExpect(status().isOk());
        mvc.perform(post("/admin/review-queue/VOCABULARY/" + id + "/approve")
                .header("Authorization", "Bearer " + admin).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        var evidence = json.valueToTree(VocabularyWebEvidenceTest.fixtureEvidence("你好", "nǐ hǎo"));
        mvc.perform(put("/admin/vocabulary/" + id + "/provenance").header("Authorization", "Bearer " + user)
                .contentType(MediaType.APPLICATION_JSON).content(evidence.toString())).andExpect(status().isForbidden());
        mvc.perform(put("/admin/vocabulary/" + id + "/provenance").header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON).content(evidence.toString())).andExpect(status().isOk());
        mvc.perform(post("/admin/review-queue/VOCABULARY/" + id + "/approve")
                .header("Authorization", "Bearer " + admin).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk());
        mvc.perform(get("/vocabulary/" + id).header("Authorization", "Bearer " + user)).andExpect(status().isOk());
        var stored = vocabularyRepository.findById(id).orElseThrow();
        stored.setPinyinNormalized("old-index"); vocabularyRepository.saveAndFlush(stored);
        body.put("word", "您好").put("reading", "nín hǎo").put("meaning", "chào ông/bà");
        mvc.perform(put("/admin/vocabulary/" + id).header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pinyin").value("nín hǎo"))
                .andExpect(jsonPath("$.data.meaningVi").value("chào ông/bà"))
                .andExpect(jsonPath("$.data.reviewStatus").value("PENDING_REVIEW"));
        assertThat(vocabularyRepository.findById(id).orElseThrow().getPinyinNormalized()).isNull();
        assertThat(vocabularyRepository.findById(id).orElseThrow().getNeedsHumanCheck()).isTrue();
        mvc.perform(get("/vocabulary/" + id).header("Authorization", "Bearer " + user)).andExpect(status().isNotFound());
        mvc.perform(post("/admin/review-queue/VOCABULARY/" + id + "/approve")
                .header("Authorization", "Bearer " + admin).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest()); // Source snapshot must cover the edited content, not the old version.
    }
    @Test void hanziCreationAndEditingRemainPending() throws Exception {
        String admin = adminAccessToken("hanzi-admin@audit.test");
        var body = json.createObjectNode().put("character", "学").put("pinyin", "xué").put("meaning", "học").put("strokeCount", 8);
        long id = create("/admin/hanzi", admin, body);
        assertThat(kanjiRepository.findById(id).orElseThrow().getNeedsHumanCheck()).isTrue();
        var stored = kanjiRepository.findById(id).orElseThrow(); stored.setReviewStatus(ReviewStatus.APPROVED); kanjiRepository.saveAndFlush(stored);
        mvc.perform(put("/admin/hanzi/" + id).header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reviewStatus").value("PENDING_REVIEW"));
        mvc.perform(get("/admin/hanzi").header("Authorization", "Bearer " + admin)).andExpect(status().isOk());
    }
    @Test void exerciseCreationAndEditingRemainPending() throws Exception {
        String admin = adminAccessToken("grammar-admin@audit.test");
        var rule = persistApprovedRule(GrammarRule.builder().title("Test rule").structure("A 是 B").explanation("Test fixture").orderIndex(1).build());
        var body = json.createObjectNode().put("grammarRuleId", rule.getId()).put("questionText", "Test question")
                .put("optionsJson", "[\"A\",\"B\"]").put("correctAnswer", "A");
        long id = create("/admin/exercises", admin, body);
        assertThat(grammarExerciseRepository.findById(id).orElseThrow().getNeedsHumanCheck()).isTrue();
        var stored = grammarExerciseRepository.findById(id).orElseThrow(); stored.setReviewStatus(ReviewStatus.APPROVED); grammarExerciseRepository.saveAndFlush(stored);
        mvc.perform(put("/admin/exercises/" + id).header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reviewStatus").value("PENDING_REVIEW"));
        mvc.perform(get("/admin/exercises").header("Authorization", "Bearer " + admin)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].grammarRuleId").value(rule.getId()));
    }
}
