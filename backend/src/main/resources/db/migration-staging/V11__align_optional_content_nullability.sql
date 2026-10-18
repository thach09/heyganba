-- Match the nullable fields in Vocabulary, Kanji and GrammarRule. Hibernate sends
-- explicit NULL for omitted fields, so V1's DEFAULT values do not apply to JPA writes.
-- Drafts and compatibility writes may omit these fields; identity/required content
-- constraints and all existing values remain unchanged. Do not rewrite V1's checksum.
ALTER TABLE vocabulary
    ALTER COLUMN pinyin DROP NOT NULL,
    ALTER COLUMN pinyin_normalized DROP NOT NULL,
    ALTER COLUMN han_viet DROP NOT NULL,
    ALTER COLUMN meaning_vi DROP NOT NULL;

ALTER TABLE hanzi
    ALTER COLUMN pinyin DROP NOT NULL,
    ALTER COLUMN han_viet DROP NOT NULL,
    ALTER COLUMN meaning_vi DROP NOT NULL;

ALTER TABLE grammar_rules
    ALTER COLUMN examples_json DROP NOT NULL;
