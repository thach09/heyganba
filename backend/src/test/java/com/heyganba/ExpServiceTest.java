package com.heyganba;

import com.heyganba.config.ExpConfig;
import com.heyganba.dto.progress.UserExpResponse;
import com.heyganba.model.entity.ExamResult;
import com.heyganba.model.entity.StudyActivity;
import com.heyganba.repository.ExamResultRepository;
import com.heyganba.repository.StudyActivityRepository;
import com.heyganba.service.ExpService;
import com.heyganba.service.StudyActivityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExpServiceTest {

    @Mock
    private StudyActivityRepository studyActivityRepository;

    @Mock
    private ExamResultRepository examResultRepository;

    private ExpConfig expConfig;
    private ExpService expService;

    @BeforeEach
    void setUp() {
        expConfig = new ExpConfig();
        expConfig.setExerciseCorrect(10);
        expConfig.setSrsSession(50);
        expConfig.setExamBase(100);
        expService = new ExpService(expConfig, studyActivityRepository, examResultRepository);
    }

    @Test
    @DisplayName("Tính toán EXP chuẩn theo cấu hình: 10 EXP/câu đúng, 50 EXP/phiên SRS, 100 EXP * hệ số/đề thi")
    void calculateUserExp_standardFormula() {
        Long userId = 1L;
        com.heyganba.model.entity.User user = com.heyganba.model.entity.User.builder()
                .id(userId)
                .email("test@example.com")
                .build();

        // 1 activity làm đúng 12 câu ngữ pháp
        StudyActivity grammarActivity = StudyActivity.builder()
                .user(user)
                .source(StudyActivityService.SOURCE_GRAMMAR)
                .correctCount(12)
                .itemCount(15)
                .build();

        // 1 activity SRS học 20 từ (2 sessions -> 2 * 50 = 100 EXP)
        StudyActivity srsActivity = StudyActivity.builder()
                .user(user)
                .source(StudyActivityService.SOURCE_FLASHCARD)
                .itemCount(20)
                .correctCount(18)
                .build();

        when(studyActivityRepository.findByUserId(userId)).thenReturn(List.of(grammarActivity, srsActivity));

        // 1 đề thi đạt 80% điểm -> 100 * 0.8 = 80 EXP
        ExamResult exam = ExamResult.builder()
                .user(user)
                .scorePercent(80.0)
                .build();

        when(examResultRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(exam));

        UserExpResponse response = expService.calculateUserExp(userId);

        // Exercise: 12 * 10 = 120
        // SRS: 2 * 50 = 100
        // Exam: 80
        // Total = 300 EXP -> Level 1 (0-999), expIntoLevel = 300, rankTier = 1 ("Sơ khởi")
        assertThat(response.totalExp()).isEqualTo(300L);
        assertThat(response.level()).isEqualTo(1);
        assertThat(response.expIntoLevel()).isEqualTo(300L);
        assertThat(response.rankTier()).isEqualTo(1);
        assertThat(response.rankName()).isEqualTo("Sơ khởi");
        assertThat(response.config().exerciseCorrect()).isEqualTo(10);
        assertThat(response.config().srsSession()).isEqualTo(50);
        assertThat(response.config().examBase()).isEqualTo(100);
    }

    @Test
    @DisplayName("Thay đổi config EXP được cập nhật ngay vào kết quả mà không cần sửa code")
    void calculateUserExp_customConfig() {
        Long userId = 2L;
        com.heyganba.model.entity.User user = com.heyganba.model.entity.User.builder()
                .id(userId)
                .email("test2@example.com")
                .build();

        expConfig.setExerciseCorrect(25);
        expConfig.setSrsSession(100);
        expConfig.setExamBase(200);

        StudyActivity grammarActivity = StudyActivity.builder()
                .user(user)
                .source(StudyActivityService.SOURCE_GRAMMAR)
                .correctCount(40)
                .itemCount(40)
                .build();

        when(studyActivityRepository.findByUserId(userId)).thenReturn(List.of(grammarActivity));
        when(examResultRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of());

        UserExpResponse response = expService.calculateUserExp(userId);

        // 40 * 25 = 1000 EXP -> Level 2 (1000-1999), rankTier = 1, expIntoLevel = 0
        assertThat(response.totalExp()).isEqualTo(1000L);
        assertThat(response.level()).isEqualTo(2);
        assertThat(response.expIntoLevel()).isEqualTo(0L);
        assertThat(response.rankTier()).isEqualTo(1);
        assertThat(response.config().exerciseCorrect()).isEqualTo(25);
    }

    @Test void singleReviewsDoNotEachGrantSessionExpAndNotebookExpIsCounted() {
        var activity = StudyActivity.builder().source("FLASHCARD").itemCount(1).correctCount(1).build();
        when(studyActivityRepository.findByUserId(3L)).thenReturn(java.util.Collections.nCopies(9, activity));
        when(examResultRepository.findByUserIdOrderByCreatedAtDesc(3L)).thenReturn(List.of());
        assertThat(expService.calculateUserExp(3L).totalExp()).isZero();
        var activities = new java.util.ArrayList<>(java.util.Collections.nCopies(10, activity));
        activities.add(StudyActivity.builder().source("NOTEBOOK").itemCount(3).correctCount(2).build());
        when(studyActivityRepository.findByUserId(3L)).thenReturn(activities);
        assertThat(expService.calculateUserExp(3L).totalExp()).isEqualTo(70);
    }
}
