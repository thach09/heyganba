"""Build and validate one manually selected, source-checked CTI HSK 2 batch."""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BATCH = ROOT / "docs/Content/hsk2-web-cross-check-batch-01-2026-10-20.json"
DEFAULT_SNAPSHOT = ROOT / "backups/evidence-recovery-2026-10-20/production-heyganba_prod_fresh7_20261020-v22-snapshot.json"
DEFAULT_SYLLABUS = ROOT / "backups/evidence-recovery-2026-10-20/cti-private-v22/reference-local-only.json"
DEFAULT_QUEUE = ROOT / "docs/Content/unmatched-official-ids-2026-10-20.json"
DEFAULT_OUTPUT = ROOT / "backend/src/main/resources/db/migration-release/V23__publish_hsk2_web_cross_checked_batch_01.sql"

SPEC = importlib.util.spec_from_file_location("approved_evidence_audit", ROOT / "scripts/audit-approved-vocabulary-evidence.py")
AUDIT = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(AUDIT)
H1_GENERATOR_SPEC = importlib.util.spec_from_file_location("hsk1_generator", ROOT / "scripts/generate-hsk1-web-supplement-migration.py")
H1_GENERATOR = importlib.util.module_from_spec(H1_GENERATOR_SPEC)
assert H1_GENERATOR_SPEC.loader is not None
H1_GENERATOR_SPEC.loader.exec_module(H1_GENERATOR)

OFFICIAL_IDS = (302, 303, 306, 315, 317, 318, 319, 320, 321, 322, 329,
                342, 344, 348, 349, 353, 355, 360, 364, 374)
EDITORIAL = {
    302: ("sở thích; yêu thích", "Danh từ; động từ", "愛好", "1dbb0dc2f82b7f1d02e1cb9d195d1eb64f2866cf062a8b323b1fbfe790b59529", "576200012"),
    303: ("màu trắng", "Danh từ", "白色", "a33beeba28dac65baf8b0192d1a951dddd257809f2ed5537e9d1cf756e7d11d3", "006000059"),
    306: ("giúp đỡ; giúp một tay", "Động từ", "幫忙", "962f7fc5a0ecb9729f2e798609c4177c8a81f543e0dd3caa4ad8fa5f036c41ba", "014000004"),
    315: ("nhà ga; bến xe", "Danh từ", "車站", "64aa2e1e721d918e6faecfb8fff7c75ac06d6fd50e61965eeea6d92c0f56c173", "466800022"),
    317: ("ra nước ngoài", "Động từ", "出國", "540c2cce0815d133863ac7f588153a8b1a6bd4caa668941e37d304775b1ff8bf", "480100032"),
    318: ("đi ra; xuất hiện", "Động từ", "出來", "cd21edeb85d6e624dec346144b32ec3d81e932fb6bd83c7157a6dbda71143c4f", "480100023"),
    319: ("ra khỏi nhà", "Động từ", "出門", "27369d785b9b1d939a3ab54c36572ab60d152575e4965745ff4aef2ee8da0c1b", "480100008"),
    320: ("đi ra ngoài", "Động từ", "出去", "bc1a61a04bf3aa1e1d611790fe7af70ccf8bd03d2963f10cf88b4c0d26e70108", "480100057"),
    321: ("giường", "Danh từ", "床", "a6e5437e798c8e03a0f226fd52c81354588687f16be8aba070d289d12e732b4e", "4869"),
    322: ("từ ngữ; lời", "Danh từ", "詞", "c9ac9af44046c2f1b7c8dbded269d9591e1db5fb759304cff56da57c1304f68e", "5426"),
    329: ("mở; mở ra", "Động từ", "打開", "0a0e28ef1ef65ac04acf47e061b63a4567afa8ae56c1e41a58782a7fb4c1e3ae", "101400075"),
    342: ("trường trung học phổ thông", "Danh từ", "高中", "aa47fbcba4dc161acac98f32c96b6eccdfa3d1a1b3c96c27e67bf0c4a97be876", "224000061"),
    344: ("tầm vóc; chiều cao", "Danh từ", "個子", "ee6c34920d9cce42d17db633593755041f9c902526173f506bbf8abd84e1b119", "222500014"),
    348: ("qua đây; đến đây", "Động từ", "過來", "a408dfd81541f6ad799d281ab849a86c470ede367aa7f71246f9dde230c320a1", "240400014"),
    349: ("đón Tết; ăn Tết Nguyên đán", "Động từ", "過年", "9c0e27749d68834fa297ac08d8cb60fd76136b90cc1940ff7af3509a8ce63c9b", "240400012"),
    353: ("màu đen", "Danh từ", "黑色", "385bc1e74ce406f7fe70728ba1ed2963851199ae0e4657954ae1e1f233de0777", "271700023"),
    355: ("màu đỏ", "Danh từ", "紅色", "51ed0f961760343db42068d42b807f4f5f74f4ed5722e41b31de0481ed4d2bf3", "299300029"),
    360: ("xấu; hỏng", "Tính từ", "壞", "0478cb3d5acd6eb75a13d7c42c41f313c807b1d2657184bfadaaa733d2512e55", "2883"),
    364: ("vé máy bay", "Danh từ", "機票", "08c206f7962b7d5b104fcebdbf45bfaaa5f3b49fb6d12fe749907e41585539b4", "302000002"),
    374: ("thường xuyên; thường", "Phó từ", "經常", "81cc36d8e9fae4aaeb759f30d82302c845ffbd3aba2e0572d2b0adb23d2c8ec3", "338000026"),
}


