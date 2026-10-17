-- Repair lagging sequences left by historic explicit-ID seeds without changing
-- their checksums. In particular, V2 inserts grammar_rules IDs 1..6, while V6
-- is the first migration to request generated IDs for that table.
DO $$
DECLARE
    table_name TEXT;
    seq_name TEXT;
    max_id BIGINT;
    seq_value BIGINT;
BEGIN
    -- V8's approval update expects this column, absent from historic V1/V7.
    IF to_regclass('public.radicals') IS NOT NULL THEN
        ALTER TABLE public.radicals ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'PENDING_REVIEW';
    END IF;
    FOREACH table_name IN ARRAY ARRAY['lessons','vocabulary','hanzi','radicals',
        'grammar_rules','grammar_exercises','reading_passages','mock_exams','mock_exam_presets']
    LOOP
        IF to_regclass('public.' || table_name) IS NOT NULL THEN
            seq_name := pg_get_serial_sequence('public.' || table_name, 'id');
            IF seq_name IS NOT NULL THEN
                EXECUTE format('SELECT COALESCE(MAX(id),0) FROM public.%I', table_name) INTO max_id;
                EXECUTE format('SELECT last_value FROM %s', seq_name) INTO seq_value;
                IF max_id > 0 AND max_id >= seq_value THEN
                    PERFORM setval(seq_name, max_id, true);
                END IF;
            END IF;
        END IF;
    END LOOP;
END $$;
