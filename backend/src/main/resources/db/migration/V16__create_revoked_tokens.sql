-- V16: Bang revoked_tokens de vo hieu hoa token khi logout hoac doi mat khau
CREATE TABLE revoked_tokens (
    jti VARCHAR(64) PRIMARY KEY,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_revoked_tokens_expires_at ON revoked_tokens (expires_at);
