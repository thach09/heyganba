-- =========================================================
-- V1: Clean Chinese Learning Platform Schema
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
    class_code VARCHAR(50),
    two_factor_secret VARCHAR(255),
    is_two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    token_version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. Lessons table (HSK Levels & Lessons)
CREATE TABLE IF NOT EXISTS lessons (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    curriculum_level VARCHAR(20) NOT NULL,
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lessons_slug ON lessons(slug);

-- 4. Radicals table
CREATE TABLE IF NOT EXISTS radicals (
    id BIGSERIAL PRIMARY KEY,
    radical VARCHAR(10) NOT NULL,
    stroke_count INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    meaning VARCHAR(100) NOT NULL
);

-- 5. Hanzi (Chinese Characters) table
CREATE TABLE IF NOT EXISTS hanzi (
    id BIGSERIAL PRIMARY KEY,
    character VARCHAR(10) UNIQUE NOT NULL,
    traditional VARCHAR(10),
    pinyin VARCHAR(50) NOT NULL DEFAULT '',
    han_viet VARCHAR(100) NOT NULL DEFAULT '',
    radical VARCHAR(20),
    stroke_count INT,
    hsk_level INT DEFAULT 1,
    meaning_vi TEXT NOT NULL DEFAULT '',
    decomposition VARCHAR(100),
    example_words_json TEXT,
    lesson_id BIGINT REFERENCES lessons(id) ON DELETE SET NULL,
    review_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    needs_human_check BOOLEAN NOT NULL DEFAULT FALSE,
    source_ref VARCHAR(160),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hanzi_char ON hanzi(character);
CREATE INDEX IF NOT EXISTS idx_hanzi_hsk ON hanzi(hsk_level);

-- 6. Hanzi-Radical association table
CREATE TABLE IF NOT EXISTS kanji_radicals (
    kanji_id BIGINT NOT NULL REFERENCES hanzi(id) ON DELETE CASCADE,
    radical_id BIGINT NOT NULL REFERENCES radicals(id) ON DELETE CASCADE,
    PRIMARY KEY (kanji_id, radical_id)
);

-- 7. Vocabulary table
CREATE TABLE IF NOT EXISTS vocabulary (
    id BIGSERIAL PRIMARY KEY,
    word VARCHAR(50) NOT NULL,
    traditional VARCHAR(50),
    pinyin VARCHAR(100) NOT NULL DEFAULT '',
    pinyin_normalized VARCHAR(100) NOT NULL DEFAULT '',
    han_viet VARCHAR(100) NOT NULL DEFAULT '',
    part_of_speech VARCHAR(30),
    meaning_vi TEXT NOT NULL DEFAULT '',
    hsk_level INT DEFAULT 1,
    lesson_number INT DEFAULT 1,
    example_zh TEXT,
    example_pinyin TEXT,
    example_vi TEXT,
    lesson_id BIGINT REFERENCES lessons(id) ON DELETE SET NULL,
    audio_url VARCHAR(500),
    reading VARCHAR(100),
    meaning TEXT,
    sino_vietnamese VARCHAR(100),
    example_sentence TEXT,
    example_reading TEXT,
    example_meaning TEXT,
    dictionary_entry_id BIGINT,
    review_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    needs_human_check BOOLEAN NOT NULL DEFAULT FALSE,
    source_ref VARCHAR(160),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vocab_word ON vocabulary(word);
CREATE INDEX IF NOT EXISTS idx_vocab_pinyin_norm ON vocabulary(pinyin_normalized);
CREATE INDEX IF NOT EXISTS idx_vocab_hsk ON vocabulary(hsk_level);
CREATE INDEX IF NOT EXISTS idx_vocab_lesson_num ON vocabulary(lesson_number);

-- 8. Grammar Rules table
CREATE TABLE IF NOT EXISTS grammar_rules (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    structure TEXT NOT NULL,
    hsk_level INT DEFAULT 1,
    explanation_vi TEXT DEFAULT '',
    examples_json TEXT NOT NULL DEFAULT '[]',
    exercises_json TEXT DEFAULT '[]',
    explanation TEXT,
    notes TEXT,
    original_number INT,
    source_ref VARCHAR(50),
    lesson_id BIGINT REFERENCES lessons(id) ON DELETE SET NULL,
    order_index INT NOT NULL DEFAULT 1,
    review_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_grammar_hsk ON grammar_rules(hsk_level);

-- 9. Grammar Exercises table (Individual interactive questions)
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
    review_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    needs_human_check BOOLEAN NOT NULL DEFAULT FALSE,
    source_ref VARCHAR(160),
    review_note VARCHAR(400),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Reading Passages table
CREATE TABLE IF NOT EXISTS reading_passages (
    id BIGSERIAL PRIMARY KEY,
    lesson_id BIGINT REFERENCES lessons(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    passage_text TEXT NOT NULL,
    translation_text TEXT,
    vocabulary_notes TEXT,
    questions_json TEXT NOT NULL,
    review_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. Character Mastery table
CREATE TABLE IF NOT EXISTS character_mastery (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL, -- 'PINYIN', 'HANZI', 'VOCAB'
    target_key VARCHAR(50) NOT NULL,
    mastery_score INT DEFAULT 0,
    practice_count INT DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_mastery_target UNIQUE (user_id, target_type, target_key)
);
CREATE INDEX IF NOT EXISTS idx_char_mastery_user ON character_mastery(user_id);

-- 12. SRS Reviews table
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
CREATE INDEX IF NOT EXISTS idx_srs_user_due ON srs_reviews(user_id, due_date);

-- 13. Streaks table
CREATE TABLE IF NOT EXISTS streaks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_active_date DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. Study Activities (Activity logs) table
CREATE TABLE IF NOT EXISTS study_activities (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    source VARCHAR(20) NOT NULL, -- 'FLASHCARD', 'EXAM', 'GRAMMAR', 'PINYIN', 'HANZI', 'VOCAB'
    item_count INT NOT NULL DEFAULT 0,
    correct_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_study_activity_user_date_source UNIQUE (user_id, activity_date, source)
);
CREATE INDEX IF NOT EXISTS idx_activities_user_date ON study_activities(user_id, activity_date);

-- 15. Audit logs table (for Admin modifications)
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

-- 16. Revoked tokens table
CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti VARCHAR(64) PRIMARY KEY,
    token_id VARCHAR(64),
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    revocation_type VARCHAR(32),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at);

-- 17. TTS Audio cache table
CREATE TABLE IF NOT EXISTS tts_audio (
    id BIGSERIAL PRIMARY KEY,
    cache_key VARCHAR(80) NOT NULL UNIQUE,
    kana_text VARCHAR(120) NOT NULL,
    text VARCHAR(120),
    content_type VARCHAR(40) NOT NULL DEFAULT 'audio/mpeg',
    audio_bytes BYTEA,
    public_url VARCHAR(500),
    storage_kind VARCHAR(20) NOT NULL DEFAULT 'db',
    source VARCHAR(40) NOT NULL DEFAULT 'google-translate-tts',
    file_size_bytes INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 18. Notebooks tables
CREATE TABLE IF NOT EXISTS vocab_notebooks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    name VARCHAR(200),
    description TEXT,
    is_public_sample BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vocab_notebook_items (
    id BIGSERIAL PRIMARY KEY,
    notebook_id BIGINT NOT NULL REFERENCES vocab_notebooks(id) ON DELETE CASCADE,
    vocabulary_id BIGINT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
    custom_note TEXT,
    personal_note TEXT,
    practice_count INT NOT NULL DEFAULT 0,
    correct_count INT NOT NULL DEFAULT 0,
    last_practiced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_notebook_vocab UNIQUE (notebook_id, vocabulary_id)
);

CREATE TABLE IF NOT EXISTS notebook_practice_sessions (
    id UUID PRIMARY KEY,
    notebook_id BIGINT NOT NULL REFERENCES vocab_notebooks(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    correct_count INT NOT NULL DEFAULT 0,
    total_count INT NOT NULL DEFAULT 0,
    exp_earned INT NOT NULL DEFAULT 0,
    mode VARCHAR(20),
    item_count INT DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 19. Mock exams and results
CREATE TABLE IF NOT EXISTS mock_exams (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_questions INT NOT NULL,
    duration_minutes INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    questions_json TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

-- 20. Product analytics, learning attempts, and receipts
CREATE TABLE IF NOT EXISTS product_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name VARCHAR(40) NOT NULL,
    event_type VARCHAR(64),
    module VARCHAR(16) NOT NULL,
    event_key UUID NOT NULL,
    session_id VARCHAR(64),
    ip_hash VARCHAR(64),
    payload_json TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_event_key UNIQUE (user_id, event_name, event_key)
);

CREATE TABLE IF NOT EXISTS learning_attempts (
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contract_version INT NOT NULL DEFAULT 1,
    activity_type VARCHAR(24) NOT NULL,
    content_ref VARCHAR(64) NOT NULL,
    skill_ref VARCHAR(64),
    result VARCHAR(16) NOT NULL,
    module VARCHAR(16) NOT NULL,
    item_id BIGINT,
    target_key VARCHAR(50),
    is_correct BOOLEAN,
    duration_ms INT,
    details_json TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    attempted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning_mutation_receipts (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation VARCHAR(16) NOT NULL,
    attempt_id UUID NOT NULL,
    content_id BIGINT NOT NULL,
    request_value VARCHAR(200) NOT NULL,
    response_json TEXT NOT NULL,
    receipt_key VARCHAR(64),
    mutation_type VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, operation, attempt_id)
);

CREATE TABLE IF NOT EXISTS user_learning_preferences (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    daily_study_minutes INT,
    reminder_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_time TIME,
    pinyin_mode VARCHAR(20) DEFAULT 'TONE_MARKS',
    audio_speed VARCHAR(20) DEFAULT 'NORMAL',
    daily_goal_minutes INT DEFAULT 15,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 21. Dictionary entries table (for catalog search)
CREATE TABLE IF NOT EXISTS dictionary_entries (
    id BIGINT PRIMARY KEY,
    word VARCHAR(100) NOT NULL,
    reading VARCHAR(100) NOT NULL,
    meaning TEXT NOT NULL,
    search_text TEXT NOT NULL,
    vietnamese_meaning TEXT,
    vietnamese_search_text TEXT,
    vietnamese_status VARCHAR(10) NOT NULL DEFAULT 'NONE',
    common_rank INT NOT NULL DEFAULT 1000,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 22. Kanji practice progress
CREATE TABLE IF NOT EXISTS kanji_practice_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kanji_id BIGINT NOT NULL REFERENCES hanzi(id) ON DELETE CASCADE,
    practice_count INT NOT NULL DEFAULT 0,
    last_practiced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_kanji_progress_user_kanji UNIQUE (user_id, kanji_id)
);

-- 23. Kana legacy table (for backwards compatibility)
CREATE TABLE IF NOT EXISTS kana (
    id BIGSERIAL PRIMARY KEY,
    character VARCHAR(10) NOT NULL,
    romaji VARCHAR(20) NOT NULL,
    kana_type VARCHAR(20) NOT NULL DEFAULT 'HIRAGANA',
    kana_group VARCHAR(30) NOT NULL DEFAULT 'GOJUON',
    audio_url VARCHAR(500),
    stroke_order_svg TEXT,
    is_particle_exception BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    review_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    needs_human_check BOOLEAN NOT NULL DEFAULT FALSE,
    source_ref VARCHAR(160),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
