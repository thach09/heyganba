"""Reconcile every published row with pinned dictionary and syllabus snapshots.

Dictionary extracts remain outside the repository because the MOE terms do not
permit redistribution of source text. The generated row-level audit belongs in
the ignored evidence directory for the same reason.
"""
import argparse
import copy
import gzip
import hashlib
import importlib.util
import io
import json
import re
import zipfile
from collections import Counter
from pathlib import Path

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("queue_audit", ROOT / "scripts/audit-vocabulary-evidence.py")
QUEUE_AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(QUEUE_AUDIT)
CORE = {"WORD", "READING", "MEANING", "PART_OF_SPEECH"}
SOURCE_FILES = {"CC_CEDICT": "cedict.gz", "TAIWAN_MOE": "moe-concise.zip"}
KNOWN_LIVE_WIKTIONARY = {
    "你好#Chinese": {"word": "你好", "reading": "nǐ hǎo", "meaning": "hello; hi", "pos": "interjection"},
    "謝謝#Chinese": {"word": "謝謝", "reading": "xièxie", "meaning": "thank you; thanks", "pos": "interjection/verb"},
    "不客氣#Chinese": {"word": "不客氣", "reading": "bù kèqi", "meaning": "response meaning you are welcome", "pos": "interjection"},
    "對不起#Chinese": {"word": "對不起", "reading": "duìbuqǐ", "meaning": "sorry; excuse me", "pos": "interjection"},
}
CONTENT_DIGEST_FIELDS = ["word", "pinyin", "meaning_vi", "han_viet", "example_zh",
                         "example_pinyin", "example_vi", "hsk_level", "part_of_speech"]
CTI_SHA256 = "ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941"
COLLINS_FILE = ROOT / "docs/Content/collins-entry-observations-2026-10-20.json"
COLLINS_ENTRIES = {entry["entryId"]: entry for entry in json.loads(COLLINS_FILE.read_text(encoding="utf-8"))["entries"]}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def norm_reading(value: str) -> str:
    return QUEUE_AUDIT.normalized(QUEUE_AUDIT.tones(value or ""))


def content_digest(content: dict) -> str:
    values = [str(content.get(key) if content.get(key) is not None else "")
              for key in CONTENT_DIGEST_FIELDS]
    if any(ord(char) > 65535 for value in values for char in value):
        raise ValueError("The SQL digest implementation supports BMP content only")
    return hashlib.sha256("".join(f"{len(value)}:{value}" for value in values).encode()).hexdigest()


def load_sources(source_dir: Path) -> tuple[dict[str, str], dict[str, list[dict]], dict[str, list[dict]]]:
    hashes = {name: sha256(source_dir / name) for name in SOURCE_FILES.values()}
    cedict = {}
    for line in gzip.decompress((source_dir / "cedict.gz").read_bytes()).decode("utf-8").splitlines():
        match = re.match(r"^(\S+) (\S+) \[([^]]+)\] /(.+)/$", line)
        if match:
            traditional, simplified, pinyin, gloss = match.groups()
            cedict[hashlib.sha256(line.encode("utf-8")).hexdigest()] = {
                "traditional": traditional, "simplified": simplified,
                "pinyin": pinyin, "gloss": gloss,
            }
    with zipfile.ZipFile(source_dir / "moe-concise.zip") as archive:
        workbook = load_workbook(io.BytesIO(archive.read(archive.namelist()[0])), read_only=True, data_only=True)
        rows = list(workbook.active.values)
    moe = {}
    for row in rows[1:]:
        if row[0] and row[9]:
            record = {"word": row[0], "entryId": str(row[1]).strip(), "pinyin": str(row[9]), "definition": row[13] or ""}
            moe.setdefault(record["entryId"], record)
    return hashes, cedict, moe


