-- Dictionary data is isolated from curriculum and SRS. Imported by a repeatable migration.
CREATE TABLE dictionary_entries (
    id BIGINT PRIMARY KEY,
    word VARCHAR(100) NOT NULL,
    reading VARCHAR(100) NOT NULL,
    meaning TEXT NOT NULL,
    search_text TEXT NOT NULL
);
CREATE INDEX idx_dictionary_word ON dictionary_entries(word);
CREATE INDEX idx_dictionary_reading ON dictionary_entries(reading);
ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vocabulary ADD COLUMN dictionary_entry_id BIGINT UNIQUE REFERENCES dictionary_entries(id);
