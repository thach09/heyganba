package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.model.entity.Role;
import com.heyganba.model.enums.RoleName;
import com.heyganba.service.RefreshCookieService;
import com.heyganba.support.ContentApiTestBase;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class RefreshCookieApiTest extends ContentApiTestBase {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @BeforeEach void roles() { roleRepository.save(Role.builder().name(RoleName.ROLE_USER).build()); }

    private MvcResult register() throws Exception {
        return mvc.perform(post("/auth/register").header("Origin", "http://localhost:5173")
                .header("X-Auth-Transport", "cookie").contentType("application/json")
                .content("{\"email\":\"cookie@heyganba.test\",\"password\":\"CookieTest123!\",\"fullName\":\"Cookie Test\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.refreshToken").isEmpty()).andReturn();
    }
    private Cookie cookie(MvcResult result) {
        String raw = result.getResponse().getHeader("Set-Cookie");
        return new Cookie(RefreshCookieService.NAME, raw.substring(raw.indexOf('=') + 1, raw.indexOf(';')));
    }

    @Test void browserTokenHasFlagsAndRotationRejectsReplay() throws Exception {
        var result = register();
        String header = result.getResponse().getHeader("Set-Cookie");
        assertTrue(header.contains("HttpOnly")); assertTrue(header.contains("Secure"));
        assertTrue(header.contains("SameSite=Lax")); assertTrue(header.contains("Path=/api/v1/auth"));
        assertEquals("no-store", result.getResponse().getHeader("Cache-Control"));
        var original = cookie(result);
        mvc.perform(post("/auth/refresh").header("Origin", "http://localhost:5173")
                .header("X-Auth-Transport", "cookie").cookie(original).contentType("application/json").content("{}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.refreshToken").isEmpty())
                .andExpect(header().exists("Set-Cookie"));
        mvc.perform(post("/auth/refresh").header("Origin", "http://localhost:5173")
                .header("X-Auth-Transport", "cookie").cookie(original).contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test void cookieOperationsRequireExplicitTransportAndTrustedOrigin() throws Exception {
        var token = cookie(register());
        mvc.perform(post("/auth/refresh").cookie(token).contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/auth/refresh").cookie(token).header("X-Auth-Transport", "cookie")
                .contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/auth/refresh").cookie(token).header("X-Auth-Transport", "cookie")
                .header("Origin", "https://evil.example").contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test void logoutClearsCookieAndRevokesRefresh() throws Exception {
        var result = register();
        var token = cookie(result);
        String access = mapper.readTree(result.getResponse().getContentAsString()).get("data").get("accessToken").asText();
        mvc.perform(post("/auth/logout").header("Origin", "http://localhost:5173")
                .header("X-Auth-Transport", "cookie").header("Authorization", "Bearer " + access).cookie(token))
                .andExpect(status().isOk()).andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));
        mvc.perform(get("/users/me").header("Authorization", "Bearer " + access)).andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/refresh").header("Origin", "http://localhost:5173")
                .header("X-Auth-Transport", "cookie").cookie(token).contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
