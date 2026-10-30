"""Replay the two-noun editorial development benchmark; NEVER authorize content.

This is a closed-fixture research evaluator, not a general language checker or
an implementation of an adopted editorial workflow. Positive examples and the
oracle were designed together. Agreement does not measure independent quality.
No imports from the application, network, database, receipts or signing code.
"""
import argparse
import hashlib
import json
import pathlib
import unicodedata


FACTS_SHA256 = "ce34c1d7e6c1680dc755092b187c58082c223c26ecd15ebc8df781bba7aa67b1"
POLICY = "JIAYOU_EDITORIAL_SIMPLE_NOUN_V0_1_PROPOSED"
ENTRY_FIELDS = frozenset((
    "vocabularyId", "semanticFrame", "word", "traditional", "reading",
    "partOfSpeech", "conceptId", "vietnameseTerm", "vietnameseDefinition",
    "exampleZh", "examplePinyin", "exampleVi", "learnerContext",
    "authoringState", "lexicalCertification", "publicationState", "hanViet",
    "authorsNote",
))


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key")
        result[key] = value
    return result


def read_json(path):
    raw = path.read_bytes()
    if len(raw) > 1024 * 1024:
        raise ValueError("Research fixture exceeds size bound")
    def invalid_constant(value):
        raise ValueError("Nonfinite JSON constant: " + value)
    return raw, json.loads(raw, object_pairs_hook=unique_object,
                           parse_constant=invalid_constant)


def normalized(value):
    return unicodedata.normalize("NFC", value)


def evaluate(entry, frames, grammar):
    """Only fixed, source-grounded frames/surfaces; abstain on any unmodelled text."""
    if not isinstance(entry, dict) or set(entry) != ENTRY_FIELDS:
        return "ABSTAIN", "UNSUPPORTED_SCHEMA_OR_SELF_ASSERTED_AUTHORITY"
    if type(entry["vocabularyId"]) is not int or entry["vocabularyId"] not in frames:
        return "ABSTAIN", "OUTSIDE_TWO_NOUN_PILOT_NOT_A_LINGUISTIC_ERROR"
    frame = frames[entry["vocabularyId"]]
    for field in ("semanticFrame", "word", "traditional", "reading", "partOfSpeech",
                  "conceptId", "vietnameseTerm"):
        if not isinstance(entry[field], str) or normalized(entry[field]) != normalized(frame[field]):
            return "ABSTAIN", "FRAME_OR_FIELD_MISMATCH:" + field
    # These renderings are finite editorial templates, NOT semantic judgement of
    # arbitrary Vietnamese. A valid paraphrase is deliberately outside scope.
    expected = {
        "vietnameseDefinition": frame["vietnameseDefinitionTemplate"],
        "exampleZh": grammar["zhPrefix"] + frame["word"] + "。",
        "examplePinyin": grammar["pinyinPrefix"] + frame["reading"] + ".",
        "exampleVi": grammar["viPrefix"] + frame["vietnameseTerm"] + ".",
    }
    for field, value in expected.items():
        if entry[field] != value:
            return "ABSTAIN", "UNMODELLED_EDITORIAL_SURFACE:" + field
    if (entry["authoringState"] != "EDITORIAL_DRAFT"
            or entry["lexicalCertification"] != "CORE_NEEDS_RESEARCH"
            or entry["publicationState"] != "NOT_AUTHORIZED" or entry["hanViet"] is not None):
        return "ABSTAIN", "CERTIFICATION_PUBLICATION_OR_ENRICHMENT_SPOOF"
    context = ("Người nói đang nhận diện nước ở dạng lỏng." if frame["conceptId"] == "Q283"
               else "Người nói đang nhận diện một trường học.")
    if entry["learnerContext"] != context:
        return "ABSTAIN", "UNMODELLED_LEARNER_CONTEXT"
    if entry["authorsNote"] != "Original agent-authored educational wording; independent source facts cited separately. No independent assessor or learner study.":
        return "ABSTAIN", "AUTHORSHIP_DISCLOSURE_MISMATCH"
    return "PASS_PROPOSED_B", "CLOSED_FRAME_AND_TEMPLATE_CHECKS_ONLY"


def main():
    root = pathlib.Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--facts", type=pathlib.Path, default=root / "docs/Content/editorial-pilot-source-facts-2026-10-30.json")
    parser.add_argument("--benchmark", type=pathlib.Path, default=root / "docs/QA/editorial-pilot-benchmark-2026-10-30.json")
    parser.add_argument("--output", type=pathlib.Path, help="New research result only; refuses overwrite")
    args = parser.parse_args()
    raw, facts = read_json(args.facts)
    if hashlib.sha256(raw).hexdigest() != FACTS_SHA256:
        raise ValueError("Pinned research fixture changed: re-audit facts, never trust self-asserted replacements")
    bench_raw, bench = read_json(args.benchmark)
    frames = {frame["vocabularyId"]: frame for frame in facts["frames"]}
    if set(frames) != {34, 104}:
        raise ValueError("Not the two existing vocabulary IDs")
    cases = bench["cases"]
    if not isinstance(cases, list) or not 1 <= len(cases) <= 64:
        raise ValueError("Bounded development benchmark required")
    results, seen = [], set()
    for case in cases:
        if not isinstance(case["id"], str) or case["id"] in seen:
            raise ValueError("Duplicate/invalid benchmark case ID")
        seen.add(case["id"])
        if case["expected"] not in ("PASS_PROPOSED_B", "ABSTAIN"):
            raise ValueError("Unsupported oracle label")
        actual, reason = evaluate(case["entry"], frames, facts["grammar"])
        results.append({"id": case["id"], "kind": case["kind"], "expected": case["expected"],
                        "actual": actual, "reason": reason, "agreesWithDevelopmentOracle": actual == case["expected"]})
    mismatches = sum(not row["agreesWithDevelopmentOracle"] for row in results)
    result = {"policy": POLICY, "policyAdopted": False, "authoringState": "EDITORIAL_DRAFT",
              "factsSha256": FACTS_SHA256, "benchmarkSha256": hashlib.sha256(bench_raw).hexdigest(),
              "cases": len(results), "proposedPolicyPass": sum(row["actual"] == "PASS_PROPOSED_B" for row in results),
              "abstained": sum(row["actual"] == "ABSTAIN" for row in results), "oracleMismatches": mismatches,
              "independentAdjudications": 0, "heldOutCases": 0,
              "coreVerified": 0, "published": 0, "stateTransitions": 0, "databaseWrites": 0,
              "limitation": "Author-designed development replay; no general semantic/naturalness validation or independent false-approval estimate.",
              "results": results}
    if args.output:
        with args.output.open("x", encoding="utf8") as stream:
            json.dump(result, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
    print(json.dumps({k: result[k] for k in ("cases", "proposedPolicyPass", "abstained", "oracleMismatches", "coreVerified", "published")}))
    if mismatches:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
