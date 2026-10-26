-- New verification policy; applied V13 and its quarantine remain unchanged.
ALTER TABLE vocabulary
    ADD COLUMN verification_method VARCHAR(40),
    ADD COLUMN verification_policy_version VARCHAR(80),
    ADD COLUMN verification_evidence_json TEXT,
    ADD COLUMN han_viet_verified BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN example_verified BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN vocabulary.verification_method IS 'Verification method, not a teacher signature or identity';
COMMENT ON COLUMN vocabulary.verification_evidence_json IS 'Per-entry source origins, retrieval evidence and supported fields';
