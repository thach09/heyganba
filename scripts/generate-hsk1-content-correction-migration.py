"""Repair Vietnamese text damaged during generation of HSK 1 batches 02-04.

The historical V18-V20 checksums remain fixed. This generator updates the
reviewed source manifests and adds V22 as a guarded, replay-safe correction.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BATCHES = [
    ROOT / "docs/Content/hsk1-web-cross-check-batch-02-2026-10-20.json",
    ROOT / "docs/Content/hsk1-web-cross-check-batch-03-2026-10-20.json",
    ROOT / "docs/Content/hsk1-web-cross-check-batch-04-2026-10-20.json",
]
MIGRATION_NAME = "V22__repair_hsk1_batch_text_encoding.sql"
MIGRATION = ROOT / "backend/src/main/resources/db/migration-release" / MIGRATION_NAME
STAGING_MIGRATION = ROOT / "backend/src/main/resources/db/migration-staging" / MIGRATION_NAME
RELEASE_MANIFEST = ROOT / "backend/src/main/resources/db/release-migrations-manifest.json"
REPORT = ROOT / "docs/Content/hsk1-content-correction-2026-10-20.json"

spec = importlib.util.spec_from_file_location(
    "supplement_generator", ROOT / "scripts/generate-hsk1-web-supplement-migration.py"
)
supplement = importlib.util.module_from_spec(spec)
spec.loader.exec_module(supplement)

# Meanings are editorial Vietnamese renderings of the exact sense supported by
# the linked CC-CEDICT and Taiwan MOE entries. They are not source translations.
CORRECTIONS = {
    "明年": ("năm sau", "Danh từ chỉ thời gian", None),
    "那些": ("những ... kia", "Đại từ chỉ định", None),
    "你们": ("các bạn", "Đại từ nhân xưng", None),
    "女士": ("quý bà; bà (cách gọi lịch sự)", "Danh từ / danh xưng", None),
    "请问": ("xin hỏi; cho hỏi", "Cụm từ hỏi lịch sự", None),
    "上课": ("lên lớp; vào tiết học", "Động từ", None),
    "上学": ("đi học", "Động từ", None),
    "书店": ("hiệu sách; nhà sách", "Danh từ", None),
    "睡": ("ngủ", "Động từ", None),
    "他们": ("họ (nam hoặc nhóm hỗn hợp)", "Đại từ nhân xưng", None),
    "它们": ("chúng (chỉ sự vật hoặc động vật)", "Đại từ nhân xưng chỉ sự vật", None),
    "她们": ("họ (nhóm nữ)", "Đại từ nhân xưng chỉ nữ giới", None),
    "晚饭": ("bữa tối", "Danh từ", None),
    "下班": ("tan làm; hết giờ làm", "Động từ", None),
    "下课": ("tan học; hết tiết", "Động từ", None),
    "小朋友": ("trẻ em; bạn nhỏ", "Danh từ", None),
    "小学": ("trường tiểu học", "Danh từ", None),
    "小学生": ("học sinh tiểu học", "Danh từ", None),
    "有点儿": ("hơi; một chút", "Phó từ chỉ mức độ", None),
    "做饭": ("nấu ăn; chuẩn bị bữa ăn", "Động từ", None),
    "边": ("bên; cạnh; mép", "Danh từ", "邊"),
    "好看": ("đẹp; dễ nhìn", "Tính từ", None),
    "见": ("thấy; nhìn thấy", "Động từ", "見"),
    "口": ("miệng", "Danh từ", None),
    "没有": ("không có; không tồn tại", "Động từ phủ định", None),
    "面包": ("bánh mì", "Danh từ", "麵包"),
    "哪里": ("ở đâu; nơi nào", "Đại từ nghi vấn chỉ nơi chốn", "哪裡"),
    "男": ("nam; đàn ông", "Danh từ", None),
    "女": ("nữ; phụ nữ", "Danh từ", None),
    "事": ("sự việc; chuyện", "Danh từ", None),
    "说": ("nói; kể", "Động từ", "說"),
    "天": ("ngày", "Danh từ chỉ thời gian", None),
    "晚": ("buổi tối; đêm", "Danh từ chỉ thời gian", None),
    "学": ("học; học tập", "Động từ", "學"),
    "雨": ("mưa", "Danh từ", None),
    "早饭": ("bữa sáng", "Danh từ", "早飯"),
    "这个": ("cái này", "Đại từ chỉ định", "這個"),
    "这里": ("ở đây; nơi này", "Từ chỉ nơi chốn", "這裡"),
    "这儿": ("ở đây; chỗ này", "Từ chỉ nơi chốn", "這兒"),
    "这些": ("những ... này", "Đại từ chỉ định", "這些"),
    "对": ("đúng; chính xác", "Tính từ", "對"),
    "们": ("hậu tố chỉ số nhiều", "Hậu tố / trợ từ", "們"),
    "只": ("con (lượng từ cho động vật)", "Lượng từ", "隻"),
}

EDITORIAL_NOTE = (
    "Vietnamese meanings and part-of-speech labels are editorially compiled from "
    "the selected CC-CEDICT and Taiwan MOE definitions and usage; they are not "
    "Vietnamese translations supplied by either source."
)


def main() -> None:
    changes = []
    sql_items = []
    seen: set[str] = set()
    previous_report = json.loads(REPORT.read_text(encoding="utf-8")) if REPORT.exists() else None
    previous_records = {record["word"]: record for record in (previous_report or {}).get("records", [])}
    for path in BATCHES:
        batch = json.loads(path.read_text(encoding="utf-8"))
        for item in batch["items"]:
            content = item["content"]
            word = content["word"]
            assert word in CORRECTIONS, f"Unexpected correction target: {word}"
            assert word not in seen, f"Duplicate correction target: {word}"
            seen.add(word)
            meaning, part_of_speech, traditional = CORRECTIONS[word]
            old_content = dict(content)
            previous = previous_records.get(word)
            if previous:
                old_meaning = previous["oldMeaningVi"]
                old_part_of_speech = previous["oldPartOfSpeech"]
                old_traditional = previous["oldTraditional"]
                old_digest = previous["oldDigest"]
                assert old_content["meaning_vi"] == meaning
                assert old_content["part_of_speech"] == part_of_speech
                assert old_content.get("traditional") == (traditional or old_traditional)
                assert item["contentDigest"] == previous["newDigest"]
            else:
                old_meaning = old_content["meaning_vi"]
                old_part_of_speech = old_content["part_of_speech"]
                old_traditional = old_content.get("traditional")
                old_digest = item["contentDigest"]
            content["meaning_vi"] = meaning
            content["part_of_speech"] = part_of_speech
            if traditional is not None:
                content["traditional"] = traditional
            item["contentDigest"] = supplement.digest(content)
            item["evidence"]["meaningSourceRef"] = EDITORIAL_NOTE
            for source in item["evidence"]["sources"]:
                if source["dataFamily"] == "CTI_HSK_SYLLABUS":
                    source["observation"] = (
                        "Confirms the official CTI ID, spelling, tone-marked Pinyin, and HSK 1 level only; "
                        "it does not support Vietnamese meaning or part of speech."
                    )
                else:
                    source["observation"] = (
                        "The pinned dictionary entry was checked for the exact headword, tone-marked reading, "
                        "definition, and part of speech; the Vietnamese rendering is editorial."
                    )
            changes.append({
                "word": word,
                "pinyin": content["pinyin"],
                "oldMeaningVi": old_meaning,
                "newMeaningVi": meaning,
                "oldPartOfSpeech": old_part_of_speech,
                "newPartOfSpeech": part_of_speech,
                "oldTraditional": old_traditional,
                "newTraditional": content.get("traditional"),
                "oldDigest": old_digest,
                "newDigest": item["contentDigest"],
                "curriculumVersion": content["curriculum_version"],
                "sourceEntryIds": [
                    {"family": source["dataFamily"], "entryId": source["entryId"]}
                    for source in item["evidence"]["sources"]
                ],
                "sourceSnapshotSha256": [source["snapshotSha256"] for source in item["evidence"]["sources"]],
            })
            sql_items.append({
                "word": word,
                "pinyin": content["pinyin"],
                "hsk_level": content["hsk_level"],
                "curriculum_version": content["curriculum_version"],
                "oldMeaning": old_meaning,
                "oldPartOfSpeech": old_part_of_speech,
                "oldDigest": old_digest,
                "content": content,
                "evidence": item["evidence"],
                "newDigest": item["contentDigest"],
            })
        path.write_text(json.dumps(batch, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")

    assert len(seen) == len(CORRECTIONS) == 43
    payload = json.dumps(sql_items, ensure_ascii=False, separators=(",", ":"))
    assert "$v22_correction$" not in payload
    fields = [
        "word", "COALESCE(pinyin,reading)", "COALESCE(meaning_vi,meaning)",
        "COALESCE(han_viet,sino_vietnamese)", "COALESCE(example_zh,example_sentence)",
        "COALESCE(example_pinyin,example_reading)", "COALESCE(example_vi,example_meaning)",
        "hsk_level::text", "part_of_speech",
    ]
    expression = " || ".join(
        "length(COALESCE(%s,''))::text || ':' || COALESCE(%s,'')" % (field, field)
        for field in fields
    )
    sql = """-- Generated by scripts/generate-hsk1-content-correction-migration.py.
