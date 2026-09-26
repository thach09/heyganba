package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.dto.auth.LoginRequest;
import com.heyganba.dto.auth.RefreshTokenRequest;
import com.heyganba.dto.auth.RegisterRequest;
import com.heyganba.model.entity.Role;
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
class AuthIntegrationTest {

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

    @BeforeEach
    void setUp() {
        streakRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();

        roleRepository.save(Role.builder().name(RoleName.ROLE_ADMIN).description("Admin").build());
        roleRepository.save(Role.builder().name(RoleName.ROLE_USER).description("User").build());
    }

    @Test
    @DisplayName("Health endpoint returns 200 OK with ApiResponse format")
    void healthCheck_ShouldReturnOk() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("UP")))
                .andExpect(jsonPath("$.data.service", is("heyganba-backend")));
    }

    @Test
    @DisplayName("Register new user should return 201 Created and JWT tokens")
    void register_Success() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("student@heyganba.vn")
                .password("Password123!")
                .fullName("Nguyen Van A")
                .build();

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.accessToken", notNullValue()))
                .andExpect(jsonPath("$.data.refreshToken", notNullValue()))
                .andExpect(jsonPath("$.data.email", is("student@heyganba.vn")))
                .andExpect(jsonPath("$.data.role", is("ROLE_USER")));
    }

    @Test
    @DisplayName("Register with duplicate email should return 400 Bad Request")
    void register_DuplicateEmail_ShouldFail() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("duplicate@heyganba.vn")
                .password("Password123!")
                .fullName("First User")
                .build();

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error", notNullValue()));
    }

    @Test
    @DisplayName("Login with valid credentials returns 200 OK and tokens")
    void login_Success() throws Exception {
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("login@heyganba.vn")
                .password("Secret123!")
                .fullName("Login User")
                .build();

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated());

        LoginRequest loginReq = LoginRequest.builder()
                .email("login@heyganba.vn")
                .password("Secret123!")
                .build();

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.accessToken", notNullValue()))
                .andExpect(jsonPath("$.data.email", is("login@heyganba.vn")));
    }

    @Test
    @DisplayName("Login with invalid password returns 401 Unauthorized")
    void login_InvalidPassword_ShouldFail() throws Exception {
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("wrongpwd@heyganba.vn")
                .password("CorrectPassword123!")
                .fullName("Test User")
                .build();

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated());

        LoginRequest loginReq = LoginRequest.builder()
                .email("wrongpwd@heyganba.vn")
                .password("WrongPassword123!")
                .build();

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error", is("UNAUTHORIZED")));
    }

    @Test
    @DisplayName("Refresh token flow returns fresh access and refresh tokens")
    void refreshToken_Success() throws Exception {
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("refresh@heyganba.vn")
                .password("Password123!")
                .fullName("Refresh User")
                .build();

        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        String refreshToken = objectMapper.readTree(responseBody).get("data").get("refreshToken").asText();

        RefreshTokenRequest refreshReq = RefreshTokenRequest.builder()
                .refreshToken(refreshToken)
                .build();

        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.accessToken", notNullValue()))
                .andExpect(jsonPath("$.data.refreshToken", notNullValue()));
    }
}
