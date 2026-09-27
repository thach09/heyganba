-- =========================================================
-- V10: Phase 5 — Mock exam, kết quả thi, nhật ký hoạt động học (streak heatmap)
--
-- Ghi chú thiết kế (hướng an toàn, không thêm hạ tầng mới):
--  - Đề thi sinh từ nội dung đã có (grammar_exercises / kana / vocabulary) → không cần seed nội dung mới.
--  - `questions_json` lưu danh sách câu hỏi của đề (server giữ đáp án trong cùng JSON, không trả ra client).
--  - `exam_results.details_json` lưu chi tiết từng câu sau khi chấm để UI review lại.
--  - `study_activities` là dữ liệu nguồn cho streak heatmap (streaks chỉ có tổng hợp, không đủ cho heatmap).
--  - Leaderboard chạy trực tiếp trên PostgreSQL (có index). Khi có Redis managed sẽ thay bằng Sorted Set
--    như roadmap, không phải đổi API.
-- =========================================================

CREATE TABLE IF NOT EXISTS mock_exams (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_questions INT NOT NULL,
    duration_minutes INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS', -- IN_PROGRESS / SUBMITTED
    questions_json TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mock_exams_user_started ON mock_exams(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS exam_results (
    id BIGSERIAL PRIMARY KEY,
    exam_id BIGINT NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    correct_count INT NOT NULL,
    total_count INT NOT NULL,
    score_percent DOUBLE PRECISION NOT NULL,
    duration_seconds INT,
    details_json TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_exam_result_exam UNIQUE (exam_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_results_user_created ON exam_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_results_score ON exam_results(score_percent DESC);

CREATE TABLE IF NOT EXISTS study_activities (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    source VARCHAR(20) NOT NULL, -- FLASHCARD / EXAM / KANA / KANJI / GRAMMAR
    item_count INT NOT NULL DEFAULT 0,
    correct_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_study_activity_user_date_source UNIQUE (user_id, activity_date, source)
);

CREATE INDEX IF NOT EXISTS idx_study_activity_user_date ON study_activities(user_id, activity_date DESC);
