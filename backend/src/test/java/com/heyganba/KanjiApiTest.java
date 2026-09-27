package com.heyganba;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.dto.auth.RegisterRequest;
import com.heyganba.model.entity.Kanji;
import com.heyganba.model.entity.Lesson;
import com.heyganba.model.entity.Radical;
import com.heyganba.model.entity.Role;
import com.heyganba.model.enums.RoleName;
import com.heyganba.repository.KanjiPracticeProgressRepository;
import com.heyganba.repository.KanjiRepository;
import com.heyganba.repository.LessonRepository;
import com.heyganba.repository.RadicalRepository;
import com.heyganba.repository.RoleRepository;
import com.heyganba.repository.StreakRepository;
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

import java.util.Set;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 3 — API kanji: tra cứu theo bài học / bộ thủ / từ khoá, chi tiết kanji,
 * danh sách bộ thủ và lưu tiến độ luyện viết theo đúng user.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class KanjiApiTest extends com.heyganba.support.ContentApiTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private KanjiRepository kanjiRepository;

    @Autowired
    private RadicalRepository radicalRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private KanjiPracticeProgressRepository progressRepository;

    @Autowired
    private com.heyganba.repository.VocabularyRepository vocabularyRepository;

    @Autowired
    private com.heyganba.repository.SrsReviewRepository srsReviewRepository;

    @Autowired
    private StreakRepository streakRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    private Kanji kanjiHon;
    private Radical radicalKi;

    @BeforeEach
    void setUp() {
        // Xoá theo đúng thứ tự phụ thuộc khoá ngoại (progress → srs → kanji/vocabulary → radicals → lessons).
        progressRepository.deleteAll();
        srsReviewRepository.deleteAll();
        kanjiRepository.deleteAll();
        vocabularyRepository.deleteAll();
        radicalRepository.deleteAll();
        streakRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();
        lessonRepository.deleteAll();

        roleRepository.save(Role.builder().name(RoleName.ROLE_ADMIN).description("Admin").build());
        roleRepository.save(Role.builder().name(RoleName.ROLE_USER).description("User").build());

        Lesson lessonB1 = lessonRepository.save(Lesson.builder()
                .slug("jpd113-b1")
                .title("Bài 1 — Chào hỏi")
                .curriculumLevel("JPD113")
                .orderIndex(1)
                .build());

        Lesson lessonB2 = lessonRepository.save(Lesson.builder()
                .slug("jpd113-b2")
                .title("Bài 2 — Đồ vật")
                .curriculumLevel("JPD113")
                .orderIndex(2)
                .build());

        Radical radicalMoku = radicalRepository.save(Radical.builder()
                .radical("木")
                .strokeCount(4)
                .name("ki")
                .meaning("cây, gỗ")
                .build());

        radicalKi = radicalRepository.save(Radical.builder()
                .radical("日")
                .strokeCount(4)
                .name("hi")
                .meaning("mặt trời, ngày")
                .build());

        Radical radicalKuchi = radicalRepository.save(Radical.builder()
                .radical("口")
                .strokeCount(3)
                .name("kuchi")
                .meaning("miệng")
                .build());

        kanjiHon = persistApprovedKanji(Kanji.builder()
                .character("本")
                .strokeCount(5)
                .onyomi("ホン")
                .kunyomi("もと")
                .sinoVietnamese("BẢN")
                .meaning("sách, gốc rễ")
                .mnemonic("Cái cây (木) có vạch chỉ phần gốc → gốc, nguồn")
                .lesson(lessonB1)
                .radicals(Set.of(radicalMoku))
                .build());

        persistApprovedKanji(Kanji.builder()
                .character("日")
                .strokeCount(4)
                .onyomi("ニチ、ジツ")
                .kunyomi("ひ、び")
                .sinoVietnamese("NHẬT")
                .meaning("mặt trời, ngày")
                .mnemonic("Hình vẽ mặt trời")
                .lesson(lessonB1)
                .radicals(Set.of(radicalKi))
                .build());

        persistApprovedKanji(Kanji.builder()
                .character("名")
                .strokeCount(6)
                .onyomi("メイ、ミョウ")
                .kunyomi("な")
                .sinoVietnamese("DANH")
                .meaning("tên")
                .mnemonic("Trời tối (夕) nên phải mở miệng (口) gọi tên nhau")
                .lesson(lessonB2)
                .radicals(Set.of(radicalKuchi))
                .build());
    }

    private String registerAndGetToken(String email) throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email(email)
                .password("Password123!")
                .fullName("Kanji Tester")
                .build();

        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("accessToken").asText();
    }

    @Test
    @DisplayName("GET /kanji trả toàn bộ kanji kèm bộ thủ và bài học")
    void listKanji() throws Exception {
        String token = registerAndGetToken("kanji.list@heyganba.vn");

        mockMvc.perform(get("/kanji").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(3)))
                .andExpect(jsonPath("$.data[0].character", is("本")))
                .andExpect(jsonPath("$.data[0].sinoVietnamese", is("BẢN")))
                .andExpect(jsonPath("$.data[0].lessonSlug", is("jpd113-b1")))
                .andExpect(jsonPath("$.data[0].radicals", hasSize(1)))
                .andExpect(jsonPath("$.data[0].radicals[0].radical", is("木")))
                .andExpect(jsonPath("$.data[0].practiceCount", is(0)));
    }

    @Test
    @DisplayName("GET /kanji lọc theo bài học (lesson slug)")
    void filterByLesson() throws Exception {
        String token = registerAndGetToken("kanji.lesson@heyganba.vn");

        mockMvc.perform(get("/kanji")
                        .param("lesson", "jpd113-b2")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].character", is("名")));
    }

    @Test
    @DisplayName("GET /kanji lọc theo bộ thủ")
    void filterByRadical() throws Exception {
        String token = registerAndGetToken("kanji.radical@heyganba.vn");

        mockMvc.perform(get("/kanji")
                        .param("radical", radicalKi.getId().toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].character", is("日")));
    }

    @Test
    @DisplayName("GET /kanji tìm theo nghĩa tiếng Việt và Hán Việt (không phân biệt hoa thường)")
    void searchKanji() throws Exception {
        String token = registerAndGetToken("kanji.search@heyganba.vn");

        mockMvc.perform(get("/kanji")
                        .param("search", "gốc")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].character", is("本")));

        mockMvc.perform(get("/kanji")
                        .param("search", "danh")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].character", is("名")));
    }

    @Test
    @DisplayName("GET /kanji/{id} trả chi tiết đầy đủ, id lạ trả 404")
    void kanjiDetail() throws Exception {
        String token = registerAndGetToken("kanji.detail@heyganba.vn");

        mockMvc.perform(get("/kanji/" + kanjiHon.getId()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.strokeCount", is(5)))
                .andExpect(jsonPath("$.data.onyomi", is("ホン")))
                .andExpect(jsonPath("$.data.kunyomi", is("もと")))
                .andExpect(jsonPath("$.data.mnemonic", is("Cái cây (木) có vạch chỉ phần gốc → gốc, nguồn")));

        mockMvc.perform(get("/kanji/999999").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", is("NOT_FOUND")));
    }

    @Test
    @DisplayName("GET /radicals trả danh sách bộ thủ sắp theo số nét")
    void listRadicals() throws Exception {
        String token = registerAndGetToken("kanji.radicals@heyganba.vn");

        mockMvc.perform(get("/radicals").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(3)))
                .andExpect(jsonPath("$.data[0].radical", is("口")))
                .andExpect(jsonPath("$.data[0].meaning", is("miệng")));

        mockMvc.perform(get("/radicals")
                        .param("id", radicalKi.getId().toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].radical", is("日")));
    }

    @Test
    @DisplayName("POST /kanji/{id}/progress: server tự tăng số lần luyện và lưu riêng theo user")
    void recordPracticeIncrementsPerUser() throws Exception {
        String tokenA = registerAndGetToken("kanji.practice.a@heyganba.vn");
        String tokenB = registerAndGetToken("kanji.practice.b@heyganba.vn");

        mockMvc.perform(post("/kanji/" + kanjiHon.getId() + "/progress")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.practiceCount", is(1)))
                .andExpect(jsonPath("$.data.lastPracticedAt").exists());

        mockMvc.perform(post("/kanji/" + kanjiHon.getId() + "/progress")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.practiceCount", is(2)));

        mockMvc.perform(post("/kanji/" + kanjiHon.getId() + "/progress")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.practiceCount", is(1)));

        mockMvc.perform(get("/kanji/" + kanjiHon.getId()).header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.practiceCount", is(2)));

        mockMvc.perform(get("/kanji/" + kanjiHon.getId()).header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.practiceCount", is(1)));
    }

    @Test
    @DisplayName("POST /kanji/{id}/progress với kanji không tồn tại trả 404")
    void recordPracticeUnknownKanji() throws Exception {
        String token = registerAndGetToken("kanji.practice404@heyganba.vn");

        mockMvc.perform(post("/kanji/999999/progress").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", is("NOT_FOUND")));
    }

    @Test
    @DisplayName("Anonymous không gọi được API kanji (401)")
    void anonymousIsRejected() throws Exception {
        mockMvc.perform(get("/kanji"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/radicals"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/kanji/1/progress"))
                .andExpect(status().isUnauthorized());
    }
}
