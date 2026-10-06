ALTER TABLE vocab_notebook_items ADD COLUMN practice_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vocab_notebook_items ADD COLUMN correct_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vocab_notebook_items ADD COLUMN last_practiced_at TIMESTAMPTZ;
CREATE TABLE notebook_practice_sessions (
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notebook_id BIGINT NOT NULL REFERENCES vocab_notebooks(id) ON DELETE CASCADE,
    correct_count INTEGER NOT NULL,
    total_count INTEGER NOT NULL,
    exp_earned INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
