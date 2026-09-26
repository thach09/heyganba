-- =========================================================
-- V1: Core Schema for HeyGanba Platform
-- =========================================================

-- 1. Roles table
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

-- 2. Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role_id BIGINT NOT NULL REFERENCES roles(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- 3. Lessons table (Dekiru Nihongo JPD113 / JPD123)
CREATE TABLE IF NOT EXISTS lessons (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    curriculum_level VARCHAR(20) NOT NULL,
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lessons_slug ON lessons(slug);

-- 4. Kana table
CREATE TABLE IF NOT EXISTS kana (
    id BIGSERIAL PRIMARY KEY,
    character VARCHAR(10) NOT NULL,
    romaji VARCHAR(20) NOT NULL,
    kana_type VARCHAR(20) NOT NULL, -- HIRAGANA / KATAKANA
    kana_group VARCHAR(30) NOT NULL, -- GOJUON / DAKUTEN / HANDAKUTEN / YOON / SOKUON / CHOON
    audio_url VARCHAR(500),
    stroke_order_svg TEXT,
    is_particle_exception BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Radicals table
CREATE TABLE IF NOT EXISTS radicals (
    id BIGSERIAL PRIMARY KEY,
    radical VARCHAR(10) NOT NULL,
    stroke_count INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    meaning VARCHAR(100) NOT NULL
);

-- 6. Kanji table
CREATE TABLE IF NOT EXISTS kanji (
    id BIGSERIAL PRIMARY KEY,
    character VARCHAR(10) NOT NULL,
    stroke_count INT NOT NULL,
    onyomi VARCHAR(100),
    kunyomi VARCHAR(100),
    sino_vietnamese VARCHAR(100) NOT NULL,
    meaning TEXT NOT NULL,
    mnemonic TEXT,
    lesson_id BIGINT REFERENCES lessons(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kanji_lesson ON kanji(lesson_id);

-- 7. Kanji-Radical association table
CREATE TABLE IF NOT EXISTS kanji_radicals (
    kanji_id BIGINT NOT NULL REFERENCES kanji(id) ON DELETE CASCADE,
    radical_id BIGINT NOT NULL REFERENCES radicals(id) ON DELETE CASCADE,
    PRIMARY KEY (kanji_id, radical_id)
);

-- 8. Vocabulary table
CREATE TABLE IF NOT EXISTS vocabulary (
    id BIGSERIAL PRIMARY KEY,
    word VARCHAR(100) NOT NULL,
    reading VARCHAR(100) NOT NULL,
    meaning TEXT NOT NULL,
    sino_vietnamese VARCHAR(100),
    audio_url VARCHAR(500),
    example_sentence TEXT,
    example_reading TEXT,
    example_meaning TEXT,
    lesson_id BIGINT REFERENCES lessons(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vocab_lesson ON vocabulary(lesson_id);

-- 9. Grammar Rules table
CREATE TABLE IF NOT EXISTS grammar_rules (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    structure TEXT NOT NULL,
    explanation TEXT NOT NULL,
    notes TEXT,
    original_number INT,
    lesson_id BIGINT REFERENCES lessons(id) ON DELETE SET NULL,
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_grammar_lesson ON grammar_rules(lesson_id);

-- 10. Grammar Exercises table
CREATE TABLE IF NOT EXISTS grammar_exercises (
    id BIGSERIAL PRIMARY KEY,
    grammar_rule_id BIGINT REFERENCES grammar_rules(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    audio_url VARCHAR(500),
    options_json TEXT NOT NULL,
    correct_answer VARCHAR(255) NOT NULL,
    explanation TEXT,
    is_common_mistake BOOLEAN NOT NULL DEFAULT FALSE,
    mistake_category VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. SRS Reviews table
CREATE TABLE IF NOT EXISTS srs_reviews (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vocabulary_id BIGINT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
    interval_days INT NOT NULL DEFAULT 0,
    repetitions INT NOT NULL DEFAULT 0,
    ease_factor DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    due_date TIMESTAMPTZ NOT NULL,
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_vocab UNIQUE (user_id, vocabulary_id)
);

-- Crucial index for finding today's due reviews efficiently
CREATE INDEX idx_srs_user_due ON srs_reviews(user_id, due_date);

-- 12. Streaks table
CREATE TABLE IF NOT EXISTS streaks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_active_date DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. Audit logs table (for Admin modifications)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id BIGINT,
    action VARCHAR(20) NOT NULL,
    before_value TEXT,
    after_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
