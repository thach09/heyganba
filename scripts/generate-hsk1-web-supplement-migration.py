"""Render one source-checked HSK 1 batch into an idempotent Flyway migration."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BATCH = ROOT / "docs/Content/hsk1-web-cross-check-batch-02-2026-10-20.json"
DEFAULT_OUTPUT = ROOT / "backend/src/main/resources/db/migration-release/V18__publish_hsk1_web_cross_checked_batch_02.sql"
CTI_SHA256 = "ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941"
CEDICT_SHA256 = "2d42d41f75df8708d9d9b236d8ae15ecf1cef525aef8ebb8499a74cb09e1b096"
MOE_SHA256 = "5bab99dac44ad7a6ccdcf481e770e8aca05ede7445c4cc25b8199e0e5df64cf2"
FIELDS = ("word", "pinyin", "meaning_vi", "han_viet", "example_zh",
          "example_pinyin", "example_vi", "hsk_level", "part_of_speech")


def digest(content: dict) -> str:
    values = [str(content.get(key) if content.get(key) is not None else "") for key in FIELDS]
    if any(ord(character) > 65535 for value in values for character in value):
        raise ValueError("PostgreSQL char_length digest only supports BMP content")
    return hashlib.sha256("".join(f"{len(value)}:{value}" for value in values).encode("utf-8")).hexdigest()


def validate(batch: dict) -> None:
    assert batch["officialSyllabusVersion"] == "CTI_HSK_3.0_2025-11"
    assert batch["courseGrouping"] == "INTERNAL_WEB_SUPPLEMENT_2026_10_20"
    assert batch["policy"] == "WEB_CROSS_CHECKED_2026_10_20_V1"
    assert 0 < len(batch["items"]) <= 20
    lexical = set()
    official_ids = set()
    for item in batch["items"]:
        content, evidence, official = item["content"], item["evidence"], item["officialClassification"]
        assert item["decision"] == "APPROVE_CORE_ONLY"
        assert item["meaningViEditorial"] is True
        assert item["hanVietAndExamplesPublished"] is False
        assert digest(content) == item["contentDigest"]
        assert content["hsk_level"] == 1 and content["curriculum_version"] == batch["courseGrouping"]
        assert all(content.get(field) is None for field in ("han_viet", "example_zh", "example_pinyin", "example_vi"))
        assert evidence["verificationMethod"] == "WEB_CROSS_CHECKED"
        assert evidence["verificationPolicyVersion"] == batch["policy"]
        assert not evidence["publishHanViet"] and not evidence["publishExamples"]
        assert official["syllabusVersion"] == batch["officialSyllabusVersion"]
        assert official["primaryLevel"] == "1" and official["word"] == content["word"]
        assert official["pinyin"] == content["pinyin"]
        assert evidence["hskLevel"] == 1
        assert {source["dataFamily"] for source in evidence["sources"]} == {
            "CC_CEDICT", "TAIWAN_MOE", "CTI_HSK_SYLLABUS"
        }
        for source in evidence["sources"]:
            assert source["accessStatus"] == "RETRIEVED"
            assert source["subjectWord"] == content["word"]
            assert source["subjectReading"] == content["pinyin"]
            if source["dataFamily"] == "CC_CEDICT":
                assert source["snapshotSha256"] == CEDICT_SHA256
            elif source["dataFamily"] == "TAIWAN_MOE":
                assert source["snapshotSha256"] == MOE_SHA256
            elif source["dataFamily"] == "CTI_HSK_SYLLABUS":
                assert source["snapshotSha256"] == CTI_SHA256
                assert source["supports"] == ["HSK_LEVEL", "WORD", "READING"]
                assert source["entryId"] == str(official["entryId"])
        key = (content["word"], content["pinyin"])
        assert key not in lexical, f"Repeated lexical identity in this batch: {key}"
        lexical.add(key)
        assert official["entryId"] not in official_ids
        official_ids.add(official["entryId"])


def render(batch: dict, source_path: Path) -> str:
    payload = json.dumps(batch["items"], ensure_ascii=False, separators=(",", ":"))
    assert "$hsk2_manifest$" not in payload
    source_label = source_path.resolve().relative_to(ROOT).as_posix()
    return f"""-- Generated from {source_label}.
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

    FOR item IN SELECT value FROM jsonb_array_elements($hsk2_manifest${payload}$hsk2_manifest$::jsonb)
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
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=Path, default=DEFAULT_BATCH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    batch_path = args.batch.resolve()
    output_path = args.output.resolve()
    batch = json.loads(batch_path.read_text(encoding="utf-8"))
    validate(batch)
    sql = render(batch, batch_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(sql, encoding="utf-8", newline="\n")
    staging_output = ROOT / "backend/src/main/resources/db/migration-staging" / output_path.name
    staging_output.parent.mkdir(parents=True, exist_ok=True)
    staging_output.write_bytes(output_path.read_bytes())
    print(json.dumps({"records": len(batch["items"]), "sql": str(output_path.relative_to(ROOT)),
                      "sha256": hashlib.sha256(output_path.read_bytes()).hexdigest()}, indent=2))


if __name__ == "__main__":
    main()
