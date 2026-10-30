"""Render explicit post-V17 decisions; never approve a lookup queue automatically."""
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'docs/Content/web-cross-check-resolution-batch-2026-10-20.json'
OUTPUT = ROOT / 'backend/src/main/resources/db/migration-release/V21__resolve_verified_pending_vocabulary.sql'
spec = importlib.util.spec_from_file_location('review_generator', ROOT / 'scripts/generate-reviewed-vocabulary-migration.py')
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)


def main():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    decisions = manifest['approvedDecisions']
    observations = json.loads((ROOT / 'docs/Content/collins-entry-observations-2026-10-20.json').read_text(encoding='utf-8'))
    observed = {entry['entryId']: entry for entry in observations['entries']}
    seen = set()
    for item in decisions:
        assert item['decision'] == 'APPROVE_CORE_ONLY'
        assert review.digest(item['content']) == item['contentDigest']
        evidence = item['evidence']
        assert evidence['verificationMethod'] == 'WEB_CROSS_CHECKED'
        assert evidence['verificationPolicyVersion'] == manifest['policy']
        assert not evidence['publishHanViet'] and not evidence['publishExamples']
        core = {'WORD', 'READING', 'MEANING', 'PART_OF_SPEECH'}
        assert {source['dataFamily'] for source in evidence['sources'] if set(source['supports']) >= core} == {'CC_CEDICT', 'COLLINS'}
        collins = next(source for source in evidence['sources'] if source['dataFamily'] == 'COLLINS')
        entry = observed[collins['entryId']]
        assert entry['word'] == item['content']['word'] and entry['pinyin'] == item['content']['pinyin']
        assert collins['reference'] == entry['reference']
        assert collins['snapshotSha256'] == hashlib.sha256(json.dumps(entry, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        assert entry['accessStatus'] == 'READABLE_WEB_RETRIEVAL'
        identity = item['legacyId'] or ('new', item['content']['word'], item['content']['pinyin'])
        assert identity not in seen
        seen.add(identity)
    fields = ['word', 'COALESCE(pinyin,reading)', 'COALESCE(meaning_vi,meaning)',
              'COALESCE(han_viet,sino_vietnamese)', 'COALESCE(example_zh,example_sentence)',
              'COALESCE(example_pinyin,example_reading)', 'COALESCE(example_vi,example_meaning)',
              'hsk_level::text', 'part_of_speech']
    expression = ' || '.join("length(COALESCE(%s,''))::text || ':' || COALESCE(%s,'')" % (field, field) for field in fields)
    payload = json.dumps(decisions, ensure_ascii=False, separators=(',', ':'))
    assert '$resolution_manifest$' not in payload
    sql = """-- Generated from docs/Content/web-cross-check-resolution-batch-2026-10-20.json.
-- Five pending lesson rows and one proposal; explicit source decisions only.
-- Original IDs/history are preserved. Optional fields remain NULL/unpublished.
CREATE OR REPLACE FUNCTION pg_temp.resolution_digest(v vocabulary) RETURNS text
LANGUAGE sql IMMUTABLE AS $digest$
 SELECT encode(sha256(convert_to(EXPRESSION, 'UTF8')), 'hex') FROM (SELECT (v).*) fields
$digest$;
DO $resolution$
DECLARE
    item jsonb; content jsonb; evidence jsonb; official jsonb;
    current_row vocabulary%ROWTYPE;
    target_id bigint; lesson_id bigint; canonical_id bigint;
    current_digest text; canonical_digest text;
BEGIN
    INSERT INTO lessons(slug,title,description,curriculum_level,order_index)
    VALUES ('verified-pending-resolution-01','Nhóm 1 · Từ bổ sung đã đối chiếu',
        'Một mục bổ sung có nguồn; nhóm nội bộ đang mở rộng, không đại diện toàn bộ cấp HSK.', 'HSK1',1005)
    ON CONFLICT(slug) DO NOTHING;
    SELECT id INTO STRICT lesson_id FROM lessons WHERE slug='verified-pending-resolution-01';
    FOR item IN SELECT value FROM jsonb_array_elements($resolution_manifest$PAYLOAD$resolution_manifest$::jsonb)
    LOOP
        content:=item->'content'; evidence:=item->'evidence'; target_id:=NULL;
        IF item->>'legacyId' IS NOT NULL THEN
            target_id:=(item->>'legacyId')::bigint;
            SELECT v.* INTO STRICT current_row FROM vocabulary v WHERE v.id=target_id;
            current_digest:=pg_temp.resolution_digest(current_row);
            IF current_row.review_status='PENDING_REVIEW' AND current_row.source_version='legacy-unverified'
               AND current_digest=item->>'beforeDigest' THEN
                IF current_row.word IS DISTINCT FROM content->>'word'
                   OR COALESCE(current_row.pinyin,current_row.reading) IS DISTINCT FROM content->>'pinyin'
                   OR current_row.curriculum_version IS DISTINCT FROM content->>'curriculum_version'
                   OR current_row.provenance_content_sha256 IS NOT NULL
                   OR current_row.han_viet_verified OR current_row.example_verified
                   OR current_row.han_viet_source_ref IS NOT NULL OR current_row.example_source_ref IS NOT NULL THEN
                    RAISE EXCEPTION 'Pending resolution identity/evidence changed for ID %', target_id;
                END IF;
                UPDATE vocabulary SET meaning_vi=content->>'meaning_vi',meaning=content->>'meaning_vi',
                    pinyin=content->>'pinyin',reading=content->>'pinyin',
                    pinyin_normalized=content->>'pinyin_normalized',part_of_speech=content->>'part_of_speech'
                WHERE id=target_id;
            ELSIF current_row.review_status<>'APPROVED' OR current_digest IS DISTINCT FROM item->>'contentDigest'
                  OR current_row.provenance_content_sha256 IS DISTINCT FROM item->>'contentDigest'
                  OR current_row.verification_evidence_json IS DISTINCT FROM evidence::text
                  OR current_row.source_version IS DISTINCT FROM evidence->>'sourceVersion' THEN
                RAISE EXCEPTION 'Existing resolution state conflicts for ID %', target_id;
            END IF;
        ELSE
            IF (SELECT count(*) FROM vocabulary v WHERE v.word=content->>'word'
                AND COALESCE(v.pinyin,v.reading)=content->>'pinyin') > 1 THEN
                RAISE EXCEPTION 'Proposal has multiple existing lexical identities';
            END IF;
            SELECT v.id INTO target_id FROM vocabulary v
            WHERE v.word=content->>'word' AND COALESCE(v.pinyin,v.reading)=content->>'pinyin';
            IF target_id IS NULL THEN
                INSERT INTO vocabulary(word,traditional,pinyin,reading,pinyin_normalized,meaning_vi,meaning,part_of_speech,
                    hsk_level,lesson_number,lesson_id,review_status,needs_human_check,curriculum_version,
                    han_viet,sino_vietnamese,example_zh,example_sentence,example_pinyin,example_reading,example_vi,example_meaning,
                    han_viet_verified,example_verified)
                VALUES(content->>'word',content->>'traditional',content->>'pinyin',content->>'pinyin',content->>'pinyin_normalized',
                    content->>'meaning_vi',content->>'meaning_vi',content->>'part_of_speech',(content->>'hsk_level')::integer,
                    1005,lesson_id,'PENDING_REVIEW',true,content->>'curriculum_version',
                    NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,false,false) RETURNING id INTO target_id;
            ELSE
                SELECT v.* INTO STRICT current_row FROM vocabulary v WHERE v.id=target_id;
                IF current_row.review_status<>'APPROVED' OR pg_temp.resolution_digest(current_row) IS DISTINCT FROM item->>'contentDigest'
                   OR current_row.provenance_content_sha256 IS DISTINCT FROM item->>'contentDigest'
                   OR current_row.verification_evidence_json IS DISTINCT FROM evidence::text THEN
                    RAISE EXCEPTION 'New proposal collides with an existing lexical identity';
                END IF;
            END IF;
        END IF;
        SELECT v.* INTO STRICT current_row FROM vocabulary v WHERE v.id=target_id;
        IF pg_temp.resolution_digest(current_row) IS DISTINCT FROM item->>'contentDigest'
           OR current_row.han_viet IS NOT NULL OR current_row.sino_vietnamese IS NOT NULL
           OR current_row.example_zh IS NOT NULL OR current_row.example_sentence IS NOT NULL
           OR current_row.example_pinyin IS NOT NULL OR current_row.example_reading IS NOT NULL
           OR current_row.example_vi IS NOT NULL OR current_row.example_meaning IS NOT NULL THEN
            RAISE EXCEPTION 'Resolution post-edit digest/optional fields failed for ID %',target_id;
        END IF;
        UPDATE vocabulary SET source_ref='WEB_CROSS_CHECKED pending resolution 2026-10-20',
            source_version=evidence->>'sourceVersion',lexical_source_ref=evidence->>'lexicalSourceRef',meaning_source_ref=evidence->>'meaningSourceRef',
            verification_method=evidence->>'verificationMethod',verification_policy_version=evidence->>'verificationPolicyVersion',
            verification_evidence_json=evidence::text,provenance_content_sha256=item->>'contentDigest',
            provenance_recorded_at=(evidence->'sources'->0->>'accessedAt')::timestamptz,
            reviewed_at=NULL,reviewed_by=NULL,needs_human_check=false,review_status='APPROVED'
        WHERE id=target_id;
        FOR official IN SELECT value FROM jsonb_array_elements(item->'officialClassification') LOOP
            SELECT v.id,v.provenance_content_sha256 INTO STRICT canonical_id,canonical_digest
            FROM vocabulary v WHERE v.word=content->>'word' AND COALESCE(v.pinyin,v.reading)=content->>'pinyin'
                AND v.review_status='APPROVED' ORDER BY v.id LIMIT 1;
            INSERT INTO vocabulary_syllabus_classification(syllabus_version,official_entry_id,official_level,official_word,official_pinyin,vocabulary_id,content_digest)
            VALUES('CTI_HSK_3.0_2025-11',(official->>'entryId')::integer,(official->>'primaryLevel')::smallint,
                content->>'word',official->>'pinyin',canonical_id,canonical_digest)
            ON CONFLICT(syllabus_version,official_entry_id) DO NOTHING;
            IF NOT EXISTS(SELECT 1 FROM vocabulary_syllabus_classification mapping
                WHERE mapping.syllabus_version='CTI_HSK_3.0_2025-11' AND mapping.official_entry_id=(official->>'entryId')::integer
                  AND mapping.vocabulary_id=canonical_id AND mapping.content_digest=canonical_digest
                  AND mapping.official_word=content->>'word' AND mapping.official_pinyin=official->>'pinyin'
                  AND mapping.official_level=(official->>'primaryLevel')::smallint) THEN
                RAISE EXCEPTION 'Official ID collision in pending resolution';
            END IF;
        END LOOP;
    END LOOP;
END
$resolution$;
DROP FUNCTION pg_temp.resolution_digest(vocabulary);
""".replace('EXPRESSION', expression).replace('PAYLOAD', payload)
    OUTPUT.write_text(sql, encoding='utf-8', newline='\n')
    (ROOT / 'backend/src/main/resources/db/migration-staging' / OUTPUT.name).write_bytes(OUTPUT.read_bytes())
    print(json.dumps({'decisions':len(decisions),'sha256':hashlib.sha256(OUTPUT.read_bytes()).hexdigest()}))


if __name__ == '__main__':
    main()
