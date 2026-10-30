-- Generated from docs/Content/hsk1-web-cross-check-batch-04-2026-10-20.json.
-- Each new row has two independent dictionary source entries and one CTI classification.
-- The official syllabus supports only ID, spelling, Pinyin, and level; meanings are editorial.
CREATE TABLE IF NOT EXISTS vocabulary_syllabus_classification (
    id BIGSERIAL PRIMARY KEY,
    syllabus_version VARCHAR(80) NOT NULL,
    official_entry_id INTEGER NOT NULL,
    official_level SMALLINT NOT NULL CHECK (official_level BETWEEN 1 AND 6),
    official_word VARCHAR(255) NOT NULL,
    official_pinyin VARCHAR(255) NOT NULL,
    vocabulary_id BIGINT NOT NULL REFERENCES vocabulary(id),
    content_digest CHAR(64) NOT NULL,
    CONSTRAINT uq_vocab_syllabus_entry UNIQUE (syllabus_version, official_entry_id),
    CONSTRAINT uq_vocab_syllabus_word UNIQUE (syllabus_version, vocabulary_id)
);

-- V16 leaves this temporary helper in the Flyway session; replace it safely.
CREATE OR REPLACE FUNCTION pg_temp.hsk_batch_digest(v vocabulary) RETURNS text
LANGUAGE sql IMMUTABLE AS $digest$
 SELECT encode(sha256(convert_to(length(COALESCE(word,''))::text || ':' || COALESCE(word,'') || length(COALESCE(COALESCE(pinyin,reading),''))::text || ':' || COALESCE(COALESCE(pinyin,reading),'') || length(COALESCE(COALESCE(meaning_vi,meaning),''))::text || ':' || COALESCE(COALESCE(meaning_vi,meaning),'') || length(COALESCE(COALESCE(han_viet,sino_vietnamese),''))::text || ':' || COALESCE(COALESCE(han_viet,sino_vietnamese),'') || length(COALESCE(COALESCE(example_zh,example_sentence),''))::text || ':' || COALESCE(COALESCE(example_zh,example_sentence),'') || length(COALESCE(COALESCE(example_pinyin,example_reading),''))::text || ':' || COALESCE(COALESCE(example_pinyin,example_reading),'') || length(COALESCE(COALESCE(example_vi,example_meaning),''))::text || ':' || COALESCE(COALESCE(example_vi,example_meaning),'') || length(COALESCE(hsk_level::text,''))::text || ':' || COALESCE(hsk_level::text,'') || length(COALESCE(part_of_speech,''))::text || ':' || COALESCE(part_of_speech,''), 'UTF8')), 'hex') FROM (SELECT (v).*) fields
$digest$;

DO $migration$
DECLARE
    item jsonb;
    content jsonb;
    evidence jsonb;
    official jsonb;
    vocabulary_id bigint;
    lesson_id bigint;
    current_digest text;
    mapped_id bigint;
    mapped_digest text;
    mapped_word text;
    mapped_pinyin text;
    mapped_level smallint;
