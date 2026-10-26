-- Migration V12: Performance indexes and constraints for HSK curriculum queries and learning activity
-- Milestone v2.1: Bounded query optimization for production workload

-- 1. Compound indexes for HSK content filtering with review status
CREATE INDEX IF NOT EXISTS idx_vocab_hsk_status ON vocabulary(hsk_level, review_status);
CREATE INDEX IF NOT EXISTS idx_vocab_pinyin_norm ON vocabulary(pinyin_normalized);
CREATE INDEX IF NOT EXISTS idx_hanzi_hsk_status ON hanzi(hsk_level, review_status);
CREATE INDEX IF NOT EXISTS idx_grammar_hsk_status ON grammar_rules(hsk_level, review_status);

-- 2. Performance indexes for user activity and daily quest lookups
CREATE INDEX IF NOT EXISTS idx_activities_user_created_at ON study_activities(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_daily_quest_claims_user_date ON daily_quest_claims(user_id, claim_date);
