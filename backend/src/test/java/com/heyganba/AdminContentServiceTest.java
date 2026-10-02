package com.heyganba;

import com.heyganba.service.AdminContentService;
import com.heyganba.service.AuditLogService;

import com.heyganba.dto.admin.AdminExerciseRequest;
import com.heyganba.dto.admin.AdminKanjiRequest;
import com.heyganba.dto.admin.AdminVocabularyRequest;
import com.heyganba.model.entity.*;
import com.heyganba.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminContentServiceTest {

    @Mock
    private VocabularyRepository vocabularyRepository;
    @Mock
    private KanjiRepository kanjiRepository;
    @Mock
    private GrammarExerciseRepository grammarExerciseRepository;
    @Mock
    private GrammarRuleRepository grammarRuleRepository;
    @Mock
    private LessonRepository lessonRepository;
    @Mock
    private AuditLogService auditLogService;

    private AdminContentService adminContentService;
    private User admin;

    @BeforeEach
    void setUp() {
        adminContentService = new AdminContentService(
                vocabularyRepository,
                kanjiRepository,
                grammarExerciseRepository,
                grammarRuleRepository,
                lessonRepository,
                auditLogService
        );
        admin = User.builder().id(1L).email("admin@heyganba.vn").build();
    }

    @Test
    @DisplayName("Admin tạo từ vựng thành công và ghi nhận audit log")
    void createVocabulary_logsAction() {
        AdminVocabularyRequest req = AdminVocabularyRequest.builder()
                .word("学校")
                .reading("がっこう")
                .meaning("Trường học")
                .sinoVietnamese("HỌC HIỆU")
                .build();

        Vocabulary saved = Vocabulary.builder()
                .id(100L)
                .word("学校")
                .reading("がっこう")
                .meaning("Trường học")
                .build();

        when(vocabularyRepository.save(any(Vocabulary.class))).thenReturn(saved);

        Vocabulary result = adminContentService.createVocabulary(admin, req);

        assertThat(result.getId()).isEqualTo(100L);
        assertThat(result.getWord()).isEqualTo("学校");
        verify(auditLogService).logAction(eq(admin), eq("vocabulary"), eq(100L), eq("CREATE"), isNull(), eq("学校"));
    }

    @Test
    @DisplayName("Admin cập nhật Kanji thành công và ghi nhận audit log")
    void updateKanji_logsAction() {
        Kanji existing = Kanji.builder()
                .id(50L)
                .character("日")
                .strokeCount(4)
                .meaning("mặt trời")
                .build();

        AdminKanjiRequest req = AdminKanjiRequest.builder()
                .character("日")
                .strokeCount(4)
                .meaning("mặt trời, ngày")
                .sinoVietnamese("NHẬT")
                .build();

        when(kanjiRepository.findById(50L)).thenReturn(Optional.of(existing));
        when(kanjiRepository.save(any(Kanji.class))).thenReturn(existing);

        Kanji result = adminContentService.updateKanji(admin, 50L, req);

        assertThat(result.getMeaning()).isEqualTo("mặt trời, ngày");
        verify(auditLogService).logAction(eq(admin), eq("kanji"), eq(50L), eq("UPDATE"), anyString(), anyString());
    }

    @Test
    @DisplayName("Admin xoá bài tập thành công và ghi nhận audit log")
    void deleteExercise_logsAction() {
        GrammarExercise existing = GrammarExercise.builder()
                .id(20L)
                .questionText("テスト問題")
                .build();

        when(grammarExerciseRepository.findById(20L)).thenReturn(Optional.of(existing));

        adminContentService.deleteExercise(admin, 20L);

        verify(grammarExerciseRepository).delete(existing);
        verify(auditLogService).logAction(eq(admin), eq("grammar_exercises"), eq(20L), eq("DELETE"), eq("テスト問題"), isNull());
    }
}