def audit_item(item: dict, cedict: dict, moe: dict, source_hashes: dict,
               syllabus_by_id: dict | None = None,
               new_web_batch_level: int | None = None) -> dict:
    content = item["content"]
    evidence = item["evidence"]
    if new_web_batch_level is not None:
        for field in ("meaning_vi", "part_of_speech", "traditional"):
            value = content.get(field)
            assert value is None or ("?" not in value and "\ufffd" not in value), \
                f"Encoding replacement character in HSK 1 content field {field} for {content['word']}"
        assert content["meaning_vi"].strip() and content["part_of_speech"].strip(), \
            f"Missing Vietnamese meaning or part of speech for {content['word']}"
    calculated_digest = content_digest(content)
    assert calculated_digest == item["contentDigest"], f"Content digest mismatch for {content['word']}"
    allowed_words = {content["word"], content.get("traditional")}
    allowed_words.discard(None)
    verified_forms = set(allowed_words)
    found_families = set()
    details = []
    support_by_family = {}
    official_evidence_rows = []
    for source in evidence["sources"]:
        family = source["dataFamily"]
        assert source.get("accessStatus") == "RETRIEVED", f"Source not recorded as retrieved for {content['word']}"
        assert source.get("subjectWord") in allowed_words, f"Source subject word mismatch for {content['word']}"
        assert norm_reading(source.get("subjectReading", "")) == norm_reading(content["pinyin"]), f"Source subject reading mismatch for {content['word']}"
        if family == "CTI_HSK_SYLLABUS":
            assert syllabus_by_id is not None, f"No local official syllabus supplied for {content['word']}"
            expected_support = {"HSK_LEVEL", "WORD", "READING"} if new_web_batch_level is not None else {"HSK_LEVEL"}
            assert set(source["supports"]) == expected_support, f"Unexpected syllabus field scope for {content['word']}"
            assert source.get("snapshotSha256") == CTI_SHA256 == source_hashes.get("cti-hsk3-2025-11.pdf"), f"CTI PDF hash mismatch for {content['word']}"
            official = item["officialClassification"]
            entry_ids = [int(value.strip()) for value in str(source["entryId"]).split(",") if value.strip()]
            assert entry_ids, f"CTI entry ID missing for {content['word']}"
            official_matches = [syllabus_by_id[entry_id] for entry_id in entry_ids if entry_id in syllabus_by_id
                                and syllabus_by_id[entry_id]["word"] in verified_forms
                                and norm_reading(syllabus_by_id[entry_id]["pinyin"]) == norm_reading(content["pinyin"])]
            assert official_matches, f"CTI entry ID not found with matching word and reading for {content['word']}"
            official_rows = official if isinstance(official, list) else [official]
            matched_official = []
            for official_row in official_matches:
                linked = [row for row in official_rows if int(row["entryId"]) == official_row["id"]]
                if linked:
                    matched_official.append((official_row, linked[0]))
            assert matched_official, f"CTI source IDs are absent from recorded classification for {content['word']}"
            assert source.get("subjectWord") in allowed_words, f"CTI subject word mismatch for {content['word']}"
            assert norm_reading(source.get("subjectReading", "")) == norm_reading(content["pinyin"]), f"CTI reading mismatch for {content['word']}"
            for official_row, linked in matched_official:
                assert official_row["primaryLevel"] == str(linked["primaryLevel"]), f"CTI official level mismatch for {content['word']}"
                official_evidence_rows.append(official_row)
            if new_web_batch_level is not None:
                assert len(matched_official) == 1 and matched_official[0][0]["primaryLevel"] == str(new_web_batch_level), \
                    f"New batch is not one unambiguous CTI HSK {new_web_batch_level} identity: {content['word']}"
                assert content["hsk_level"] == new_web_batch_level, \
                    f"New batch internal level does not match CTI HSK {new_web_batch_level}: {content['word']}"
                official_row, linked = matched_official[0]
                assert linked.get("syllabusVersion") == "CTI_HSK_3.0_2025-11", f"CTI version missing for {content['word']}"
            details.append({"family": family, "entryIds": [row[0]["id"] for row in matched_official], "snapshotSha256": CTI_SHA256,
                            "matchedOfficialEntries": [{"word": row[0]["word"], "pinyin": row[0]["pinyin"],
                                                        "primaryLevel": row[0]["primaryLevel"]} for row in matched_official],
                            "scope": "Official ID, word, reading, and HSK level only; no meaning or part-of-speech support"})
            continue
        if family == "CC_CEDICT":
            assert source.get("snapshotSha256") == source_hashes["cedict.gz"], f"CEDICT snapshot hash mismatch for {content['word']}"
            ids = [entry_id for entry_id in source["entryId"].split(",") if entry_id]
            assert ids, f"Missing CEDICT source entry IDs for {content['word']}"
            entries = [cedict[entry_id] for entry_id in ids if entry_id in cedict]
            assert len(entries) == len(ids), f"CEDICT entry ID not found in pinned snapshot for {content['word']}"
            matches = [entry for entry in entries if
                       {entry["traditional"], entry["simplified"]}.intersection(allowed_words)
                       and norm_reading(entry["pinyin"]) == norm_reading(content["pinyin"])]
            assert matches, f"CEDICT word/reading mismatch for {content['word']}"
            for entry in matches:
                verified_forms.update((entry["traditional"], entry["simplified"]))
            found_families.add(family)
            support_by_family[family] = set(source["supports"])
            details.append({"family": family, "entryIds": ids,
                            "matchedEntries": [{"traditional": e["traditional"], "simplified": e["simplified"],
                                                "pinyin": e["pinyin"], "gloss": e["gloss"]} for e in matches]})
        elif family == "TAIWAN_MOE":
            assert source.get("snapshotSha256") == source_hashes["moe-concise.zip"], f"MOE snapshot hash mismatch for {content['word']}"
            ids = [entry_id for entry_id in source["entryId"].split(",") if entry_id]
            entries = [moe[entry_id] for entry_id in ids if entry_id in moe]
            assert ids and len(entries) == len(ids), f"MOE entry ID not found in pinned snapshot for {content['word']}"
            matches = [entry for entry in entries if entry["word"] in verified_forms
                       and norm_reading(entry["pinyin"]) == norm_reading(content["pinyin"])
                       and bool(entry["definition"].strip())]
            assert matches, (f"MOE word/reading/definition mismatch for {content['word']}: "
                             f"allowed={allowed_words}, reading={content['pinyin']}, entries={entries}")
            found_families.add(family)
            support_by_family[family] = set(source["supports"])
            details.append({"family": family, "entryIds": ids,
                            "matchedEntries": [{"word": e["word"], "pinyin": e["pinyin"], "definition": e["definition"]}
                                               for e in matches]})
        elif family == "COLLINS":
            entry = COLLINS_ENTRIES[source["entryId"]]
            assert source["reference"] == entry["reference"]
            assert entry["accessStatus"] == "READABLE_WEB_RETRIEVAL"
            assert entry["directLocalHttpStatus"] == 403  # Do not misreport the direct fetch as HTTP 200.
            assert entry["word"] in allowed_words
            assert norm_reading(entry["pinyin"]) == norm_reading(content["pinyin"])
            assert content["meaning_vi"] == entry["editorialMeaningVi"]
            assert content["part_of_speech"] == {"名": "Danh từ", "动": "Động từ"}[entry["partOfSpeech"]]
            assert source["snapshotSha256"] == hashlib.sha256(json.dumps(entry, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
            found_families.add(family)
            support_by_family[family] = set(source["supports"])
            details.append({"family": family, "entryId": source["entryId"], "checkedReadablePage": entry["reference"],
                            "retrieval": "web.run open/find readable text; direct urllib HTTP 403",
                            "shortHeadwordExcerpt": entry["excerpt"], "selectedGloss": entry["selectedGloss"],
                            "reading": entry["pinyin"], "partOfSpeech": entry["partOfSpeech"],
                            "observationSha256": source["snapshotSha256"]})
        elif family == "WIKTIONARY":
            reference = KNOWN_LIVE_WIKTIONARY.get(source["entryId"])
            assert reference, f"No auditable live-page entry for {source['entryId']}"
            assert source["reference"].startswith("https://en.wiktionary.org/wiki/"), f"Unexpected Wiktionary URL for {content['word']}"
            assert reference["word"] in allowed_words, f"Wiktionary form mismatch for {content['word']}"
            assert norm_reading(reference["reading"]) == norm_reading(content["pinyin"]), f"Wiktionary reading mismatch for {content['word']}"
            found_families.add(family)
            support_by_family[family] = set(source["supports"])
            details.append({"family": family, "entryId": source["entryId"], "checkedLivePage": source["reference"],
                            "livePageSupports": reference})
        else:
            raise AssertionError(f"Unknown evidence source family {family} for {content['word']}")

    full_field_families = {family for family, support in support_by_family.items() if CORE <= support}
    assert len(full_field_families) >= 2, f"Fewer than two independent full-field families for {content['word']}"
    assert ("Editorial Vietnamese" in evidence["meaningSourceRef"]
            or item.get("meaningViEditorial") is True), f"Vietnamese gloss not identified as editorial for {content['word']}"
    assert evidence["hanVietSourceRef"] is None and evidence["exampleSourceRef"] is None
    assert not evidence["publishHanViet"] and not evidence["publishExamples"]
    official_levels = sorted({row["primaryLevel"] for row in official_evidence_rows})
    if not official_levels:
        official_status = "NO_CTI_3_0_LEVEL_CONFIRMED_KEEP_INTERNAL_SELECTION"
    elif len(official_levels) > 1:
        official_status = "AMBIGUOUS_CTI_3_0_LEVEL_DO_NOT_COUNT_AS_HSK_1_6"
    elif official_levels[0] == "7-9":
        official_status = "CTI_LEVEL_7_9_NOT_HSK_1_6"
    else:
        official_status = f"CTI_PRIMARY_LEVEL_{official_levels[0]}"
    return {"legacyId": item.get("legacyId"), "word": content["word"], "pinyin": content["pinyin"],
            "meaningVi": content["meaning_vi"], "partOfSpeech": content["part_of_speech"],
            "families": sorted(found_families), "sourceDetails": details,
            "editorialVietnameseMeaning": True, "hiddenHanVietAndExamples": True,
            "contentDigest": calculated_digest,
            "internalCourseLevel": content["hsk_level"], "officialPrimaryLevels": official_levels,
            "officialClassificationStatus": official_status,
            "status": "PINNED_SOURCE_ROWS_RECONCILED"}


def audit_optional_clearance(item: dict, clearance_by_id: dict,
                             clearance_by_lexical: dict[tuple[str, str], list[dict]]) -> dict:
    content = item["content"]
    if item.get("legacyId") is not None:
        target = clearance_by_id.get(int(item["legacyId"]))
        assert target is not None, f"No optional-field clearance row for ID {item['legacyId']}"
    else:
        key = (content["word"], norm_reading(content["pinyin"]))
        matches = clearance_by_lexical.get(key, [])
        if not matches:
            assert all(content.get(field) is None for field in ("han_viet", "example_zh", "example_pinyin", "example_vi")), \
                f"New item has unverified optional content: {key}"
            assert item["contentDigest"] == content_digest(content), f"New item digest mismatch for {key}"
            assert not item["evidence"]["publishHanViet"] and not item["evidence"]["publishExamples"]
            return {"databaseId": None, "preClearanceDigest": item["contentDigest"],
                    "postClearanceDigest": item["contentDigest"], "optionalFieldsAbsentAtInsertion": True}
        assert len(matches) == 1, f"Expected exactly one clearance row for new item {key}, found {len(matches)}"
        target = matches[0]
    if item.get("postClearanceApproval"):
        assert target["reviewStatus"] == "PENDING_REVIEW" and target["initialProvenanceDigest"] is None
        assert target["afterDigest"] == item["beforeDigest"]
        assert target["word"] == content["word"] and norm_reading(target["pinyin"]) == norm_reading(content["pinyin"])
        assert all(content.get(field) is None for field in ("han_viet", "example_zh", "example_pinyin", "example_vi"))
        assert content_digest(content) == item["contentDigest"]
        return {"databaseId": target["id"], "postClearanceDigest": target["afterDigest"],
                "postApprovalDigest": item["contentDigest"], "optionalFieldsStoredAsNull": True,
                "meaningEditedAfterClearance": item["beforeDigest"] != item["contentDigest"]}
    assert target["reviewStatus"] == "APPROVED", f"Clearance target is not approved: {content['word']}"
    assert target["word"] == content["word"]
    assert norm_reading(target["pinyin"]) == norm_reading(content["pinyin"])
    assert target["beforeDigest"] == item["contentDigest"], f"Pre-clearance digest mismatch for {content['word']}"
    assert target["initialProvenanceDigest"] == item["contentDigest"], f"Stored database digest mismatch for {content['word']}"

    cleared = copy.deepcopy(content)
    for field in ("han_viet", "example_zh", "example_pinyin", "example_vi"):
        cleared[field] = None
    expected_after = content_digest(cleared)
    assert target["afterDigest"] == expected_after, f"Post-clearance digest mismatch for {content['word']}"
    assert not item["evidence"]["publishHanViet"] and not item["evidence"]["publishExamples"]
    return {"databaseId": target["id"], "curriculumVersion": target["curriculumVersion"],
            "preClearanceDigest": target["beforeDigest"], "postClearanceDigest": target["afterDigest"],
            "optionalFieldsStoredAsNull": True}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=Path, default=ROOT / "docs/Content/web-cross-check-batch-2026-10-20.json")
    parser.add_argument("--hsk1-batch", type=Path, default=ROOT / "docs/Content/hsk1-web-cross-check-batch-2026-10-20.json")
    parser.add_argument("--hsk1-batch-02", type=Path,
                        default=ROOT / "docs/Content/hsk1-web-cross-check-batch-02-2026-10-20.json")
    parser.add_argument("--hsk1-batch-03", type=Path,
                        default=ROOT / "docs/Content/hsk1-web-cross-check-batch-03-2026-10-20.json")
    parser.add_argument("--hsk1-batch-04", type=Path,
                        default=ROOT / "docs/Content/hsk1-web-cross-check-batch-04-2026-10-20.json")
    parser.add_argument("--hsk2-batch", type=Path,
                        default=ROOT / "docs/Content/hsk2-web-cross-check-batch-01-2026-10-20.json")
    parser.add_argument("--resolution-batch", type=Path,
                        default=ROOT / "docs/Content/web-cross-check-resolution-batch-2026-10-20.json")
    parser.add_argument("--syllabus-reference", type=Path,
                        default=ROOT / "backups/evidence-recovery-2026-10-20/hsk-reference-private/reference-local-only.json")
    parser.add_argument("--sources", type=Path, default=ROOT / "backups/evidence-recovery-2026-10-20/sources")
    parser.add_argument("--clearance-manifest", type=Path,
                        default=ROOT / "docs/Content/optional-fields-clearance-2026-10-20.json")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    batch = json.loads(args.batch.read_text(encoding="utf-8"))
    hsk1_batch = json.loads(args.hsk1_batch.read_text(encoding="utf-8"))
    hsk1_batch_02 = json.loads(args.hsk1_batch_02.read_text(encoding="utf-8"))
    hsk1_batch_03 = json.loads(args.hsk1_batch_03.read_text(encoding="utf-8"))
    hsk1_batch_04 = json.loads(args.hsk1_batch_04.read_text(encoding="utf-8"))
    hsk2_batch = json.loads(args.hsk2_batch.read_text(encoding="utf-8"))
    resolution_batch = json.loads(args.resolution_batch.read_text(encoding="utf-8"))
    clearance = json.loads(args.clearance_manifest.read_text(encoding="utf-8"))
    clearance_rows = clearance["records"]
    assert len(clearance_rows) == clearance["sourceSnapshot"]["rowCount"] == 584
    clearance_by_id = {int(row["id"]): row for row in clearance_rows}
    clearance_by_lexical: dict[tuple[str, str], list[dict]] = {}
    for row in clearance_rows:
        clearance_by_lexical.setdefault((row["word"], norm_reading(row["pinyin"])), []).append(row)
    source_hashes, cedict, moe = load_sources(args.sources)
    source_hashes[COLLINS_FILE.name] = sha256(COLLINS_FILE)
    syllabus_file = args.sources / "cti-hsk3-2025-11.pdf"
    actual_cti_hash = sha256(syllabus_file)
    assert actual_cti_hash == CTI_SHA256, "Unrecognized CTI syllabus snapshot"
    source_hashes["cti-hsk3-2025-11.pdf"] = actual_cti_hash
    syllabus_rows = json.loads(args.syllabus_reference.read_text(encoding="utf-8"))
    assert [row["id"] for row in syllabus_rows] == list(range(1, 11001)), "Incomplete or unordered local CTI extract"
    syllabus_by_id = {row["id"]: row for row in syllabus_rows}
    results = [audit_item(item, cedict, moe, source_hashes, syllabus_by_id)
               for item in batch["approvedDecisions"]]
    hsk1_results = [audit_item(item, cedict, moe, source_hashes, syllabus_by_id, new_web_batch_level=1)
                    for item in hsk1_batch["items"]]
    results.extend(hsk1_results)
    hsk1_results_02 = [audit_item(item, cedict, moe, source_hashes, syllabus_by_id, new_web_batch_level=1)
                       for item in hsk1_batch_02["items"]]
    results.extend(hsk1_results_02)
    hsk1_results_03 = [audit_item(item, cedict, moe, source_hashes, syllabus_by_id, new_web_batch_level=1)
                       for item in hsk1_batch_03["items"]]
    results.extend(hsk1_results_03)
    hsk1_results_04 = [audit_item(item, cedict, moe, source_hashes, syllabus_by_id, new_web_batch_level=1)
                       for item in hsk1_batch_04["items"]]
    results.extend(hsk1_results_04)
    hsk2_results = [audit_item(item, cedict, moe, source_hashes, syllabus_by_id, new_web_batch_level=2)
                    for item in hsk2_batch["items"]]
    results.extend(hsk2_results)
    resolution_results = [audit_item(item, cedict, moe, source_hashes, syllabus_by_id)
                          for item in resolution_batch["approvedDecisions"]]
    results.extend(resolution_results)
    all_items = [*batch["approvedDecisions"], *hsk1_batch["items"], *hsk1_batch_02["items"], *hsk1_batch_03["items"], *hsk1_batch_04["items"], *hsk2_batch["items"], *resolution_batch["approvedDecisions"]]
    for source_item, result in zip(all_items, results, strict=True):
        result["optionalClearance"] = audit_optional_clearance(source_item, clearance_by_id, clearance_by_lexical)
        result["status"] = "PINNED_SOURCE_ROWS_AND_POST_CLEARANCE_DIGEST_RECONCILED"
    counts = Counter(result["status"] for result in results)
    assert len(batch["approvedDecisions"]) == 495
    assert len(hsk1_results) == len(hsk1_batch["items"]) == 20
    assert len(hsk1_results_02) == len(hsk1_batch_02["items"]) == 20
    assert len(hsk1_results_03) == len(hsk1_batch_03["items"]) == 20
    assert len(hsk1_results_04) == len(hsk1_batch_04["items"]) == 3
    assert len(hsk2_results) == len(hsk2_batch["items"]) == 20
    assert len(resolution_results) == 6
    mapped_ids = {str(level): set() for level in range(1, 7)}
    for row in results:
        status = row["officialClassificationStatus"]
        if status.startswith("CTI_PRIMARY_LEVEL_"):
            level = status.rsplit("_", 1)[1]
            for source in row["sourceDetails"]:
                if source["family"] == "CTI_HSK_SYLLABUS":
                    mapped_ids[level].update(source["entryIds"])
    official_level_counts = Counter(row["primaryLevel"] for row in syllabus_rows if row["primaryLevel"] in mapped_ids)
    verified_by_level = {level: len(ids) for level, ids in mapped_ids.items()}
    unmatched_by_level = {level: official_level_counts[level] - verified_by_level[level] for level in mapped_ids}
    assert all(value >= 0 for value in unmatched_by_level.values()), "Mapped official ID count exceeds the official syllabus"
    lexical_groups: dict[tuple[str, str], list[dict]] = {}
    for item in all_items:
        content = item["content"]
        key = (content["word"], norm_reading(content["pinyin"]))
        lexical_groups.setdefault(key, []).append(item)
    duplicate_groups = [items for items in lexical_groups.values() if len(items) > 1]
    new_batch_items = [*hsk1_batch["items"], *hsk1_batch_02["items"], *hsk1_batch_03["items"],
                       *hsk1_batch_04["items"], *hsk2_batch["items"],
                       *[row for row in resolution_batch["approvedDecisions"] if row["legacyId"] is None]]
    new_batch_keys = [(item["content"]["word"], norm_reading(item["content"]["pinyin"])) for item in new_batch_items]
    assert len(new_batch_keys) == len(set(new_batch_keys)), "New web batches contain repeated lexical identities"
    assert not any(key in lexical_groups and len(lexical_groups[key]) > 1 for key in new_batch_keys), "New web batch duplicates an existing published identity"
    summary = {"checkedAt": "2026-10-20", "method": "per-record pinned dictionary/syllabus row reconciliation; readable Wiktionary/Collins headwords inspected; Collins direct HTTP 403 recorded separately; pre/post cleanup and later-approval SQL-compatible digests recomputed",
               "sourceSnapshots": source_hashes, "sourceRecordCounts": {"CC_CEDICT": len(cedict), "TAIWAN_MOE": len(moe)},
               "original495AuditRecords": len(batch["approvedDecisions"]),
               "additionalHsk1Records": len(hsk1_results) + len(hsk1_results_02) + len(hsk1_results_03) + len(hsk1_results_04),
               "hsk1BatchCounts": [len(hsk1_results), len(hsk1_results_02), len(hsk1_results_03), len(hsk1_results_04)],
               "additionalHsk2Records": len(hsk2_results),
               "resolvedLegacyRecords": 5, "resolvedNewProposals": 1, "additionalResolutionRecords": len(resolution_results),
               "optionalClearanceRecords": len(clearance_rows),
               "approvedRecords": len(results), "publishedLexicalIdentities": len(lexical_groups), "statusCounts": dict(counts),
               "officialClassificationStatusCounts": dict(Counter(row["officialClassificationStatus"] for row in results)),
               "officialCoverage": {"definition": "Distinct CTI 3.0 primary-level IDs with one unambiguous exact spelling/reading linkage; ambiguous same-reading cross-level IDs excluded. Does not assert semantic or teaching-material completeness.",
                                    "mappedUniqueOfficialIdsByLevel": verified_by_level,
                                    "unmatchedOfficialIdsByLevel": unmatched_by_level,
                                    "mappedTotal": sum(verified_by_level.values()),
                                    "unmatchedTotal": sum(unmatched_by_level.values())},
               "lexicalDuplicateAudit": {"existingDuplicateGroups": len(duplicate_groups),
                                         "recordsInDuplicateGroups": sum(len(group) for group in duplicate_groups),
                                         "newHsk1BatchDuplicateGroups": 0,
                                         "newHsk1BatchCollisionsWithPublishedIdentity": 0,
                                         "newHsk2BatchDuplicateGroups": 0,
                                         "newHsk2BatchCollisionsWithPublishedIdentity": 0},
               "records": results}
    args.output.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"original495AuditRecords": len(batch["approvedDecisions"]),
                      "additionalHsk1Records": len(hsk1_results) + len(hsk1_results_02) + len(hsk1_results_03) + len(hsk1_results_04),
                      "additionalHsk2Records": len(hsk2_results),
                      "auditedRecords": len(results), "statusCounts": dict(counts),
                      "resolvedLegacyRecords": 5, "resolvedNewProposals": 1,
                      "officialClassificationStatusCounts": summary["officialClassificationStatusCounts"],
                      "officialCoverage": summary["officialCoverage"],
                      "lexicalDuplicateAudit": summary["lexicalDuplicateAudit"],
                      "sourceSnapshots": source_hashes}, ensure_ascii=False))


if __name__ == "__main__":
    main()
