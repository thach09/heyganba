-- Missing per-attempt facts only, see ADR-004. Existing exam/notebook facts are not copied.
CREATE TABLE learning_attempts (
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contract_version INTEGER NOT NULL DEFAULT 1 CHECK (contract_version = 1),
    activity_type VARCHAR(24) NOT NULL,
    content_ref VARCHAR(64) NOT NULL,
    skill_ref VARCHAR(64),
    result VARCHAR(16) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    module VARCHAR(16) NOT NULL,
    CONSTRAINT ck_learning_attempt_semantics CHECK (
      (module = 'GRAMMAR' AND activity_type = 'GRAMMAR_ANSWER'
        AND content_ref LIKE 'grammar-exercise:%' AND skill_ref IS NOT NULL
        AND skill_ref LIKE 'grammar-rule:%' AND result IN ('CORRECT', 'INCORRECT')) OR
      (module = 'SRS' AND activity_type = 'SRS_REVIEW'
        AND content_ref LIKE 'vocabulary:%' AND skill_ref IS NULL AND result IN ('RECALLED', 'FORGOT'))
    )
);
CREATE INDEX ix_learning_attempt_user_skill_time ON learning_attempts(user_id, skill_ref, occurred_at);
