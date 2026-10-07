package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.model.entity.Role;
import com.heyganba.model.enums.RoleName;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class LearningPreferenceApiTest extends ContentApiTestBase {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    String first, second;
    @BeforeEach void setup() throws Exception {
        roleRepository.save(Role.builder().name(RoleName.ROLE_USER).build());
        first = register("prefs1@example.invalid"); second = register("prefs2@example.invalid");
    }
    String register(String email) throws Exception {
        return json.readTree(mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\""+email+"\",\"password\":\"Password123!\",\"fullName\":\"Preference Test\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).at("/data/accessToken").asText();
    }
    @Test void defaultsAreOffAndEachAuthenticatedUserOwnsOnlyTheirRow() throws Exception {
        mvc.perform(get("/users/me/preferences")).andExpect(status().isUnauthorized());
        mvc.perform(get("/users/me/preferences").header("Authorization","Bearer "+first))
                .andExpect(jsonPath("$.data.reminderOptIn").value(false))
                .andExpect(jsonPath("$.data.dailyStudyMinutes").isEmpty())
                .andExpect(jsonPath("$.data.studyDayZone").value("Asia/Ho_Chi_Minh"));
        String body = "{\"dailyStudyMinutes\":20,\"reminderOptIn\":true,\"reminderTime\":\"20:30\",\"userId\":99999}";
        mvc.perform(put("/users/me/preferences").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
        mvc.perform(put("/users/me/preferences").header("Authorization","Bearer "+first).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.reminderTime").value("20:30"));
        mvc.perform(get("/users/me/preferences").header("Authorization","Bearer "+second))
                .andExpect(jsonPath("$.data.reminderOptIn").value(false));
        mvc.perform(get("/users/99999/preferences").header("Authorization","Bearer "+first)).andExpect(status().isNotFound());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM user_learning_preferences",Integer.class));
    }
    @Test void validatesAtServerAndAllowsConsentWithdrawalAndUnsetGoal() throws Exception {
        for (String body : new String[]{
                "{\"dailyStudyMinutes\":0,\"reminderOptIn\":false}",
                "{\"dailyStudyMinutes\":1441,\"reminderOptIn\":false}",
                "{\"reminderOptIn\":true}",
                "{\"reminderOptIn\":false,\"reminderTime\":\"25:00\"}",
                "{\"reminderTime\":\"20:30\"}"}) {
            mvc.perform(put("/users/me/preferences").header("Authorization","Bearer "+first).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        for (String body : new String[]{"{\"dailyStudyMinutes\":15,\"reminderOptIn\":true,\"reminderTime\":\"08:00\"}",
                "{\"dailyStudyMinutes\":null,\"reminderOptIn\":false,\"reminderTime\":null}"}) {
            mvc.perform(put("/users/me/preferences").header("Authorization","Bearer "+first).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isOk());
        }
        mvc.perform(get("/users/me/preferences").header("Authorization","Bearer "+first))
                .andExpect(jsonPath("$.data.reminderOptIn").value(false)).andExpect(jsonPath("$.data.reminderTime").isEmpty());
        streakRepository.deleteAll(); userRepository.deleteAll();
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM user_learning_preferences",Integer.class));
    }
}