def build_batch(snapshot_path: Path, syllabus_path: Path, queue_path: Path, source_dir: Path) -> dict:
    snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
    syllabus = json.loads(syllabus_path.read_text(encoding="utf-8"))
    queue = json.loads(queue_path.read_text(encoding="utf-8"))
    assert queue["syllabusVersion"] == "CTI HSK 3.0 2025-11"
    missing = set(queue["missingOfficialIds"]["2"])
    assert set(OFFICIAL_IDS) <= missing, "A selected ID is no longer unmatched; reconcile before regenerating."
    assert len(OFFICIAL_IDS) == len(set(OFFICIAL_IDS)) == 20
    syllabus_by_id = {row["id"]: row for row in syllabus}
    source_hashes, cedict, moe = AUDIT.load_sources(source_dir)
    cti_path = source_dir / "cti-hsk3-2025-11.pdf"
    source_hashes["cti-hsk3-2025-11.pdf"] = AUDIT.sha256(cti_path)
    assert source_hashes["cti-hsk3-2025-11.pdf"] == AUDIT.CTI_SHA256
    already = {(row["word"], AUDIT.norm_reading(row.get("pinyin") or row.get("reading"))) for row in snapshot["vocabulary"]}
    items = []
    for official_id in OFFICIAL_IDS:
        official_row = syllabus_by_id[official_id]
        assert official_row["primaryLevel"] == "2"
        meaning_vi, part_of_speech, traditional, cedict_id, moe_id = EDITORIAL[official_id]
        lexical_key = (official_row["word"], AUDIT.norm_reading(official_row["pinyin"]))
        assert lexical_key not in already, f"Would duplicate a current vocabulary identity: {official_row['word']}"
        cedict_entry = cedict[cedict_id]
        assert cedict_entry["simplified"] == official_row["word"]
        assert cedict_entry["traditional"] == traditional
        assert AUDIT.norm_reading(cedict_entry["pinyin"]) == lexical_key[1]
        cedict_source_reading = cedict_entry["pinyin"]
        moe_entry = moe[moe_id]
        assert moe_entry["word"] == traditional
        assert AUDIT.norm_reading(moe_entry["pinyin"]) == lexical_key[1]
        assert moe_entry["definition"].strip()
        content = {
            "word": official_row["word"], "traditional": traditional, "pinyin": official_row["pinyin"],
            "pinyin_normalized": None, "meaning_vi": meaning_vi, "han_viet": None,
            "example_zh": None, "example_pinyin": None, "example_vi": None,
            "hsk_level": 2, "part_of_speech": part_of_speech,
            "curriculum_version": "INTERNAL_WEB_SUPPLEMENT_2026_10_20",
        }
        accessed = "2026-10-20T06:27:51Z"
        evidence = {
            "curriculumVersion": "INTERNAL_WEB_SUPPLEMENT_2026_10_20",
            "sourceVersion": "WEB-2026-10-20_CC-CEDICT-20261019_MOE-20260929",
            "lexicalSourceRef": "Per-entry source ancestry and IDs in verification_evidence_json",
            "meaningSourceRef": "Vietnamese meanings and part-of-speech labels are editorially compiled from the selected CC-CEDICT and Taiwan MOE definitions and usage; neither source provides Vietnamese translations.",
            "hanVietSourceRef": None, "exampleSourceRef": None, "hskLevel": 2,
            "verificationMethod": "WEB_CROSS_CHECKED",
            "verificationPolicyVersion": "WEB_CROSS_CHECKED_2026_10_20_V1",
            "sources": [
                {"provider": "MDBG CC-CEDICT downloadable release", "dataFamily": "CC_CEDICT",
                 "reference": "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz",
                 "entryId": cedict_id, "subjectWord": official_row["word"], "subjectReading": official_row["pinyin"],
                 "accessedAt": accessed, "accessStatus": "RETRIEVED",
                 "supports": ["WORD", "READING", "MEANING", "PART_OF_SPEECH"],
                 "observation": f"The pinned CC-CEDICT record stores numbered-tone Pinyin {cedict_source_reading!r}; its tone-marked rendering matches this exact headword and the independent MOE reading. Vietnamese is editorial.",
                 "snapshotSha256": source_hashes["cedict.gz"]},
                {"provider": "Taiwan MOE Concise Mandarin Dictionary 20260929", "dataFamily": "TAIWAN_MOE",
                 "reference": "https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/download/dict_concised_2014_20260929.zip",
                 "entryId": moe_id, "subjectWord": traditional, "subjectReading": moe_entry["pinyin"],
                 "accessedAt": accessed, "accessStatus": "RETRIEVED",
                 "supports": ["WORD", "READING", "MEANING", "PART_OF_SPEECH"],
                 "observation": "The pinned MOE entry was inspected for this exact traditional headword, pronunciation and definition; Vietnamese is editorial.",
                 "snapshotSha256": source_hashes["moe-concise.zip"]},
                {"provider": "Chinese Testing International syllabus 2025-11", "dataFamily": "CTI_HSK_SYLLABUS",
                 "reference": "https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf",
                 "entryId": str(official_id), "subjectWord": official_row["word"], "subjectReading": official_row["pinyin"],
                 "accessedAt": accessed, "accessStatus": "RETRIEVED", "supports": ["HSK_LEVEL", "WORD", "READING"],
                 "observation": "Confirms this official CTI ID, spelling, tone-marked Pinyin and primary HSK 2 level only; it does not support the Vietnamese meaning or part of speech.",
                 "snapshotSha256": source_hashes["cti-hsk3-2025-11.pdf"]},
            ],
            "publishHanViet": False, "publishExamples": False,
        }
        item = {
            "content": content,
            "contentDigest": H1_GENERATOR.digest(content),
            "evidence": evidence,
            "officialClassification": {
                "entryId": official_id, "syllabusVersion": "CTI_HSK_3.0_2025-11",
                "primaryLevel": "2", "word": official_row["word"], "pinyin": official_row["pinyin"],
            },
            "decision": "APPROVE_CORE_ONLY", "meaningViEditorial": True,
            "hanVietAndExamplesPublished": False,
        }
        result = AUDIT.audit_item(item, cedict, moe, source_hashes, syllabus_by_id, new_web_batch_level=2)
        assert result["officialClassificationStatus"] == "CTI_PRIMARY_LEVEL_2"
        already.add(lexical_key)
        items.append(item)
    return {
        "batchId": "CTI_HSK3_2025_11_LEVEL_2_SUPPLEMENT_01",
        "asOf": "2026-10-20", "officialSyllabusVersion": "CTI_HSK_3.0_2025-11",
        "officialLevel": "2", "courseGrouping": "INTERNAL_WEB_SUPPLEMENT_2026_10_20",
        "policy": "WEB_CROSS_CHECKED_2026_10_20_V1",
        "method": "Manually selected 20 unmatched official IDs; reconciled every source entry and current lexical identity. No bulk syllabus import.",
        "coverageBefore": {"mappedOfficialIds": 66, "unmatchedOfficialIds": 134},
        "coverageAfter": {"mappedOfficialIds": 86, "unmatchedOfficialIds": 114},
        "sourceSnapshotSha256": {
            "CC_CEDICT": source_hashes["cedict.gz"], "TAIWAN_MOE": source_hashes["moe-concise.zip"],
            "CTI_HSK_SYLLABUS": source_hashes["cti-hsk3-2025-11.pdf"],
        },
        "replaySafe": True,
        "items": items,
    }


