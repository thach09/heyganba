ALTER TABLE dictionary_entries ADD COLUMN vietnamese_meaning TEXT;
ALTER TABLE dictionary_entries ADD COLUMN vietnamese_search_text TEXT;
ALTER TABLE dictionary_entries ADD COLUMN common_rank INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE dictionary_entries ADD CONSTRAINT chk_dictionary_common_rank CHECK (common_rank >= 0);
CREATE INDEX idx_dictionary_active_common_rank ON dictionary_entries(active, common_rank);
