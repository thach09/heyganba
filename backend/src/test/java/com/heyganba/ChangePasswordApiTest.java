package com.heyganba;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.model.entity.Role;
import com.heyganba.model.enums.RoleName;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ChangePasswordApiTest extends ContentApiTestBase {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    String access, refresh, otherAccess, otherRefresh;
    @BeforeEach void setup() throws Exception {
        roleRepository.save(Role.builder().name(RoleName.ROLE_USER).build());
        var data = json.readTree(mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"password@test.example\",\"password\":\"Password123!\",\"fullName\":\"Password Test\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("data");
        access = data.get("accessToken").asText(); refresh = data.get("refreshToken").asText();
        var other = json.readTree(mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"password@test.example\",\"password\":\"Password123!\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("data");
        otherAccess = other.get("accessToken").asText(); otherRefresh = other.get("refreshToken").asText();
    }
    @Test void changeRevokesEveryOldAccessAndRefreshToken() throws Exception {
        mvc.perform(put("/auth/password").header("Authorization","Bearer "+access).contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"Password123!\",\"newPassword\":\"NewPassword123!\",\"refreshToken\":\""+refresh+"\"}"))
                .andExpect(status().isOk());
        for (String token : new String[]{access,otherAccess}) mvc.perform(get("/users/me").header("Authorization","Bearer "+token)).andExpect(status().isUnauthorized());
        for (String token : new String[]{refresh,otherRefresh}) mvc.perform(post("/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\""+token+"\"}")).andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"password@test.example\",\"password\":\"Password123!\"}")).andExpect(status().isUnauthorized());
        var newToken = json.readTree(mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"password@test.example\",\"password\":\"NewPassword123!\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).at("/data/accessToken").asText();
        mvc.perform(get("/users/me").header("Authorization","Bearer "+newToken)).andExpect(status().isOk());
    }
    @Test void requiresLoginCurrentPasswordAndValidNewPassword() throws Exception {
        String good = "{\"currentPassword\":\"Password123!\",\"newPassword\":\"NewPassword123!\"}";
        mvc.perform(put("/auth/password").contentType(MediaType.APPLICATION_JSON).content(good)).andExpect(status().isUnauthorized());
        mvc.perform(put("/auth/password").header("Authorization","Bearer "+access).contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"wrong\",\"newPassword\":\"NewPassword123!\"}")).andExpect(status().isUnauthorized());
        mvc.perform(put("/auth/password").header("Authorization","Bearer "+access).contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"Password123!\",\"newPassword\":\"short\"}")).andExpect(status().isBadRequest());
        mvc.perform(get("/users/me").header("Authorization","Bearer "+access)).andExpect(status().isOk());
    }
    @Test void duplicateRegistrationIsCaseInsensitive() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"PASSWORD@test.example\",\"password\":\"Password123!\",\"fullName\":\"Duplicate Test\"}"))
            .andExpect(status().isBadRequest());
    }
}
