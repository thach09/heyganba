package com.heyganba.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Ngưỡng tính streak trong ngày (quyết định đã chốt):
 *  - Hoàn thành ≥ {@code app.streak.min-srs-reviews} lượt ôn SRS trong ngày, HOẶC
 *  - Hoàn thành 1 "bộ quiz đầy đủ": 1 lượt thi thử đã nộp, HOẶC
 *  - Hoàn thành ≥ {@code app.streak.min-quiz-questions} câu bài tập ngữ pháp trong ngày.
 * Ôn 1 từ đơn lẻ KHÔNG tính là 1 ngày học.
 */
@Component
public class StreakPolicy {

    private final int minSrsReviews;
    private final int minQuizQuestions;

    public StreakPolicy(
            @Value("${app.streak.min-srs-reviews:10}") int minSrsReviews,
            @Value("${app.streak.min-quiz-questions:10}") int minQuizQuestions) {
        this.minSrsReviews = minSrsReviews;
        this.minQuizQuestions = minQuizQuestions;
    }

    public boolean qualifies(int flashcardReviews, int submittedExams, int grammarQuestions) {
        return flashcardReviews >= minSrsReviews
                || submittedExams >= 1
                || grammarQuestions >= minQuizQuestions;
    }

    public int minSrsReviews() {
        return minSrsReviews;
    }

    public int minQuizQuestions() {
        return minQuizQuestions;
    }
}
