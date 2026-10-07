package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.model.entity.Role;
import com.heyganba.model.enums.RoleName;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ProductEventApiTest extends ContentApiTestBase {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired com.heyganba.service.ProductMetricsService metrics;
    String token;
    long learner;
    @BeforeEach void setup() throws Exception {
        roleRepository.save(Role.builder().name(RoleName.ROLE_USER).build());
        var data = json.readTree(mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"metric@example.invalid\",\"password\":\"Password123!\",\"fullName\":\"Metric Test\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("data");
        token = data.get("accessToken").asText(); learner = data.get("userId").asLong();
    }
    @Test void startedUsesPrincipalDeduplicatesAndCannotClaimCompletion() throws Exception {
        String body = "{\"module\":\"SRS\",\"eventKey\":\"" + UUID.randomUUID() + "\",\"userId\":99999}";
        mvc.perform(post("/product-events/learning-started").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        for (int i = 0; i < 2; i++) mvc.perform(post("/product-events/learning-started")
                .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM product_events WHERE user_id=?", Integer.class, learner));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM study_activities", Integer.class));
        mvc.perform(post("/product-events/learning-started").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body.replace("SRS", "AUTH"))).andExpect(status().isBadRequest());
    }
    @Test void loginIsCapturedOnlyAfterAuthenticationSuccess() throws Exception {
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"metric@example.invalid\",\"password\":\"wrong\"}")).andExpect(status().isUnauthorized());
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM product_events", Integer.class));
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"metric@example.invalid\",\"password\":\"Password123!\"}")).andExpect(status().isOk());
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM product_events WHERE event_name='auth.login.v1'", Integer.class));
        streakRepository.deleteAll();
        userRepository.deleteAll();
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM product_events", Integer.class));
    }
    @Test void reportingUsesTheCanonicalRegistrationDayAndOneIncorrectItemStillCounts() {
        var cohort = java.time.LocalDate.of(2026, 1, 1);
        var registered = java.sql.Timestamp.from(cohort.atStartOfDay(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toInstant());
        jdbc.update("UPDATE users SET created_at=? WHERE id=?", registered, learner);
        jdbc.update("INSERT INTO study_activities(user_id, activity_date, source, item_count, correct_count, created_at, updated_at) "
                + "VALUES (?, ?, 'GRAMMAR', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", learner, cohort.plusDays(7));
        var result = metrics.retention(cohort, 7, cohort.plusDays(9));
        assertEquals(1, result.cohortSize());
        assertEquals(1, result.returningLearners());
        assertEquals(1.0, result.rate());
    }
}
