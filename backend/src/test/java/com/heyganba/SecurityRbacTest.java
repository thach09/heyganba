package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.dto.auth.LoginRequest;
import com.heyganba.dto.auth.RegisterRequest;
import com.heyganba.model.entity.Role;
import com.heyganba.model.entity.User;
import com.heyganba.model.enums.RoleName;
import com.heyganba.repository.RoleRepository;
import com.heyganba.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityRbacTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private com.heyganba.repository.StreakRepository streakRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Role adminRole;
    private Role userRole;

    @BeforeEach
    void setUp() {
        streakRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();

        adminRole = roleRepository.save(Role.builder().name(RoleName.ROLE_ADMIN).description("Admin").build());
        userRole = roleRepository.save(Role.builder().name(RoleName.ROLE_USER).description("User").build());
    }

    @Test
    @DisplayName("Anonymous user calling /admin/status receives 401 Unauthorized")
    void anonymous_AccessAdminRoute_ShouldReturn401() throws Exception {
        mockMvc.perform(get("/admin/status"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error", is("UNAUTHORIZED")));
    }

    @Test
    @DisplayName("Standard user with ROLE_USER calling /admin/status receives 403 Forbidden")
    void standardUser_AccessAdminRoute_ShouldReturn403() throws Exception {
        // Register regular user
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("regular@heyganba.vn")
                .password("Password123!")
                .fullName("Regular User")
                .build();

        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String token = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("accessToken").asText();

        // Attempt to call admin endpoint with standard user token
        mockMvc.perform(get("/admin/status")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error", is("FORBIDDEN")));
    }

    @Test
    @DisplayName("Administrator with ROLE_ADMIN calling /admin/status receives 200 OK")
    void adminUser_AccessAdminRoute_ShouldReturn200() throws Exception {
        // Create admin user in DB
        User adminUser = User.builder()
                .email("admin@heyganba.vn")
                .passwordHash(passwordEncoder.encode("AdminPass123!"))
                .fullName("System Admin")
                .role(adminRole)
                .isActive(true)
                .build();
        userRepository.save(adminUser);

        // Login as admin
        LoginRequest loginReq = LoginRequest.builder()
                .email("admin@heyganba.vn")
                .password("AdminPass123!")
                .build();

        MvcResult result = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn();

        String adminToken = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("accessToken").asText();

        // Access admin endpoint with admin token
        mockMvc.perform(get("/admin/status")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.role", is("ROLE_ADMIN")))
                .andExpect(jsonPath("$.data.authorizedAdmin", is("admin@heyganba.vn")));
    }

    @Test
    @DisplayName("Authenticated user calling /users/me retrieves their profile")
    void authenticatedUser_AccessProfile_ShouldReturn200() throws Exception {
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("profile@heyganba.vn")
                .password("Password123!")
                .fullName("Profile User")
                .build();

        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String token = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("accessToken").asText();

        mockMvc.perform(get("/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.email", is("profile@heyganba.vn")))
                .andExpect(jsonPath("$.data.fullName", is("Profile User")))
                .andExpect(jsonPath("$.data.role", is("ROLE_USER")));
    }
}