def render(batch: dict, batch_path: Path) -> str:
    payload = json.dumps(batch["items"], ensure_ascii=False, separators=(",", ":"))
    assert "$hsk2_manifest$" not in payload
    source_label = batch_path.resolve().relative_to(ROOT).as_posix()
    return f"""-- Generated from {source_label}.
-- Source-verified core-only HSK 2 batch; meanings/POS are editorial, Han Viet/examples remain NULL.
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

CREATE OR REPLACE FUNCTION pg_temp.hsk_batch_digest(v vocabulary) RETURNS text
LANGUAGE sql IMMUTABLE AS $digest$
 SELECT encode(sha256(convert_to(length(COALESCE(word,''))::text || ':' || COALESCE(word,'') || length(COALESCE(COALESCE(pinyin,reading),''))::text || ':' || COALESCE(COALESCE(pinyin,reading),'') || length(COALESCE(COALESCE(meaning_vi,meaning),''))::text || ':' || COALESCE(COALESCE(meaning_vi,meaning),'') || length(COALESCE(COALESCE(han_viet,sino_vietnamese),''))::text || ':' || COALESCE(COALESCE(han_viet,sino_vietnamese),'') || length(COALESCE(COALESCE(example_zh,example_sentence),''))::text || ':' || COALESCE(COALESCE(example_zh,example_sentence),'') || length(COALESCE(COALESCE(example_pinyin,example_reading),''))::text || ':' || COALESCE(COALESCE(example_pinyin,example_reading),'') || length(COALESCE(COALESCE(example_vi,example_meaning),''))::text || ':' || COALESCE(COALESCE(example_vi,example_meaning),'') || length(COALESCE(hsk_level::text,''))::text || ':' || COALESCE(hsk_level::text,'') || length(COALESCE(part_of_speech,''))::text || ':' || COALESCE(part_of_speech,''), 'UTF8')), 'hex') FROM (SELECT (v).*) fields
$digest$;

DO $migration$
DECLARE
    item jsonb; content jsonb; evidence jsonb; official jsonb;
    vocabulary_id bigint; lesson_id bigint; current_digest text;
    mapped_id bigint; mapped_digest text; mapped_word text; mapped_pinyin text; mapped_level smallint;
BEGIN
    INSERT INTO lessons (slug,title,description,curriculum_level,order_index)
    VALUES ('cti-hsk3-level2-verified-batch-01','HSK 2 · Từ đã đối chiếu 01',
      '20 mục chọn lọc đối chiếu theo CTI HSK 3.0 (2025-11); không đại diện toàn bộ HSK 2, nội dung cấp này vẫn đang được bổ sung.',
      'HSK2',2001)
    ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO STRICT lesson_id FROM lessons WHERE slug='cti-hsk3-level2-verified-batch-01'
      AND curriculum_level='HSK2' AND order_index=2001;

    FOR item IN SELECT value FROM jsonb_array_elements($hsk2_manifest${payload}$hsk2_manifest$::jsonb)
    LOOP
      content:=item->'content'; evidence:=item->'evidence'; official:=item->'officialClassification';
      SELECT id INTO vocabulary_id FROM vocabulary
       WHERE word=content->>'word' AND COALESCE(pinyin,reading)=content->>'pinyin' ORDER BY id LIMIT 1;
      IF vocabulary_id IS NULL THEN
        INSERT INTO vocabulary (word,traditional,pinyin,reading,meaning_vi,meaning,part_of_speech,hsk_level,
          lesson_number,lesson_id,review_status,needs_human_check,source_ref,curriculum_version,source_version,
          lexical_source_ref,meaning_source_ref,verification_method,verification_policy_version,
          verification_evidence_json,han_viet,sino_vietnamese,example_zh,example_sentence,example_pinyin,
          example_reading,example_vi,example_meaning,han_viet_verified,example_verified,
          provenance_content_sha256,provenance_recorded_at,reviewed_at,reviewed_by)
        VALUES (content->>'word',content->>'traditional',content->>'pinyin',content->>'pinyin',
          content->>'meaning_vi',content->>'meaning_vi',content->>'part_of_speech',2,2001,lesson_id,
          'APPROVED',false,'WEB_CROSS_CHECKED HSK2 batch 01',content->>'curriculum_version',
          evidence->>'sourceVersion',evidence->>'lexicalSourceRef',evidence->>'meaningSourceRef',
          evidence->>'verificationMethod',evidence->>'verificationPolicyVersion',evidence::text,
          NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,false,false,item->>'contentDigest',
          (evidence->'sources'->0->>'accessedAt')::timestamptz,NULL,NULL)
        RETURNING id INTO vocabulary_id;
      ELSE
        SELECT pg_temp.hsk_batch_digest(v) INTO STRICT current_digest FROM vocabulary v WHERE v.id=vocabulary_id;
        IF current_digest IS DISTINCT FROM item->>'contentDigest'
          OR (SELECT review_status::text FROM vocabulary WHERE id=vocabulary_id)<>'APPROVED'
          OR (SELECT verification_evidence_json FROM vocabulary WHERE id=vocabulary_id) IS DISTINCT FROM evidence::text THEN
          RAISE EXCEPTION 'Lexical identity conflicts with reviewed HSK2 batch 01: %',content->>'word';
        END IF;
      END IF;
      SELECT pg_temp.hsk_batch_digest(v) INTO STRICT current_digest FROM vocabulary v WHERE v.id=vocabulary_id;
      IF current_digest IS DISTINCT FROM item->>'contentDigest'
        OR (SELECT provenance_content_sha256 FROM vocabulary WHERE id=vocabulary_id) IS DISTINCT FROM item->>'contentDigest' THEN
        RAISE EXCEPTION 'Post-import HSK2 vocabulary digest mismatch: %',content->>'word';
      END IF;
      INSERT INTO vocabulary_syllabus_classification
        (syllabus_version,official_entry_id,official_level,official_word,official_pinyin,vocabulary_id,content_digest)
      VALUES (official->>'syllabusVersion',(official->>'entryId')::integer,2,official->>'word',
        official->>'pinyin',vocabulary_id,item->>'contentDigest')
      ON CONFLICT (syllabus_version,official_entry_id) DO NOTHING;
      SELECT c.vocabulary_id,c.content_digest,c.official_word,c.official_pinyin,c.official_level
        INTO STRICT mapped_id,mapped_digest,mapped_word,mapped_pinyin,mapped_level
        FROM vocabulary_syllabus_classification c
        WHERE c.syllabus_version=official->>'syllabusVersion'
          AND c.official_entry_id=(official->>'entryId')::integer;
      IF mapped_id<>vocabulary_id OR mapped_digest IS DISTINCT FROM item->>'contentDigest'
        OR mapped_word IS DISTINCT FROM official->>'word' OR mapped_pinyin IS DISTINCT FROM official->>'pinyin'
        OR mapped_level<>2 THEN
        RAISE EXCEPTION 'Official CTI HSK2 ID already maps to different content: %',official->>'entryId';
      END IF;
    END LOOP;
END
$migration$;
DROP FUNCTION pg_temp.hsk_batch_digest(vocabulary);
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot", type=Path, default=DEFAULT_SNAPSHOT)
    parser.add_argument("--syllabus-reference", type=Path, default=DEFAULT_SYLLABUS)
    parser.add_argument("--unmatched-queue", type=Path, default=DEFAULT_QUEUE)
    parser.add_argument("--sources", type=Path, default=ROOT / "backups/evidence-recovery-2026-10-20/sources")
    parser.add_argument("--batch", type=Path, default=BATCH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    batch_path, output_path = args.batch.resolve(), args.output.resolve()
    batch = build_batch(args.snapshot, args.syllabus_reference, args.unmatched_queue, args.sources)
    batch_path.parent.mkdir(parents=True, exist_ok=True)
    batch_path.write_text(json.dumps(batch, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    sql = render(batch, batch_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(sql, encoding="utf-8", newline="\n")
    staging_output = ROOT / "backend/src/main/resources/db/migration-staging" / output_path.name
    staging_output.parent.mkdir(parents=True, exist_ok=True)
    staging_output.write_bytes(output_path.read_bytes())
    print(json.dumps({"records": len(batch["items"]), "officialIds": OFFICIAL_IDS,
                      "batch": str(batch_path.relative_to(ROOT)), "sql": str(output_path.relative_to(ROOT)),
                      "sha256": hashlib.sha256(output_path.read_bytes()).hexdigest()}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
