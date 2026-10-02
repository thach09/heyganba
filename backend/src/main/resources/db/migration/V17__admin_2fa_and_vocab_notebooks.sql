-- =========================================================
-- V17: Admin 2FA (TOTP), Dokkai Passages Schema, and Vocab Notebooks
-- =========================================================

-- 1. Two-Factor Authentication (2FA) columns for Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Reading Comprehension (Dokkai) Passages Schema
CREATE TABLE IF NOT EXISTS reading_passages (
    id BIGSERIAL PRIMARY KEY,
    lesson_id BIGINT REFERENCES lessons(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    passage_text TEXT NOT NULL,
    translation_text TEXT,
    vocabulary_notes TEXT,
    questions_json TEXT NOT NULL,
    review_status VARCHAR(20) NOT NULL DEFAULT 'PENDING_REVIEW',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reading_passages_lesson ON reading_passages(lesson_id);
CREATE INDEX IF NOT EXISTS idx_reading_passages_review_status ON reading_passages(review_status);

-- 3. Personal Vocab Notebooks (Kho tu vung ca nhan + Nhom tu mau) - Issue #11
CREATE TABLE IF NOT EXISTS vocab_notebooks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    is_public_sample BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vocab_notebooks_user ON vocab_notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_notebooks_public ON vocab_notebooks(is_public_sample);

CREATE TABLE IF NOT EXISTS vocab_notebook_items (
    id BIGSERIAL PRIMARY KEY,
    notebook_id BIGINT NOT NULL REFERENCES vocab_notebooks(id) ON DELETE CASCADE,
    vocabulary_id BIGINT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
    custom_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_notebook_vocab UNIQUE (notebook_id, vocabulary_id)
);

CREATE INDEX IF NOT EXISTS idx_notebook_items_notebook ON vocab_notebook_items(notebook_id);
