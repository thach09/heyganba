package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.dto.auth.RegisterRequest;
import com.heyganba.model.entity.Lesson;
import com.heyganba.model.entity.Role;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.model.enums.RoleName;
import com.heyganba.support.ContentApiTestBase;
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

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VocabularyApiTest extends ContentApiTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private Lesson approvedLesson;
    private Lesson pendingLesson;
    private Vocabulary approvedWord;
    private Vocabulary pendingWord;
    private String userToken;
    private String adminToken;

    @BeforeEach
    void setUp() throws Exception {
        roleRepository.save(Role.builder().name(RoleName.ROLE_ADMIN).description("Admin").build());
        roleRepository.save(Role.builder().name(RoleName.ROLE_USER).description("User").build());

        approvedLesson = lessonRepository.save(Lesson.builder()
                .slug("lesson-approved")
                .title("Bài Đã Duyệt")
                .description("Mô tả bài đã duyệt")
                .curriculumLevel("Nhập môn")
                .orderIndex(1)
                .build());

        pendingLesson = lessonRepository.save(Lesson.builder()
                .slug("intro-greetings")
                .title("Chào hỏi và giới thiệu bản thân")
                .description("Bài học mẫu M2.1 đang chờ kiểm duyệt")
                .curriculumLevel("Nhập môn")
                .orderIndex(2)
                .build());

        approvedWord = persistApprovedVocabulary(Vocabulary.builder()
                .word("好")
                .traditional("好")
                .pinyin("hǎo")
                .pinyinNormalized("hao hao3")
                .meaningVi("Tốt, khỏe")
                .lesson(approvedLesson)
                .build());

        pendingWord = vocabularyRepository.save(Vocabulary.builder()
                .word("你")
                .traditional("你")
                .pinyin("nǐ")
                .pinyinNormalized("ni ni3")
                .meaningVi("Bạn, anh, chị")
                .lesson(pendingLesson)
                .needsHumanCheck(true)
                .sourceRef("Giáo trình Hán ngữ Bài 1")
                .build());

        userToken = registerAndGetToken("vocab.user@heyganba.vn", "User Normal");
        adminToken = adminAccessToken("admin@heyganba.vn");
    }

    private String registerAndGetToken(String email, String name) throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email(email)
                .password("Password123!")
                .fullName(name)
                .build();

        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("accessToken").asText();
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    @Test
    @DisplayName("Catalog bài học: User thường chỉ thấy bài có từ đã duyệt; Admin thấy cả bài pending")
    void getLessons_filtersPendingForRegularUser() throws Exception {
        // User thường chỉ thấy bài approvedLesson (wordCount = 1), pendingLesson không xuất hiện vì wordCount = 0
        mockMvc.perform(get("/vocabulary/lessons").header("Authorization", bearer(userToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].slug", is("lesson-approved")))
                .andExpect(jsonPath("$.data[0].wordCount", is(1)));

        // Khách vãng lai cũng chỉ thấy bài approved
        mockMvc.perform(get("/vocabulary/lessons"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].slug", is("lesson-approved")));

        // Admin thấy cả 2 bài học
        mockMvc.perform(get("/vocabulary/lessons").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[1].slug", is("intro-greetings")))
                .andExpect(jsonPath("$.data[1].wordCount", is(1)));
    }

    @Test
    @DisplayName("Từ theo bài: User thường bị lọc từ pending trong bài; Admin xem đủ từ")
    void getLessonWords_filtersPendingWords() throws Exception {
        // User thường mở bài pending -> danh sách rỗng (không rò rỉ nội dung chờ duyệt)
        mockMvc.perform(get("/vocabulary/lessons/intro-greetings/words").header("Authorization", bearer(userToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));

        // Admin mở bài pending -> thấy đầy đủ từ vựng
        mockMvc.perform(get("/vocabulary/lessons/intro-greetings/words").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].word", is("你")))
                .andExpect(jsonPath("$.data[0].pinyin", is("nǐ")));
    }

    @Test
    @DisplayName("Chi tiết từ theo ID: Từ pending trả 404 với user thường; 200 với Admin")
    void getWordById_requiresVisibleStatus() throws Exception {
        // User thường gọi từ pending -> 404
        mockMvc.perform(get("/vocabulary/" + pendingWord.getId()).header("Authorization", bearer(userToken)))
                .andExpect(status().isNotFound());

        // User thường gọi từ approved -> 200
        mockMvc.perform(get("/vocabulary/" + approvedWord.getId()).header("Authorization", bearer(userToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.word", is("好")));

        // Admin gọi từ pending -> 200
        mockMvc.perform(get("/vocabulary/" + pendingWord.getId()).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.word", is("你")));
    }

    @Test
    @DisplayName("Lưu từ giáo trình M2.1 vào Notebook: Lưu từ approved, đọc lại thành công, chặn ghi trùng và chặn lưu từ pending")
    void saveCurriculumWordToNotebook_andReadBack() throws Exception {
        // 1. Tạo sổ từ mới cho học viên
        String createRes = mockMvc.perform(post("/notebooks")
                        .header("Authorization", bearer(userToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Sổ Từ Khóa Học M2.1\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long notebookId = objectMapper.readTree(createRes).at("/data/id").asLong();

        // 2. Lưu từ giáo trình đã duyệt (approvedWord) vào sổ
        mockMvc.perform(post("/notebooks/" + notebookId + "/items")
                        .header("Authorization", bearer(userToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vocabularyId\":" + approvedWord.getId() + "}"))
                .andExpect(status().isOk());

        // 3. Đọc lại sổ từ và xác nhận từ giáo trình đã được lưu đúng
        mockMvc.perform(get("/notebooks/" + notebookId)
                        .header("Authorization", bearer(userToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items", hasSize(1)))
                .andExpect(jsonPath("$.data.items[0].vocabularyId", is(approvedWord.getId().intValue())))
                .andExpect(jsonPath("$.data.items[0].word", is("好")));

        // 4. Lưu lại từ đã có -> trả 400 Bad Request (chống ghi trùng lặp)
        mockMvc.perform(post("/notebooks/" + notebookId + "/items")
                        .header("Authorization", bearer(userToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vocabularyId\":" + approvedWord.getId() + "}"))
                .andExpect(status().isBadRequest());

        // 5. Cố tình lưu từ pending -> 404 Not Found (học viên không thể nạp từ pending vào sổ)
        mockMvc.perform(post("/notebooks/" + notebookId + "/items")
                        .header("Authorization", bearer(userToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vocabularyId\":" + pendingWord.getId() + "}"))
                .andExpect(status().isNotFound());
    }
}
