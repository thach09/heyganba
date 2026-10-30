"""Compare a locally downloaded CTI PDF with a vocabulary JSON export, without redistributing it.

Requires pypdf. Full extracted reference/missing lists stay in --private-output (gitignored).
The public report contains counts, reference IDs and only words already in the supplied corpus.
"""
import argparse
import collections
import hashlib
import json
import pathlib
import re
import unicodedata

URL = "https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf"
SHA256 = "ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941"
ROW = re.compile(r"^\s*(\d+)\s+([1-6](?:（(?:[1-6]|7-9)）)*|7-9)\s+(.+)$")

def parse_row(line, page):
    match = ROW.match(line)
    if not match:
        return None
    cells = re.split(r"\s{2,}", match[3].strip())
    if len(cells) not in (2, 3):
        raise ValueError(f"Ambiguous columns on PDF page {page}, entry {match[1]}")
    raw_word, pinyin = cells[:2]
    # Superscript homonym numbers are text-extracted as ordinary trailing digits.
    marker = re.search(r"[0-9]+$", raw_word)
    word = re.sub(r"[0-9]+$", "", raw_word)
    # Do not split variant punctuation or collapse homonyms/POS into one entry.
    return {"id": int(match[1]), "pdfPage": page, "levelNotation": match[2],
            "primaryLevel": match[2][0] if match[2] != "7-9" else "7-9",
            "additionalLevels": re.findall(r"（([^）]+)）", match[2]),
            "word": word, "wordNotation": raw_word, "homonymMarker": marker[0] if marker else None,
            "pinyin": pinyin, "partOfSpeechNotation": cells[2] if len(cells) == 3 else None}

def normalized_reading(value):
    # Compare lexical tone-marked strings; keep tones, remove only spacing/case and punctuation.
    return re.sub(r"[\s'’·-]", "", unicodedata.normalize("NFC", value or "").lower())

def compare(reference, corpus):
    index = collections.defaultdict(list)
    for entry in reference:
        index[entry["word"]].append(entry)
    mappings = []
    for row in corpus:
        candidates = index.get(row["word"].strip(), [])
        same_reading = [entry for entry in candidates if normalized_reading(entry["pinyin"]) == normalized_reading(row.get("pinyin") or row.get("reading"))]
        mappings.append({"id": row["id"], "word": row["word"], "repositoryLevel": row.get("hsk_level"),
                         "curriculumVersion": row.get("curriculum_version"), "reviewStatus": row.get("review_status"),
                         "needsHumanCheck": row.get("needs_human_check"),
                         "missingIndependentEvidence": [field for field in ["lexical_source_ref", "meaning_source_ref", "han_viet_source_ref", "example_source_ref"] if not row.get(field)],
                         "officialEntryIds": [e["id"] for e in candidates],
                         "sameReadingEntryIds": [e["id"] for e in same_reading],
                         "status": "LEXICAL_READING_MATCH_NOT_TRANSLATION_APPROVAL" if same_reading else "READING_REVIEW" if candidates else "UNMAPPED",
                         "levelReview": bool(candidates) and not any(str(row.get("hsk_level")) in [e["primaryLevel"], *e["additionalLevels"]] for e in candidates)})
    levels = {}
    for level in map(str, range(1, 7)):
        required = [e for e in reference if e["primaryLevel"] == level]
        mapped = {eid for m in mappings for eid in m["sameReadingEntryIds"]}
        missing = [e for e in required if e["id"] not in mapped]
        levels[level] = {"officialPrimaryEntries": len(required), "matchedWordAndReading": len(required) - len(missing),
                         "missingEntryIds": [e["id"] for e in missing],
                         "repositoryRowsAtLevel": sum(str(r.get("hsk_level")) == level for r in corpus)}
    # Same spelling alone never authorizes deletion; homonym, reading and meaning distinguish identities.
    groups = collections.defaultdict(list)
    for row in corpus:
        groups[(row["word"].strip(), normalized_reading(row.get("pinyin")), (row.get("meaning_vi") or "").strip())].append(row)
    duplicates = [{"ids": [r["id"] for r in rs], "levels": [r.get("hsk_level") for r in rs], "disposition": "REVIEW_LESSON_REUSE_DO_NOT_AUTO_DELETE"} for rs in groups.values() if len(rs) > 1]
    return {"byLevel": levels, "repositoryMappings": mappings, "sameWordReadingMeaningGroups": duplicates,
            "unmappedRows": sum(m["status"] == "UNMAPPED" for m in mappings),
            "readingReviewRows": sum(m["status"] == "READING_REVIEW" for m in mappings),
            "levelReviewRows": sum(m["levelReview"] for m in mappings)}

def main():
    from pypdf import PdfReader
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", type=pathlib.Path, required=True)
    parser.add_argument("--corpus", type=pathlib.Path, required=True)
    parser.add_argument("--report", type=pathlib.Path, required=True)
    parser.add_argument("--private-output", type=pathlib.Path, required=True)
    args = parser.parse_args()
    digest = hashlib.sha256(args.pdf.read_bytes()).hexdigest()
    if digest != SHA256:
        raise SystemExit("Unknown PDF checksum: inspect version/layout before extracting")
    import subprocess
    args.private_output.mkdir(parents=True, exist_ok=True)
    if subprocess.run(["git", "check-ignore", "--quiet", str(args.private_output)]).returncode != 0:
        raise SystemExit("private-output must be gitignored: distribution license is not established")
    pdf = PdfReader(args.pdf)
    reference = []
    # PDF pages 80..354, printed pages 77..351; stop before the character syllabus.
    for page_index in range(79, 354):
        for line in pdf.pages[page_index].extract_text(extraction_mode="layout").splitlines():
            entry = parse_row(line, page_index + 1)
            if entry:
                reference.append(entry)
    ids = [e["id"] for e in reference]
    if ids != list(range(1, 11001)):
        raise SystemExit("Incomplete/duplicate/out-of-order extraction; refusing coverage claims")
    counts = collections.Counter(e["primaryLevel"] for e in reference)
    if dict(counts) != {"1": 300, "2": 200, "3": 500, "4": 1000, "5": 1600, "6": 1800, "7-9": 5600}:
        raise SystemExit("Unexpected level boundaries; manually inspect source")
    corpus = json.loads(args.corpus.read_text(encoding="utf-8-sig"))
    report = compare(reference, corpus)
    report["publicationAudit"] = {"rows": len(corpus), "statusCounts": dict(collections.Counter(r.get("review_status") for r in corpus)),
                                  "missingLegacySourceRef": sum(not r.get("source_ref") for r in corpus),
                                  "unclassifiedRows": sum(r.get("hsk_level") is None for r in corpus),
                                  "rowsWithIndependentMeaningEvidence": sum(bool(r.get("meaning_source_ref")) for r in corpus)}
    report["source"] = {"url": URL, "sha256": digest, "accessed": "2026-10-19", "version": "CTI syllabus published 2025-11; cover effective 2026-07",
                        "method": "pypdf layout extraction; exact 1..11000 sequence and primary-level counts checked; multi-level notation and homonym markers retained",
                        "license": "Redistribution permission not established; full PDF/extraction remain local ignored artifacts",
                        "entries": len(reference), "cumulativePrimaryLevels1to6": [300, 500, 1000, 2000, 3600, 5400]}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (args.private_output / "reference-local-only.json").write_text(json.dumps(reference, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"referenceEntries": len(reference), "corpusRows": len(corpus), "unmapped": report["unmappedRows"], "readingReview": report["readingReviewRows"], "levelReview": report["levelReviewRows"]}))

if __name__ == "__main__":
    main()
