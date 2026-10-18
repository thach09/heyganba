package com.heyganba;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.heyganba.model.entity.*;
import com.heyganba.model.enums.ReviewStatus;
import com.heyganba.repository.*;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class HskCurriculumExamApiTest extends ContentApiTestBase {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired MockExamPresetRepository presets;

    private void seed(int level) {
        presets.deleteAll();
        presets.save(MockExamPreset.builder().hskLevel(level).maximumScore(level<=2?200:300)
                .passingScore(level<=2?120:180).durationMinutes(20).sectionsJson("{}")
                .reviewStatus(ReviewStatus.APPROVED).needsHumanCheck(false).build());
        Lesson lesson=lessonRepository.save(Lesson.builder().slug("hsk-test-"+level).title("HSK "+level)
                .curriculumLevel("HSK "+level).orderIndex(level).build());
        for(int i=0;i<12;i++) persistApprovedVocabulary(Vocabulary.builder().word("词"+level+"-"+i)
                .pinyin("cí").pinyinNormalized("ci ci2").hanViet("từ").meaningVi("Nghĩa "+level+"-"+i)
                .hskLevel(level).lesson(lesson).build());
        // Same-level pending data must remain unavailable even to an admin taking an exam.
        vocabularyRepository.save(Vocabulary.builder().word("PENDING").meaningVi("PENDING")
                .hskLevel(level).lesson(lesson).build());
        GrammarRule rule=persistApprovedRule(GrammarRule.builder().title("Rule "+level).structure("S + V")
                .hskLevel(level).explanation("Test rule").orderIndex(1).lesson(lesson).build());
        for(int i=0;i<4;i++) persistApprovedExercise(GrammarExercise.builder().grammarRule(rule)
                .questionText("练习 "+i).optionsJson("[\"A\",\"B\",\"C\",\"D\"]").correctAnswer("A").build());
    }

    @ParameterizedTest @ValueSource(ints={1,2,3,4,5,6})
    void generatesOwnedLevelAndGradesAtCorrectScale(int level) throws Exception {
        seed(level);
        String token=adminAccessToken("hsk-exam@test.invalid");
        JsonNode generated=mapper.readTree(mvc.perform(post("/exam/generate").header("Authorization","Bearer "+token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"hskLevel\":"+level+",\"totalQuestions\":5}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.hskLevel").value(level))
                .andExpect(jsonPath("$.data.maximumScore").value(level<=2?200:300))
                .andReturn().getResponse().getContentAsString()).get("data");
        assertThat(generated.toString()).doesNotContain("correctAnswer", "PENDING", "KANA");
        long id=generated.get("examId").asLong();
        JsonNode stored=mapper.readTree(mockExamRepository.findById(id).orElseThrow().getQuestionsJson());
        Set<String> types=new HashSet<>();List<Map<String,Object>> answers=new ArrayList<>();
        stored.forEach(q -> { types.add(q.get("type").asText()); answers.add(Map.of("index",q.get("index").asInt(),"answer",q.get("correctAnswer").asText())); });
        assertThat(types).containsExactlyInAnyOrderElementsOf(level<=2?List.of("LISTENING","READING"):List.of("LISTENING","READING","GRAMMAR"));
        String payload=mapper.writeValueAsString(Map.of("answers",answers));
        for(int repeat=0;repeat<2;repeat++) mvc.perform(post("/exam/"+id+"/submit").header("Authorization","Bearer "+token)
                .contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scaledScore").value(level<=2?200.0:300.0))
                .andExpect(jsonPath("$.data.passingScore").value(level<=2?120:180));
        mvc.perform(get("/exam/history").header("Authorization","Bearer "+token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].maximumScore").value(level<=2?200:300));
        mvc.perform(get("/exam/"+id).header("Authorization","Bearer "+adminAccessToken("other@test.invalid")))
                .andExpect(status().isNotFound());
    }

    @Test void sectionScoresHaveEqualWeightAndDraftPresetIsRejected() throws Exception {
        seed(6);String token=adminAccessToken("weighted@test.invalid");
        JsonNode generated=mapper.readTree(mvc.perform(post("/exam/generate").header("Authorization","Bearer "+token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"hskLevel\":6,\"totalQuestions\":5}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("data");
        long id=generated.get("examId").asLong();
        List<Map<String,Object>> answers=new ArrayList<>();
        mapper.readTree(mockExamRepository.findById(id).orElseThrow().getQuestionsJson()).forEach(q ->
                answers.add(Map.of("index",q.get("index").asInt(),"answer",q.get("type").asText().equals("GRAMMAR")?"wrong":q.get("correctAnswer").asText())));
        mvc.perform(post("/exam/"+id+"/submit").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("answers",answers))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.correctCount").value(4))
                .andExpect(jsonPath("$.data.scaledScore").value(200.0));
        var preset=presets.findAll().getFirst();preset.setReviewStatus(ReviewStatus.PENDING_REVIEW);presets.save(preset);
        mvc.perform(post("/exam/generate").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"hskLevel\":6,\"totalQuestions\":5}")).andExpect(status().isBadRequest());
        mvc.perform(post("/exam/generate").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"hskLevel\":7}")).andExpect(status().isBadRequest());
    }

    @Test void hanziFilterIsAppliedBeforeReturningTheSelectedLevel() throws Exception {
        persistApprovedKanji(Kanji.builder().character("人").hskLevel(1).hanViet("nhân").meaningVi("người").build());
        persistApprovedKanji(Kanji.builder().character("履").hskLevel(6).hanViet("lý").meaningVi("thực hiện").build());
        String token=adminAccessToken("hanzi-level@test.invalid");
        mvc.perform(get("/hanzi").param("hsk","6").header("Authorization","Bearer "+token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].character").value("履"));
        mvc.perform(get("/hanzi").param("hsk","7").header("Authorization","Bearer "+token))
                .andExpect(status().isBadRequest());
    }
}
