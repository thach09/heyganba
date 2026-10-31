package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.common.response.JsonHttpResponse;
import com.heyganba.model.entity.Kanji;
import com.heyganba.model.entity.GrammarRule;
import com.heyganba.model.enums.ReviewStatus;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class LocalUxHttpContractTest extends ContentApiTestBase {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @Test void unauthorizedResponseIsActualUtf8RatherThanLossyServletWriterBytes() throws Exception {
        var result=mvc.perform(get("/users/me")).andExpect(status().isUnauthorized()).andReturn().getResponse();
        assertThat(result.getCharacterEncoding()).isEqualToIgnoringCase("UTF-8");
        var body=new String(result.getContentAsByteArray(), StandardCharsets.UTF_8);
        assertThat(mapper.readTree(body).path("message").asText()).isEqualTo("Vui lòng đăng nhập để tiếp tục.");
        assertThat(body).doesNotContain("\uFFFD", "nh?p");
    }

    @Test void filterWriterPreservesVietnameseHanziPinyinAndCombiningMarks() throws Exception {
        String mixed="Nguyễn · 汉字 · nǚ lǜ · a\u0301";
        var response=new MockHttpServletResponse();
        JsonHttpResponse.write(response,403,Map.of("message",mixed),mapper);
        assertThat(response.getContentType()).contains("application/json", "UTF-8");
        assertThat(mapper.readTree(response.getContentAsByteArray()).path("message").asText()).isEqualTo(mixed);
    }

    @Test void guestsReadOnlyApprovedPublicContentAndNeverPersonalProgressOrWrites() throws Exception {
        var approved=kanjiRepository.save(Kanji.builder().character("测").meaning("TEST FIXTURE ONLY").strokeCount(1).reviewStatus(ReviewStatus.APPROVED).build());
        var pending=kanjiRepository.save(Kanji.builder().character("试").meaning("PENDING TEST").strokeCount(1).reviewStatus(ReviewStatus.PENDING_REVIEW).build());
        var rule=grammarRuleRepository.save(GrammarRule.builder().title("TEST ONLY").structure("TEST").explanation("Fixture").orderIndex(901).reviewStatus(ReviewStatus.APPROVED).build());
        mvc.perform(get("/hanzi")).andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(1)).andExpect(jsonPath("$.data[0].practiceCount").value(0));
        mvc.perform(get("/hanzi/"+approved.getId())).andExpect(status().isOk());
        mvc.perform(get("/hanzi/"+pending.getId())).andExpect(status().isNotFound());
        mvc.perform(get("/grammar/rules/"+rule.getId())).andExpect(status().isOk());
        mvc.perform(post("/hanzi/"+approved.getId()+"/progress")).andExpect(status().isUnauthorized());
        for(String path:new String[]{"/users/me","/users/me/preferences","/flashcard/due-today","/progress/insights","/notebooks","/grammar/exercises"})mvc.perform(get(path)).andExpect(status().isUnauthorized());
    }

    private com.fasterxml.jackson.databind.JsonNode register(String email,String name) throws Exception {
        if(roleRepository.findByName(com.heyganba.model.enums.RoleName.ROLE_USER).isEmpty())
            roleRepository.save(com.heyganba.model.entity.Role.builder().name(com.heyganba.model.enums.RoleName.ROLE_USER).build());
        var response=mvc.perform(post("/auth/register").contentType("application/json")
                .content(mapper.writeValueAsBytes(Map.of("email",email,"fullName",name,"password","LocalFixtureOnly123!"))))
                .andExpect(status().isCreated()).andReturn().getResponse();
        return mapper.readTree(response.getContentAsByteArray()).path("data");
    }

    @Test void profileRoundTripIsUnicodeSafeOwnerBoundAndOmitsSecrets() throws Exception {
        String name="Nguyễn Ánh · 汉字 · nǚ lǜ";
        var first=register("utf8-a@jiayou.test",name);var second=register("utf8-b@jiayou.test","Second fixture");
        String bearer="Bearer "+first.path("accessToken").asText();
        var profile=mvc.perform(get("/users/me").param("id",second.path("userId").asText()).header("Authorization",bearer))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.id").value(first.path("userId").asInt()))
                .andExpect(jsonPath("$.data.fullName").value(name))
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist()).andExpect(jsonPath("$.data.twoFactorSecret").doesNotExist())
                .andExpect(jsonPath("$.data.accessToken").doesNotExist()).andExpect(jsonPath("$.data.refreshToken").doesNotExist()).andReturn().getResponse();
        assertThat(new String(profile.getContentAsByteArray(),StandardCharsets.UTF_8)).contains(name);
        mvc.perform(get("/users/"+second.path("userId").asText()).header("Authorization",bearer)).andExpect(status().isNotFound());
        mvc.perform(put("/users/me/class-code").header("Authorization",bearer).contentType("application/json")
                .content(mapper.writeValueAsBytes(Map.of("classCode","LỚP-A","userId",second.path("userId").asLong())))).andExpect(status().isOk());
        mvc.perform(get("/users/me").header("Authorization","Bearer "+second.path("accessToken").asText()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.classCode").isEmpty());
    }
}
