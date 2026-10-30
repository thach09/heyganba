"""Render explicit, evidence-backed decisions into a guarded PostgreSQL migration.

This consumes a reviewed manifest, never a lexical lookup queue. It cannot make
review decisions. Existing rows must still match their pre-review content digest.
"""
import argparse
import hashlib
import json
import pathlib

FIELDS = ['word', 'pinyin', 'meaning_vi', 'han_viet', 'example_zh',
          'example_pinyin', 'example_vi', 'hsk_level', 'part_of_speech']


def digest(content):
    values = [str(content.get(k) if content.get(k) is not None else '') for k in FIELDS]
    # PostgreSQL char_length equals Java String.length for this BMP-only batch.
    if any(ord(ch) > 65535 for value in values for ch in value):
        raise ValueError('This SQL digest implementation requires BMP content')
    return hashlib.sha256(''.join(f'{len(v)}:{v}' for v in values).encode()).hexdigest()


def main():
    p = argparse.ArgumentParser()
    p.add_argument('manifest', type=pathlib.Path)
    p.add_argument('output', type=pathlib.Path)
    a = p.parse_args()
    manifest = json.loads(a.manifest.read_text(encoding='utf-8'))
    decisions = manifest['approvedDecisions']
    seen = set()
    for d in decisions:
        assert d['decision'] == 'APPROVE_CORE_ONLY'
        assert digest(d['content']) == d['contentDigest']
        assert d['evidence']['verificationMethod'] == 'WEB_CROSS_CHECKED'
        assert d['evidence']['verificationPolicyVersion'] == manifest['policy']
        assert not d['evidence']['publishHanViet'] and not d['evidence']['publishExamples']
        assert len({s['dataFamily'] for s in d['evidence']['sources'] if
                    set(s['supports']) >= {'WORD', 'READING', 'MEANING', 'PART_OF_SPEECH'}}) >= 2
        identity = d['legacyId'] or ('new', d['content']['word'], d['content']['pinyin'])
        assert identity not in seen
        seen.add(identity)
    payload = json.dumps(decisions, ensure_ascii=False, separators=(',', ':'))
    # Definitions themselves are not reproduced, only source identities and review findings.
    assert '$review_manifest$' not in payload
    columns = ['word', 'COALESCE(pinyin,reading)', 'COALESCE(meaning_vi,meaning)',
               'COALESCE(han_viet,sino_vietnamese)', 'COALESCE(example_zh,example_sentence)',
               'COALESCE(example_pinyin,example_reading)', 'COALESCE(example_vi,example_meaning)',
               'hsk_level::text', 'part_of_speech']
    expression = ' || '.join("length(COALESCE(%s,''))::text || ':' || COALESCE(%s,'')" % (c, c) for c in columns)
    sql = """-- Generated from docs/Content/web-cross-check-batch-2026-10-20.json.
-- Explicit per-entry semantic decisions, not approval based on lookup equality.
-- Optional examples/Han-Viet remain stored but unpublished. No human reviewer is claimed.
-- Existing IDs/content must match the reviewed snapshot or the whole migration rolls back.
CREATE FUNCTION pg_temp.review_content_digest(v vocabulary) RETURNS text
LANGUAGE sql IMMUTABLE AS $digest$
 SELECT encode(sha256(convert_to(EXPRESSION, 'UTF8')), 'hex') FROM (SELECT (v).*) fields
$digest$;

DO $migration$
DECLARE
    r jsonb;
    c jsonb;
    e jsonb;
    target_id bigint;
    supplement_lesson bigint;
    actual_digest text;
BEGIN
    INSERT INTO lessons (slug,title,description,curriculum_level,order_index)
    VALUES ('internal-web-supplement-01','Từ cơ bản bổ sung 1',
        'Bộ chọn lọc nội bộ bổ sung, phân loại CTI 3.0 được ghi riêng trong nguồn từng từ.', 'HSK1', 1000)
    ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO STRICT supplement_lesson FROM lessons WHERE slug='internal-web-supplement-01';
    FOR r IN SELECT value FROM jsonb_array_elements($review_manifest$PAYLOAD$review_manifest$::jsonb)
    LOOP
        c := r->'content'; e := r->'evidence';
        IF r->>'legacyId' IS NOT NULL THEN
            target_id := (r->>'legacyId')::bigint;
            SELECT pg_temp.review_content_digest(v) INTO STRICT actual_digest FROM vocabulary v
                WHERE id=target_id AND review_status='PENDING_REVIEW'
                    AND source_version='legacy-unverified';
            IF actual_digest <> r->>'beforeDigest' THEN
                RAISE EXCEPTION 'Reviewed vocabulary content changed for ID %', target_id;
            END IF;
            UPDATE vocabulary SET pinyin=c->>'pinyin', reading=c->>'pinyin',
                pinyin_normalized=c->>'pinyin_normalized', meaning_vi=c->>'meaning_vi', meaning=c->>'meaning_vi',
                part_of_speech=c->>'part_of_speech' WHERE id=target_id;
        ELSE
            IF EXISTS (SELECT 1 FROM vocabulary WHERE word=c->>'word' AND pinyin=c->>'pinyin') THEN
                RAISE EXCEPTION 'Supplement word already exists: %', c->>'word';
            END IF;
            INSERT INTO vocabulary (word,traditional,pinyin,pinyin_normalized,meaning_vi,part_of_speech,
                hsk_level,lesson_number,lesson_id,review_status,needs_human_check,source_ref)
            VALUES (c->>'word', c->>'traditional', c->>'pinyin', c->>'pinyin_normalized', c->>'meaning_vi',
                c->>'part_of_speech',(c->>'hsk_level')::integer,1,supplement_lesson,'PENDING_REVIEW',true,
                'WEB_CROSS_CHECKED batch 2026-10-20, see verification_evidence_json') RETURNING id INTO target_id;
        END IF;
        SELECT pg_temp.review_content_digest(v) INTO STRICT actual_digest FROM vocabulary v WHERE id=target_id;
        IF actual_digest <> r->>'contentDigest' THEN
            RAISE EXCEPTION 'Post-edit vocabulary digest mismatch for ID %', target_id;
        END IF;
        UPDATE vocabulary SET curriculum_version=e->>'curriculumVersion', source_version=e->>'sourceVersion',
            lexical_source_ref=e->>'lexicalSourceRef', meaning_source_ref=e->>'meaningSourceRef',
            han_viet_source_ref=NULL, example_source_ref=NULL, verification_method=e->>'verificationMethod',
            verification_policy_version=e->>'verificationPolicyVersion', verification_evidence_json=e::text,
            provenance_content_sha256=r->>'contentDigest', provenance_recorded_at=(e->'sources'->0->>'accessedAt')::timestamptz,
            reviewed_at=(e->'sources'->0->>'accessedAt')::timestamptz, reviewed_by=NULL,
            han_viet_verified=false, example_verified=false, needs_human_check=false, review_status='APPROVED'
        WHERE id=target_id;
    END LOOP;
END
$migration$;
DROP FUNCTION pg_temp.review_content_digest(vocabulary);
""".replace('EXPRESSION', expression).replace('PAYLOAD', payload)
    a.output.write_text(sql, encoding='utf-8')
    print(json.dumps({'decisions': len(decisions), 'bytes': a.output.stat().st_size,
                      'sha256': hashlib.sha256(a.output.read_bytes()).hexdigest()}))


if __name__ == '__main__':
    main()
