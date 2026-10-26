-- Add evidence metadata without rewriting applied migrations or deleting learning history.
-- A legacy source_ref does not substantiate Vietnamese translations or example sentences.
ALTER TABLE vocabulary
    ADD COLUMN curriculum_version VARCHAR(100),
    ADD COLUMN source_version VARCHAR(100),
    ADD COLUMN lexical_source_ref TEXT,
    ADD COLUMN meaning_source_ref TEXT,
    ADD COLUMN han_viet_source_ref TEXT,
    ADD COLUMN example_source_ref TEXT,
    ADD COLUMN provenance_content_sha256 VARCHAR(64),
    ADD COLUMN provenance_recorded_at TIMESTAMPTZ,
    ADD COLUMN reviewed_at TIMESTAMPTZ,
    ADD COLUMN reviewed_by BIGINT;

UPDATE vocabulary
SET curriculum_version = 'INTERNAL_SIX_LEVEL_SELECTION_V9',
    source_version = 'legacy-unverified',
    review_status = CASE WHEN review_status = 'APPROVED' THEN 'PENDING_REVIEW' ELSE review_status END,
    needs_human_check = CASE WHEN review_status = 'ARCHIVED' THEN needs_human_check ELSE true END;

COMMENT ON COLUMN vocabulary.curriculum_version IS 'Repository curriculum identity; not an assertion of official HSK coverage';
COMMENT ON COLUMN vocabulary.meaning_source_ref IS 'Independent evidence for Vietnamese meaning; lexical syllabus alone is insufficient';
COMMENT ON COLUMN vocabulary.created_at IS 'Original import/creation time, preserved by provenance migration';
