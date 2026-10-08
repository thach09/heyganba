-- Approved QA blocker fix: durable retry results for Grammar checks and SRS reviews only.
CREATE TABLE learning_mutation_receipts (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation VARCHAR(16) NOT NULL CHECK (operation IN ('GRAMMAR_CHECK', 'SRS_REVIEW')),
    attempt_id UUID NOT NULL,
    content_id BIGINT NOT NULL,
    request_value VARCHAR(200) NOT NULL,
    response_json TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (user_id, operation, attempt_id)
);