-- Repairs UTF-8 text damage in the approved HSK 1 supplement rows from V18-V20.
-- V18-V20 checksums remain unchanged; updates are exact-identity and digest guarded.
CREATE OR REPLACE FUNCTION pg_temp.v22_vocab_digest(v vocabulary) RETURNS text
LANGUAGE sql IMMUTABLE AS $digest$
 SELECT encode(sha256(convert_to(EXPRESSION, 'UTF8')), 'hex') FROM (SELECT (v).*) fields
$digest$;
DO $v22$
DECLARE
    item jsonb; content jsonb; evidence jsonb; current_row vocabulary%ROWTYPE;
    row_count integer; current_digest text;
BEGIN
    FOR item IN SELECT value FROM jsonb_array_elements($v22_correction$PAYLOAD$v22_correction$::jsonb)
    LOOP
        content := item->'content'; evidence := item->'evidence';
        SELECT count(*) INTO row_count FROM vocabulary v
        WHERE v.word=content->>'word'
          AND COALESCE(v.pinyin,v.reading)=content->>'pinyin'
          AND v.hsk_level=(content->>'hsk_level')::smallint
          AND v.curriculum_version=content->>'curriculum_version'
          AND v.review_status='APPROVED';
        IF row_count <> 1 THEN
            RAISE EXCEPTION 'V22 expected exactly one approved identity for %, found %', content->>'word', row_count;
        END IF;
        SELECT v.* INTO STRICT current_row FROM vocabulary v
        WHERE v.word=content->>'word'
          AND COALESCE(v.pinyin,v.reading)=content->>'pinyin'
          AND v.hsk_level=(content->>'hsk_level')::smallint
          AND v.curriculum_version=content->>'curriculum_version'
          AND v.review_status='APPROVED';
        current_digest := pg_temp.v22_vocab_digest(current_row);
        IF current_digest=item->>'oldDigest'
           AND current_row.meaning_vi=item->>'oldMeaning'
           AND current_row.meaning=item->>'oldMeaning'
           AND current_row.part_of_speech=item->>'oldPartOfSpeech'
           AND current_row.provenance_content_sha256=item->>'oldDigest' THEN
            UPDATE vocabulary SET
                traditional=content->>'traditional',
                meaning_vi=content->>'meaning_vi', meaning=content->>'meaning_vi',
                part_of_speech=content->>'part_of_speech',
                verification_evidence_json=evidence::text,
                provenance_content_sha256=item->>'newDigest',
                provenance_recorded_at=CURRENT_TIMESTAMP
            WHERE id=current_row.id;
        ELSIF current_digest=item->>'newDigest'
           AND current_row.meaning_vi=content->>'meaning_vi'
           AND current_row.meaning=content->>'meaning_vi'
           AND current_row.part_of_speech=content->>'part_of_speech'
           AND current_row.traditional IS NOT DISTINCT FROM content->>'traditional'
           AND current_row.provenance_content_sha256=item->>'newDigest' THEN
            NULL; -- Safe replay after the exact corrected row is already present.
        ELSE
            RAISE EXCEPTION 'V22 row content, source digest, or optional fields changed for ID %', current_row.id;
        END IF;
        SELECT v.* INTO STRICT current_row FROM vocabulary v WHERE v.id=current_row.id;
        IF pg_temp.v22_vocab_digest(current_row) <> item->>'newDigest'
           OR current_row.provenance_content_sha256 <> item->>'newDigest'
           OR current_row.han_viet IS NOT NULL OR current_row.sino_vietnamese IS NOT NULL
           OR current_row.example_zh IS NOT NULL OR current_row.example_sentence IS NOT NULL
           OR current_row.example_pinyin IS NOT NULL OR current_row.example_reading IS NOT NULL
           OR current_row.example_vi IS NOT NULL OR current_row.example_meaning IS NOT NULL
           OR current_row.han_viet_verified OR current_row.example_verified THEN
            RAISE EXCEPTION 'V22 corrected content digest or unpublished fields failed for ID %', current_row.id;
        END IF;
    END LOOP;
