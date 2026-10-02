package com.heyganba;

import com.heyganba.dto.notebook.CreateNotebookRequest;
import com.heyganba.dto.notebook.NotebookPracticeResultRequest;
import com.heyganba.dto.notebook.VocabNotebookResponse;
import com.heyganba.model.entity.User;
import com.heyganba.model.entity.VocabNotebook;
import com.heyganba.model.entity.VocabNotebookItem;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.repository.UserRepository;
import com.heyganba.repository.VocabNotebookItemRepository;
import com.heyganba.repository.VocabNotebookRepository;
import com.heyganba.repository.VocabularyRepository;
import com.heyganba.service.ExpService;
import com.heyganba.service.StudyActivityService;
import com.heyganba.service.VocabNotebookService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VocabNotebookServiceTest {

    @Mock
    private VocabNotebookRepository notebookRepository;
    @Mock
    private VocabNotebookItemRepository itemRepository;
    @Mock
    private VocabularyRepository vocabularyRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private StudyActivityService studyActivityService;
    @Mock
    private ExpService expService;

    private VocabNotebookService notebookService;
    private User testUser;

    @BeforeEach
    void setUp() {
        notebookService = new VocabNotebookService(
                notebookRepository,
                itemRepository,
                vocabularyRepository,
                userRepository,
                studyActivityService,
                expService
        );
        testUser = User.builder().id(10L).email("student@heyganba.vn").build();
    }

    @Test
    @DisplayName("Tạo sổ từ vựng cá nhân thành công")
    void createNotebook_success() {
        CreateNotebookRequest req = new CreateNotebookRequest("Từ vựng N5 hay quên", "Ghi chú các từ khó nhớ");

        when(userRepository.getReferenceById(10L)).thenReturn(testUser);
        when(notebookRepository.save(any(VocabNotebook.class))).thenAnswer(invocation -> {
            VocabNotebook n = invocation.getArgument(0);
            n.setId(101L);
            return n;
        });

        VocabNotebookResponse response = notebookService.createNotebook(10L, req);

        assertThat(response.id()).isEqualTo(101L);
        assertThat(response.title()).isEqualTo("Từ vựng N5 hay quên");
        assertThat(response.isPublicSample()).isFalse();
    }

    @Test
    @DisplayName("Sao chép nhóm từ mẫu thành công vào kho cá nhân của user")
    void cloneSampleNotebook_success() {
        Vocabulary v1 = Vocabulary.builder().id(1L).word("私").reading("わたし").meaning("tôi").build();
        VocabNotebook sample = VocabNotebook.builder()
                .id(99L)
                .title("50 từ vựng cơ bản")
                .description("Mẫu từ vựng khởi đầu")
                .isPublicSample(true)
                .items(new ArrayList<>(List.of(
                        VocabNotebookItem.builder().id(1L).vocabulary(v1).customNote("Quan trọng").build()
                )))
                .build();

        when(notebookRepository.findById(99L)).thenReturn(Optional.of(sample));
        when(userRepository.getReferenceById(10L)).thenReturn(testUser);
        when(notebookRepository.save(any(VocabNotebook.class))).thenAnswer(invocation -> {
            VocabNotebook n = invocation.getArgument(0);
            n.setId(202L);
            return n;
        });

        VocabNotebookResponse response = notebookService.cloneSampleNotebook(10L, 99L);

        assertThat(response.id()).isEqualTo(202L);
        assertThat(response.title()).contains("(Bản sao)");
        verify(itemRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("Luyện tập sổ từ vựng: ghi nhận StudyActivity và cộng EXP, KHÔNG can thiệp lịch due-date của SRS")
    void recordPracticeResult_doesNotAlterSrsSchedule() {
        VocabNotebook notebook = VocabNotebook.builder()
                .id(101L)
                .title("Luyện tập nhóm từ")
                .user(testUser)
                .build();

        when(notebookRepository.findByIdAndAccessible(101L, 10L)).thenReturn(Optional.of(notebook));
        when(expService.getExerciseCorrectExp()).thenReturn(10);
        when(userRepository.getReferenceById(10L)).thenReturn(testUser);

        NotebookPracticeResultRequest req = new NotebookPracticeResultRequest(8, 10);
        VocabNotebookService.PracticeResultResponse response = notebookService.recordPracticeResult(10L, 101L, req);

        assertThat(response.correctCount()).isEqualTo(8);
        assertThat(response.totalCount()).isEqualTo(10);
        assertThat(response.expEarned()).isEqualTo(80); // 8 * 10 = 80 EXP
        assertThat(response.note()).contains("Lịch ôn tập SRS chính không bị ảnh hưởng");

        // Xác nhận gọi studyActivityService với source NOTEBOOK
        verify(studyActivityService).record(eq(testUser), eq("NOTEBOOK"), eq(10), eq(8), any(Instant.class));

        // Tuyệt đối không có bất kỳ tương tác nào tới srs_reviews hay srsEngine
        verifyNoInteractions(vocabularyRepository);
    }
}
