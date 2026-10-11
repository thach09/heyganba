ALTER TABLE dictionary_entries ADD COLUMN vietnamese_status VARCHAR(10) NOT NULL DEFAULT 'NONE';

UPDATE dictionary_entries
SET vietnamese_status = CASE
    WHEN vietnamese_meaning IS NOT NULL AND TRIM(vietnamese_meaning) <> '' THEN 'VERIFIED'
    ELSE 'NONE'
END;

ALTER TABLE dictionary_entries
    ADD CONSTRAINT chk_dictionary_vietnamese_status
    CHECK (vietnamese_status IN ('VERIFIED', 'ASSISTED', 'NONE'));

ALTER TABLE dictionary_entries
    ADD CONSTRAINT chk_dictionary_vietnamese_status_meaning
    CHECK (
        (vietnamese_status = 'NONE' AND (vietnamese_meaning IS NULL OR TRIM(vietnamese_meaning) = ''))
        OR
        (vietnamese_status IN ('VERIFIED', 'ASSISTED') AND vietnamese_meaning IS NOT NULL AND TRIM(vietnamese_meaning) <> '')
    );