BEGIN
    INSERT INTO lessons (slug, title, description, curriculum_level, order_index)
    VALUES ('cti-hsk3-level1-verified-batch-02', 'HSK 1 · Từ đã đối chiếu 02',
        '20 mục chọn lọc bổ sung, không đại diện toàn bộ HSK 1; đang bổ sung theo CTI HSK 3.0 (2025-11).', 'HSK1', 1002)
    ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO STRICT lesson_id FROM lessons WHERE slug='cti-hsk3-level1-verified-batch-02';

    FOR item IN SELECT value FROM jsonb_array_elements($hsk2_manifest$[{"content":{"word":"对","traditional":"對","pinyin":"duì","pinyin_normalized":null,"meaning_vi":"??ng; ch?nh x?c","han_viet":null,"example_zh":null,"example_pinyin":null,"example_vi":null,"hsk_level":1,"part_of_speech":"T?nh t?","curriculum_version":"INTERNAL_WEB_SUPPLEMENT_2026_10_20"},"contentDigest":"40918e18bd8e4f151cbc7c11376034c243b6d0ae6fbc969b7480acee56ec11c9","evidence":{"curriculumVersion":"INTERNAL_WEB_SUPPLEMENT_2026_10_20","sourceVersion":"WEB-2026-10-20_CC-CEDICT-20261019_MOE-20260929","lexicalSourceRef":"Per-entry source ancestry and IDs in verification_evidence_json","meaningSourceRef":"Ngh?a Vi?t v? t? lo?i ???c bi?n so?n theo ??ng sense ?? ??i chi?u trong hai m?c t? ??c l?p; kh?ng ph?i b?n d?ch c? s?n trong ngu?n. Attribution/license: docs/Content/web-cross-check-policy.md","hanVietSourceRef":null,"exampleSourceRef":null,"hskLevel":1,"verificationMethod":"WEB_CROSS_CHECKED","verificationPolicyVersion":"WEB_CROSS_CHECKED_2026_10_20_V1","sources":[{"provider":"MDBG CC-CEDICT downloadable release","dataFamily":"CC_CEDICT","reference":"https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz","entryId":"4cba97abbd5bff7ca37ce7e247907088ae3c1e01a4c2f437f5bcdecd227c7f5c","subjectWord":"对","subjectReading":"duì","accessedAt":"2026-10-20T04:20:10Z","accessStatus":"RETRIEVED","supports":["WORD","READING","MEANING","PART_OF_SPEECH"],"observation":"Ch? ch?n ngh?a ???ng, kh?ng sai? ? m?c MOE v? ngh?a right/correct trong CC-CEDICT; c?c gi?i t?, ??ng t? v? l??ng t? b? lo?i.","snapshotSha256":"2d42d41f75df8708d9d9b236d8ae15ecf1cef525aef8ebb8499a74cb09e1b096"},{"provider":"Taiwan MOE Concise Mandarin Dictionary 20260929","dataFamily":"TAIWAN_MOE","reference":"https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/download/dict_concised_2014_20260929.zip","entryId":"1278","subjectWord":"对","subjectReading":"duì","accessedAt":"2026-10-20T04:20:10Z","accessStatus":"RETRIEVED","supports":["WORD","READING","MEANING","PART_OF_SPEECH"],"observation":"Ch? ch?n ngh?a ???ng, kh?ng sai? ? m?c MOE v? ngh?a right/correct trong CC-CEDICT; c?c gi?i t?, ??ng t? v? l??ng t? b? lo?i.","snapshotSha256":"5bab99dac44ad7a6ccdcf481e770e8aca05ede7445c4cc25b8199e0e5df64cf2"},{"provider":"Chinese Testing International syllabus 2025-11","dataFamily":"CTI_HSK_SYLLABUS","reference":"https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf","entryId":"44","subjectWord":"对","subjectReading":"duì","accessedAt":"2026-10-20T04:20:10Z","accessStatus":"RETRIEVED","supports":["HSK_LEVEL","WORD","READING"],"observation":"Ch? x?c nh?n ID, ch?, Pinyin v? c?p HSK 1; kh?ng x?c nh?n ngh?a Vi?t ho?c t? lo?i.","snapshotSha256":"ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941"}],"publishHanViet":false,"publishExamples":false},"officialClassification":{"entryId":44,"syllabusVersion":"CTI_HSK_3.0_2025-11","primaryLevel":"1","word":"对","pinyin":"duì"},"decision":"APPROVE_CORE_ONLY","meaningViEditorial":true,"hanVietAndExamplesPublished":false},{"content":{"word":"们","traditional":"們","pinyin":"men","pinyin_normalized":null,"meaning_vi":"h?u t? ch? s? nhi?u","han_viet":null,"example_zh":null,"example_pinyin":null,"example_vi":null,"hsk_level":1,"part_of_speech":"H?u t? / tr? t?","curriculum_version":"INTERNAL_WEB_SUPPLEMENT_2026_10_20"},"contentDigest":"a85dae48ca977d043aca929cad338fc2330766eeabec6a9976fa1157ef4fa228","evidence":{"curriculumVersion":"INTERNAL_WEB_SUPPLEMENT_2026_10_20","sourceVersion":"WEB-2026-10-20_CC-CEDICT-20261019_MOE-20260929","lexicalSourceRef":"Per-entry source ancestry and IDs in verification_evidence_json","meaningSourceRef":"Ngh?a Vi?t v? t? lo?i ???c bi?n so?n theo ??ng sense ?? ??i chi?u trong hai m?c t? ??c l?p; kh?ng ph?i b?n d?ch c? s?n trong ngu?n. Attribution/license: docs/Content/web-cross-check-policy.md","hanVietSourceRef":null,"exampleSourceRef":null,"hskLevel":1,"verificationMethod":"WEB_CROSS_CHECKED","verificationPolicyVersion":"WEB_CROSS_CHECKED_2026_10_20_V1","sources":[{"provider":"MDBG CC-CEDICT downloadable release","dataFamily":"CC_CEDICT","reference":"https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz","entryId":"8ebfbe91a6a415e84efcd579fa996f1530f7c32a1922cbd54991db5a2c776df3","subjectWord":"们","subjectReading":"men","accessedAt":"2026-10-20T04:20:10Z","accessStatus":"RETRIEVED","supports":["WORD","READING","MEANING","PART_OF_SPEECH"],"observation":"CC-CEDICT x?c nh?n ??y l? d?u hi?u s? nhi?u; MOE ghi r? h?u t? g?n sau danh t? ho?c ??i t? nh?n x?ng ?? bi?u th? s? nhi?u.","snapshotSha256":"2d42d41f75df8708d9d9b236d8ae15ecf1cef525aef8ebb8499a74cb09e1b096"},{"provider":"Taiwan MOE Concise Mandarin Dictionary 20260929","dataFamily":"TAIWAN_MOE","reference":"https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/download/dict_concised_2014_20260929.zip","entryId":"6623","subjectWord":"们","subjectReading":"men","accessedAt":"2026-10-20T04:20:10Z","accessStatus":"RETRIEVED","supports":["WORD","READING","MEANING","PART_OF_SPEECH"],"observation":"CC-CEDICT x?c nh?n ??y l? d?u hi?u s? nhi?u; MOE ghi r? h?u t? g?n sau danh t? ho?c ??i t? nh?n x?ng ?? bi?u th? s? nhi?u.","snapshotSha256":"5bab99dac44ad7a6ccdcf481e770e8aca05ede7445c4cc25b8199e0e5df64cf2"},{"provider":"Chinese Testing International syllabus 2025-11","dataFamily":"CTI_HSK_SYLLABUS","reference":"https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf","entryId":"124","subjectWord":"们","subjectReading":"men","accessedAt":"2026-10-20T04:20:10Z","accessStatus":"RETRIEVED","supports":["HSK_LEVEL","WORD","READING"],"observation":"Ch? x?c nh?n ID, ch?, Pinyin v? c?p HSK 1; kh?ng x?c nh?n ngh?a Vi?t ho?c t? lo?i.","snapshotSha256":"ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941"}],"publishHanViet":false,"publishExamples":false},"officialClassification":{"entryId":124,"syllabusVersion":"CTI_HSK_3.0_2025-11","primaryLevel":"1","word":"们","pinyin":"men"},"decision":"APPROVE_CORE_ONLY","meaningViEditorial":true,"hanVietAndExamplesPublished":false},{"content":{"word":"只","traditional":"?","pinyin":"zhī","pinyin_normalized":null,"meaning_vi":"con (l??ng t? cho ??ng v?t)","han_viet":null,"example_zh":null,"example_pinyin":null,"example_vi":null,"hsk_level":1,"part_of_speech":"L??ng t?","curriculum_version":"INTERNAL_WEB_SUPPLEMENT_2026_10_20"},"contentDigest":"09be042a395cac256749630c9e26b0cc46fab1cbc03c600765cad6e3a277e58b","evidence":{"curriculumVersion":"INTERNAL_WEB_SUPPLEMENT_2026_10_20","sourceVersion":"WEB-2026-10-20_CC-CEDICT-20261019_MOE-20260929","lexicalSourceRef":"Per-entry source ancestry and IDs in verification_evidence_json","meaningSourceRef":"Ngh?a Vi?t v? t? lo?i ???c bi?n so?n theo ??ng sense ?? ??i chi?u trong hai m?c t? ??c l?p; kh?ng ph?i b?n d?ch c? s?n trong ngu?n. Attribution/license: docs/Content/web-cross-check-policy.md","hanVietSourceRef":null,"exampleSourceRef":null,"hskLevel":1,"verificationMethod":"WEB_CROSS_CHECKED","verificationPolicyVersion":"WEB_CROSS_CHECKED_2026_10_20_V1","sources":[{"provider":"MDBG CC-CEDICT downloadable release","dataFamily":"CC_CEDICT","reference":"https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz","entryId":"581d513b4eb982ff2d6a6c2a42d35fc95f889ac4403e5a150167f06b7ff82077","subjectWord":"只","subjectReading":"zhī","accessedAt":"2026-10-20T04:20:10Z","accessStatus":"RETRIEVED","supports":["WORD","READING","MEANING","PART_OF_SPEECH"],"observation":"Ch? d?ng l??ng t? ??n v? cho chim/th?; kh?ng d?ng ngh?a ???n ??c? hay ?m zh?.","snapshotSha256":"2d42d41f75df8708d9d9b236d8ae15ecf1cef525aef8ebb8499a74cb09e1b096"},{"provider":"Taiwan MOE Concise Mandarin Dictionary 20260929","dataFamily":"TAIWAN_MOE","reference":"https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/download/dict_concised_2014_20260929.zip","entryId":"4228","subjectWord":"只","subjectReading":"zhī","accessedAt":"2026-10-20T04:20:10Z","accessStatus":"RETRIEVED","supports":["WORD","READING","MEANING","PART_OF_SPEECH"],"observation":"Ch? d?ng l??ng t? ??n v? cho chim/th?; kh?ng d?ng ngh?a ???n ??c? hay ?m zh?.","snapshotSha256":"5bab99dac44ad7a6ccdcf481e770e8aca05ede7445c4cc25b8199e0e5df64cf2"},{"provider":"Chinese Testing International syllabus 2025-11","dataFamily":"CTI_HSK_SYLLABUS","reference":"https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf","entryId":"287","subjectWord":"只","subjectReading":"zhī","accessedAt":"2026-10-20T04:20:10Z","accessStatus":"RETRIEVED","supports":["HSK_LEVEL","WORD","READING"],"observation":"Ch? x?c nh?n ID, ch?, Pinyin v? c?p HSK 1; kh?ng x?c nh?n ngh?a Vi?t ho?c t? lo?i.","snapshotSha256":"ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941"}],"publishHanViet":false,"publishExamples":false},"officialClassification":{"entryId":287,"syllabusVersion":"CTI_HSK_3.0_2025-11","primaryLevel":"1","word":"只","pinyin":"zhī"},"decision":"APPROVE_CORE_ONLY","meaningViEditorial":true,"hanVietAndExamplesPublished":false}]$hsk2_manifest$::jsonb)
    LOOP
        content := item->'content';
        evidence := item->'evidence';
        official := item->'officialClassification';
        SELECT id INTO vocabulary_id FROM vocabulary
        WHERE word=content->>'word' AND COALESCE(pinyin, reading)=content->>'pinyin'
        ORDER BY id LIMIT 1;

        IF vocabulary_id IS NULL THEN
            INSERT INTO vocabulary (word, traditional, pinyin, reading, meaning_vi, meaning,
                part_of_speech, hsk_level, lesson_number, lesson_id, review_status,
                needs_human_check, source_ref, curriculum_version, source_version,
                lexical_source_ref, meaning_source_ref, verification_method,
                verification_policy_version, verification_evidence_json,
                han_viet, sino_vietnamese, example_zh, example_sentence,
                example_pinyin, example_reading, example_vi, example_meaning,
                han_viet_verified, example_verified, provenance_content_sha256,
                provenance_recorded_at, reviewed_at, reviewed_by)
            VALUES (content->>'word', content->>'traditional', content->>'pinyin', content->>'pinyin',
                content->>'meaning_vi', content->>'meaning_vi', content->>'part_of_speech', 1,
                1002, lesson_id, 'APPROVED', false, 'WEB_CROSS_CHECKED HSK1 batch 02',
                content->>'curriculum_version', evidence->>'sourceVersion',
                evidence->>'lexicalSourceRef', evidence->>'meaningSourceRef',
                evidence->>'verificationMethod', evidence->>'verificationPolicyVersion', evidence::text,
                NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
                false, false, item->>'contentDigest',
                (evidence->'sources'->0->>'accessedAt')::timestamptz,
                NULL, NULL)
            RETURNING id INTO vocabulary_id;
        ELSE
            SELECT pg_temp.hsk_batch_digest(v) INTO STRICT current_digest
            FROM vocabulary v WHERE v.id=vocabulary_id;
            IF current_digest IS DISTINCT FROM item->>'contentDigest'
               OR (SELECT review_status::text FROM vocabulary WHERE id=vocabulary_id) <> 'APPROVED'
               OR (SELECT verification_evidence_json FROM vocabulary WHERE id=vocabulary_id) IS DISTINCT FROM evidence::text THEN
                RAISE EXCEPTION 'Lexical identity conflicts with reviewed HSK1 batch 02: %', content->>'word';
            END IF;
        END IF;

        SELECT pg_temp.hsk_batch_digest(v) INTO STRICT current_digest
        FROM vocabulary v WHERE v.id=vocabulary_id;
        IF current_digest IS DISTINCT FROM item->>'contentDigest'
           OR (SELECT provenance_content_sha256 FROM vocabulary WHERE id=vocabulary_id) IS DISTINCT FROM item->>'contentDigest' THEN
            RAISE EXCEPTION 'Post-import vocabulary digest mismatch: %', content->>'word';
        END IF;

        INSERT INTO vocabulary_syllabus_classification
            (syllabus_version, official_entry_id, official_level, official_word, official_pinyin, vocabulary_id, content_digest)
        VALUES (official->>'syllabusVersion', (official->>'entryId')::integer, 1,
            official->>'word', official->>'pinyin', vocabulary_id, item->>'contentDigest')
        ON CONFLICT (syllabus_version, official_entry_id) DO NOTHING;

        SELECT classification.vocabulary_id, classification.content_digest,
               classification.official_word, classification.official_pinyin,
               classification.official_level
        INTO STRICT mapped_id, mapped_digest, mapped_word, mapped_pinyin, mapped_level
        FROM vocabulary_syllabus_classification classification
        WHERE classification.syllabus_version=official->>'syllabusVersion'
          AND classification.official_entry_id=(official->>'entryId')::integer;
        IF mapped_id <> vocabulary_id OR mapped_digest IS DISTINCT FROM item->>'contentDigest'
           OR mapped_word IS DISTINCT FROM official->>'word'
           OR mapped_pinyin IS DISTINCT FROM official->>'pinyin'
           OR mapped_level <> (official->>'primaryLevel')::smallint THEN
            RAISE EXCEPTION 'Official CTI ID already maps to a different content identity: %', official->>'entryId';
        END IF;
    END LOOP;
END
$migration$;
DROP FUNCTION pg_temp.hsk_batch_digest(vocabulary);