END
$v22$;
DROP FUNCTION pg_temp.v22_vocab_digest(vocabulary);
""".replace("EXPRESSION", expression).replace("PAYLOAD", payload)
    MIGRATION.write_text(sql, encoding="utf-8", newline="\n")
    STAGING_MIGRATION.write_bytes(MIGRATION.read_bytes())

    manifest = json.loads(RELEASE_MANIFEST.read_text(encoding="utf-8"))
    versions = [entry["version"] for entry in manifest["migrations"]]
    migration_sha = hashlib.sha256(MIGRATION.read_bytes()).hexdigest()
    if versions == list(range(1, 22)):
        manifest["migrations"].append({
            "version": 22,
            "fileName": MIGRATION_NAME,
            "sourcePath": f"backend/src/main/resources/db/migration-staging/{MIGRATION_NAME}",
            "packagedPath": f"db/migration-release/{MIGRATION_NAME}",
            "sha256": migration_sha,
        })
    else:
        assert versions == list(range(1, 23)), "Unexpected release migration history"
        assert manifest["migrations"][-1]["fileName"] == MIGRATION_NAME
        assert manifest["migrations"][-1]["sha256"] == migration_sha
    RELEASE_MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")

    report = {
        "asOf": "2026-10-20",
        "finding": "A PowerShell-to-Python encoding conversion replaced Vietnamese diacritics in batch 02-04 content and evidence strings with literal question marks. Their prior content digests matched the damaged text, so digest equality alone did not prove the meanings were correct.",
        "repair": "Re-authored 43 Vietnamese editorial meanings and part-of-speech labels against the recorded CC-CEDICT and Taiwan MOE entry IDs. Corrected the traditional form of 只 to 隻. CTI continues to support only official ID, spelling, tone-marked Pinyin, and HSK level.",
        "policy": "WEB_CROSS_CHECKED_2026_10_20_V1; no human-review requirement",
        "rowsCorrected": len(changes),
        "migration": {"version": 22, "fileName": MIGRATION_NAME, "sha256": migration_sha,
                      "replaySafe": True, "historicalChecksumsV1ThroughV21Preserved": True},
        "sourceSnapshots": {
            "CC_CEDICT": "2d42d41f75df8708d9d9b236d8ae15ecf1cef525aef8ebb8499a74cb09e1b096",
            "TAIWAN_MOE": "5bab99dac44ad7a6ccdcf481e770e8aca05ede7445c4cc25b8199e0e5df64cf2",
            "CTI_HSK_3.0_2025-11": "ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941",
        },
        "records": changes,
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"rowsCorrected": len(changes), "migrationSha256": migration_sha,
                      "report": str(REPORT.relative_to(ROOT))}, ensure_ascii=False))


if __name__ == "__main__":
    main()
