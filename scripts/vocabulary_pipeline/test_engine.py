import copy
import base64
import concurrent.futures
import io
import json
import pathlib
import sqlite3
import subprocess
import sys
import tempfile
import unittest
import urllib.error
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

from . import engine as e
from .ingestion import pending_import_sql
from . import assessors
from .__main__ import acquire, registry


def candidate(**values):
    content = dict(zip(e.FIELDS, ["测试", "測試", "cè shì", "thử nghiệm", "noun", None, None, None, None]))
    content.update(values)
    return {"candidateId": "synthetic-1", "senseId": "test-sense", "content": content, "meaningOrigin": "SYNTHETIC_TEST_ONLY"}


class PipelineTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        self.store = e.Store(self.root)
        self.now = datetime(2026, 10, 28, tzinfo=timezone.utc)
        self.source = {"id": "a", "adapter": "cedict-v1", "family": "cedict", "lineageFamilies": ["cedict"],
                       "independenceStatus": "ESTABLISHED",
                       "licenseId": "SYNTHETIC_TEST_ONLY", "licenseStatus": "CONDITIONALLY_REUSABLE", "obligations": ["test attribution"],
                       "attribution": "SYNTHETIC", "maxAgeDays": 30}
        self.lock = {"sourceId": "a", "adapter": "cedict-v1", "status": "FETCHED", "retrievedAt": self.now.isoformat(),
                     "url": "https://example.invalid/test-only", "sha256": self.store.put("測試 测试 [ce4 shi4] /(noun) test/\n".encode())}

    def check(self, c=None, sources=None, **kwargs):
        return e.verify(candidate() if c is None else c, sources if sources is not None else [(self.source, self.lock)], self.store, now=self.now, **kwargs)

    def test_pinyin_numbered_marked_umlaut_and_neutral(self):
        for a, b in [("nǐ hǎo", "ni3 hao3"), ("lü4", "lv4"), ("nǚ", "nu:3"), ("ma0", "ma5"), ("Lǜ", "lü4")]:
            self.assertEqual(e.pinyin(a), e.pinyin(b))

    def test_pinyin_preserves_tone_and_polyphonic_identity(self):
        self.assertNotEqual(e.pinyin("háng"), e.pinyin("xíng"))
        self.assertNotEqual(e.identity(candidate()["content"], "one"), e.identity(candidate()["content"], "two"))
        self.assertNotEqual(e.pinyin("mā"), e.pinyin("mǎ"))

    def test_pinyin_rejects_mixed_and_concatenated_notation(self):
        for text in ("ni3hao3", "nǐ3", "你", "", "ma6", "mǎ̀"):
            with self.assertRaises(ValueError):
                e.pinyin(text)

    def test_digest_nfc_null_empty_whitespace_and_surrogates(self):
        c = candidate()["content"]
        a = e.digest(c)
        self.assertEqual(a, e.digest({**c, "meaning": "thu\u031b\u0309 nghiệm"}))
        self.assertNotEqual(a, e.digest({**c, "hanViet": ""}))
        self.assertNotEqual(a, e.digest({**c, "meaning": "thử nghiệm "}))
        with self.assertRaises(UnicodeError):
            e.digest({**c, "meaning": "\ud800"})

    def test_json_duplicate_nonfinite_rejected(self):
        for raw in ('{"x":1,"x":2}', '{"x":NaN}'):
            with self.assertRaises(ValueError):
                e.strict_json(raw)

    def test_cedict_keeps_gloss_senses_and_readings_separate(self):
        rows = e.cedict("行 行 [xing2] /to walk/to go/\n行 行 [hang2] /row/\n".encode())
        self.assertEqual(3, len(rows))
        self.assertEqual(2, len({r["reading"] for r in rows}))
        self.assertIsNone(rows[0]["partOfSpeech"])
        with self.assertRaises(ValueError):
            e.cedict(b"corrupt line")

    def test_wiktionary_only_mandarin_pos_and_plain_sense(self):
        raw = {"parse": {"title": "测试", "pageid": 2, "wikitext": {"*": "==Chinese==\n{{zh-pron|m=cè shì|c=wrong}}\n===Noun===\n# [[test]]\n# {{quote|external}}\n==Japanese==\n===Noun===\n# not Mandarin"}}}
        rows = e.wiktionary(e.canonical(raw))
        self.assertEqual(1, len(rows))
        self.assertEqual("noun", rows[0]["partOfSpeech"])
        self.assertEqual(e.pinyin("ce4 shi4"), rows[0]["reading"])

    def test_wiktionary_ambiguous_etymology_and_cantonese_are_not_evidence(self):
        for text in ("==Chinese==\n{{zh-pron|c=wrong}}\n===Noun===\n# test", "==Chinese==\n===Etymology 1===\n===Etymology 2===\n{{zh-pron|m=cè shì}}\n===Noun===\n# test"):
            self.assertEqual([], e.wiktionary(e.canonical({"parse": {"wikitext": {"*": text}}})))

    def test_wiktionary_polyphonic_etymologies_keep_readings_and_senses_bound(self):
        text = "==Chinese==\n===Etymology 1===\n{{zh-pron|m=xíng}}\n====Verb====\n# [[walk]]\n===Etymology 2===\n{{zh-pron|m=háng}}\n====Noun====\n# {{lb|zh|business}} [[profession]]\n"
        rows = e.wiktionary(e.canonical({"parse": {"title": "行", "pageid": 1, "wikitext": {"*": text}}}))
        self.assertEqual(2, len(rows))
        self.assertEqual([(e.pinyin("xíng"), "verb"), (e.pinyin("háng"), "noun")], [(r["reading"], r["partOfSpeech"]) for r in rows])
        self.assertIn("business", rows[1]["definition"])
        self.assertNotEqual(rows[0]["senseId"], rows[1]["senseId"])

    def test_missing_assessor_never_approves(self):
        result = self.check()
        self.assertEqual("NEEDS_RESEARCH", result["decision"])
        self.assertEqual("BLOCKED_NO_AUTHORIZED_RECEIPT", result["publication"])
        self.assertEqual("NOT_VERIFIED", result["fields"]["meaning"]["result"])

    def test_mirror_and_shared_lineage_are_not_independent(self):
        b = {**self.source, "id": "mirror", "family": "different-domain"}
        lock = {**self.lock, "sourceId": "mirror"}
        result = self.check(sources=[(self.source, self.lock), (b, lock)])
        self.assertEqual("NOT_VERIFIED", result["fields"]["word"]["result"])

    def test_tampered_and_missing_objects_fail_closed(self):
        path = self.store.objects / self.lock["sha256"]
        path.write_bytes(b"tampered")
        result = self.check()
        self.assertEqual("NEEDS_RESEARCH", result["decision"])
        self.assertEqual([], result["sources"])
        path.unlink()
        self.assertEqual([], self.check()["sources"])

    def test_stale_or_future_snapshots_cannot_verify(self):
        for delta in (timedelta(days=-31), timedelta(days=1)):
            lock = {**self.lock, "retrievedAt": (self.now + delta).isoformat()}
            self.assertEqual([], self.check(sources=[(self.source, lock)])["sources"])

    def test_unknown_rights_blocks_reuse(self):
        result = self.check(sources=[({**self.source, "licenseStatus": "UNRESOLVED"}, self.lock)])
        self.assertEqual("LICENSE_BLOCKED", result["decision"])

    def test_optional_examples_and_hanviet_are_not_implicitly_verified(self):
        result = self.check(candidate(hanViet="unverified", exampleZh="测试。"))
        self.assertEqual("NOT_VERIFIED", result["fields"]["hanViet"]["result"])
        self.assertEqual("NOT_VERIFIED", result["fields"]["exampleZh"]["result"])

    def test_candidate_approval_flags_and_urls_have_no_authority(self):
        c = candidate()
        c.update(approved=True, decision="AUTO_VERIFIED", sources=["https://example.org"], confidence=1)
        self.assertEqual("NEEDS_RESEARCH", self.check(c)["decision"])

    def test_conflicting_explicit_pos_is_quarantined(self):
        self.assertEqual("CONFLICT", self.check(candidate(partOfSpeech="verb"))["decision"])

    def test_missing_malformed_fields_are_rejected(self):
        for c in ({}, candidate(reading="???"), candidate(meaning=""), candidate(partOfSpeech="x" * 31)):
            self.assertEqual("REJECTED", self.check(c)["decision"])

    def test_source_lock_mismatch_is_not_evidence(self):
        self.assertEqual([], self.check(sources=[(self.source, {**self.lock, "sourceId": "other"})])["sources"])

    def test_semantic_response_requires_request_binding(self):
        command = [sys.executable, "-c", 'print(\'{"verdict":"EQUIVALENT","requestSha256":"wrong"}\')']
        self.assertEqual("UNCERTAIN", e.assess({"test": True}, command, self.store)["verdict"])

    def test_semantic_process_failure_is_research(self):
        self.assertEqual("UNCERTAIN", e.assess({}, ["nonexistent-jiayou-assessor"], self.store)["verdict"])

    def test_ledger_idempotency_stale_correction_and_rollback(self):
        ledger = e.Ledger(self.root / "ledger.sqlite")
        self.addCleanup(ledger.db.close)
        c, result = candidate(), self.check()
        self.assertEqual(1, ledger.ingest([(c, result)]))
        self.assertEqual(0, ledger.ingest([(c, result)]))
        c2 = candidate(meaning="changed")
        r2 = self.check(c2)
        with self.assertRaisesRegex(ValueError, "Stale correction"):
            ledger.ingest([(c2, r2)])
        self.assertEqual(result["contentDigest"], ledger.db.execute("SELECT content_digest FROM research_records").fetchone()[0])
        c2["expectedDigest"] = result["contentDigest"]
        self.assertEqual(1, ledger.ingest([(c2, r2)]))

    def test_concurrent_stale_writer_cannot_replace_new_content(self):
        path = self.root / "concurrent.sqlite"
        a, b = e.Ledger(path), e.Ledger(path)
        self.addCleanup(a.db.close)
        self.addCleanup(b.db.close)
        c, result = candidate(), self.check()
        a.ingest([(c, result)])
        changed = candidate(meaning="new content")
        changed["expectedDigest"] = result["contentDigest"]
        a.ingest([(changed, self.check(changed))])
        with self.assertRaises(ValueError):
            b.ingest([(c, result)])

    def test_postgres_output_only_temporary_research_staging(self):
        c = candidate(meaning="apostrophe ' safe")
        sql = e.postgres_staging_sql([(c, self.check(c))])
        self.assertIn("CREATE TEMP TABLE", sql)
        self.assertIn("apostrophe '' safe", sql)
        self.assertNotIn("UPDATE vocabulary", sql)
        self.assertNotIn("APPROVED", sql)

    def test_fetch_timeout_retry_and_access_denial(self):
        calls = []
        def unavailable(*args, **kwargs):
            calls.append(True)
            raise TimeoutError()
        with self.assertRaises(ValueError):
            e.fetch("https://example.invalid", opener=unavailable, sleeper=lambda _: None)
        self.assertEqual(3, len(calls))
        calls.clear()
        def denied(*args, **kwargs):
            calls.append(True)
            raise urllib.error.HTTPError("url", 403, "denied", {}, None)
        with self.assertRaisesRegex(ValueError, "HTTP_403"):
            e.fetch("https://example.invalid", opener=denied, sleeper=lambda _: None)
        self.assertEqual(1, len(calls))

    def test_registry_has_no_unverified_cvdict_license_claim(self):
        sources = registry(pathlib.Path(__file__).with_name("source-registry.json"))
        self.assertEqual("UNRESOLVED", sources["cvdict"]["licenseStatus"])
        self.assertNotEqual("PUBLIC_EXPORT", sources["tatoeba"]["accessStatus"])

    def two_sources(self):
        source = {**self.source, "id": "b", "family": "wiktionary", "lineageFamilies": ["wiktionary"], "adapter": "wiktionary-mandarin-v1"}
        raw = e.canonical({"parse": {"title": "测试", "pageid": 2, "wikitext": {"*": "==Chinese==\n{{zh-pron|m=cè shì}}\n===Noun===\n# test"}}})
        lock = {**self.lock, "sourceId": "b", "adapter": source["adapter"], "sha256": self.store.put(raw)}
        return [(self.source, self.lock), (source, lock)]

    def automatically_verified(self, c=None):
        command = [sys.executable, "-c", 'import sys,json; r=json.load(sys.stdin); print(json.dumps(dict(requestSha256=r["requestSha256"],verdict="EQUIVALENT",vietnameseNatural=True,provider="SYNTHETIC_TEST_ONLY",modelVersion="fixture-v1",rationale="Synthetic contract only",supportingExtractions=[x["extractionSha256"] for x in r["request"]["sources"]])))']
        c = candidate() if c is None else c
        return self.check(c, sources=self.two_sources(), assessor=command)

    def test_automated_verification_without_human_flag_and_receipt_still_unsigned(self):
        command = [sys.executable, "-c", 'import sys,json; r=json.load(sys.stdin); print(json.dumps(dict(requestSha256=r["requestSha256"],verdict="EQUIVALENT",vietnameseNatural=True,provider="SYNTHETIC_TEST_ONLY",modelVersion="fixture-v1",rationale="Synthetic adapter contract",supportingExtractions=[x["extractionSha256"] for x in r["request"]["sources"]])))']
        c = candidate()
        c["vocabularyId"] = 1
        result = self.check(c, sources=self.two_sources(), assessor=command)
        self.assertEqual("AUTO_VERIFIED", result["decision"])
        self.assertEqual("BLOCKED_NO_AUTHORIZED_RECEIPT", result["publication"])
        payload = e.receipt_payload(c, result, instance="fixture", revision=0, issuer="test", key_id="key", run_id="test-run", issued_at=1)
        self.assertEqual("fixture:vocabulary:1", payload["subject"]["identity"])
        self.assertEqual("VOCAB_EVIDENCE_RECEIPT_V1", payload["contractVersion"])
        self.assertEqual([], payload["syllabusClaims"])
        self.assertNotIn("signature", payload)
        self.assertEqual("NOT_PRESENT", payload["fieldResults"]["EXAMPLE_ZH"]["result"])
        c["content"]["meaning"] = "changed after verification"
        with self.assertRaises(ValueError):
            e.receipt_payload(c, result, instance="fixture", revision=0, issuer="test", key_id="key", run_id="test-run", issued_at=1)

    def test_unverified_candidate_cannot_get_receipt(self):
        c = candidate()
        c["vocabularyId"] = 1
        with self.assertRaises(ValueError):
            e.receipt_payload(c, self.check(c), instance="fixture", revision=0, issuer="test", key_id="key", run_id="test-run", issued_at=1)

    def test_unknown_lineage_even_with_different_family_is_not_independent(self):
        sources = self.two_sources()
        sources[1][0]["independenceStatus"] = "UNRESOLVED"
        self.assertEqual("NOT_VERIFIED", self.check(sources=sources)["fields"]["word"]["result"])

    def test_joined_pinyin_and_vietnamese_pos_compare_without_rewriting_content(self):
        self.assertEqual(e.pinyin("xièxie"), e.pinyin("xie4 xie5"))
        self.assertEqual(e.pinyin("nǐhǎo"), e.pinyin("ni3 hao3"))
        c = candidate(partOfSpeech="Danh từ")
        result = self.check(c)
        self.assertEqual([0], result["fields"]["partOfSpeech"]["evidence"])
        self.assertEqual(e.digest(c["content"]), result["contentDigest"])

    def test_discovery_uses_actual_source_and_skips_existing_forms(self):
        self.assertEqual([], e.discover(self.store, self.source, self.lock, [candidate()], ["测试", "不存在"], 25))
        proposals = e.discover(self.store, self.source, self.lock, [], ["测试", "不存在"], 25)
        self.assertEqual(1, len(proposals))
        self.assertIsNone(proposals[0]["content"]["meaning"])
        self.assertIsNone(proposals[0]["officialId"])

    def test_same_content_stale_verification_cannot_overwrite_newer_decision(self):
        ledger = e.Ledger(self.root / "cas.sqlite")
        self.addCleanup(ledger.db.close)
        c, result = candidate(), self.check()
        ledger.ingest([(c, result)])
        version = ledger.versions()
        changed = {**result, "decision": "CONFLICT"}
        ledger.ingest([(c, changed)], version)
        with self.assertRaisesRegex(ValueError, "Stale verification"):
            ledger.ingest([(c, result)], version)

    def test_rate_limit_stops_and_preserves_retry_after(self):
        calls = []
        def limited(*args, **kwargs):
            calls.append(True)
            raise urllib.error.HTTPError("url", 429, "limited", {"Retry-After": "900"}, None)
        with self.assertRaises(e.SourceFetchError) as raised:
            e.fetch("https://example.invalid", opener=limited, sleeper=lambda _: None)
        self.assertEqual(900, raised.exception.retry_after)
        self.assertEqual(1, len(calls))

    def test_cooldown_prevents_any_new_request(self):
        source = {**self.source, "datasetUrl": "https://example.invalid", "accessStatus": "PUBLIC_EXPORT"}
        (self.store.root / "cooldown-a.json").write_bytes(e.canonical({"nextRetryAt": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()}))
        with patch("scripts.vocabulary_pipeline.__main__.fetch") as get:
            result = acquire(source, self.store)
        get.assert_not_called()
        self.assertEqual("SOURCE_COOLDOWN", result["reason"])

    def test_alternate_traditional_variant_is_not_a_false_conflict(self):
        raw = "測試 测试 [ce4 shi4] /(noun) test/\n測試異體 测试 [ce4 shi4] /variant form/\n".encode()
        lock = {**self.lock, "sha256": self.store.put(raw)}
        result = self.check(sources=[(self.source, lock)])
        self.assertNotIn("TRADITIONAL_CONFLICT", result["reasons"])
        self.assertEqual("NEEDS_RESEARCH", result["decision"])

    def test_partial_batch_failure_rolls_back_earlier_inserts(self):
        ledger = e.Ledger(self.root / "rollback.sqlite")
        self.addCleanup(ledger.db.close)
        c, result = candidate(), self.check()
        ledger.ingest([(c, result)])
        other = candidate()
        other["senseId"] = "distinct-new-sense"
        changed = candidate(meaning="stale correction")
        with self.assertRaises(ValueError):
            ledger.ingest([(other, self.check(other)), (changed, self.check(changed))])
        self.assertEqual(1, ledger.db.execute("SELECT count(*) FROM research_records").fetchone()[0])

    def test_object_write_interruption_never_publishes_partial_hash(self):
        data = b"fresh object"
        with patch("scripts.vocabulary_pipeline.engine.os.fsync", side_effect=OSError("interrupted")):
            with self.assertRaises(OSError):
                self.store.put(data)
        self.assertFalse((self.store.objects / e.sha(data)).exists())
        self.assertFalse(list(self.store.objects.glob(".incoming-*")))
        self.assertEqual(data, self.store.get(self.store.put(data)))

    def test_actual_concurrent_writers_only_one_can_correct_observed_version(self):
        path = self.root / "threads.sqlite"
        ledger = e.Ledger(path)
        c, result = candidate(), self.check()
        ledger.ingest([(c, result)])
        expected = ledger.versions()
        ledger.db.close()
        def worker(meaning):
            current = e.Ledger(path)
            changed = candidate(meaning=meaning)
            changed["expectedDigest"] = result["contentDigest"]
            verified = self.check(changed)
            try:
                current.ingest([(changed, verified)], expected)
                return "updated"
            except ValueError:
                return "stale_rejected"
            finally:
                current.db.close()
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(worker, ["new meaning one", "new meaning two"]))
        self.assertEqual(["stale_rejected", "updated"], sorted(results))

    def test_import_planner_requires_verified_current_content(self):
        c = candidate()
        with self.assertRaises(ValueError):
            pending_import_sql([(c, self.check(c))], self.store)
        result = self.automatically_verified(c)
        sql = pending_import_sql([(c, result)], self.store)
        self.assertIn("PENDING_REVIEW", sql)
        self.assertIn("pg_advisory_xact_lock", sql)
        self.assertNotIn("'APPROVED'", sql)
        c["content"]["meaning"] = "tampered"
        with self.assertRaises(ValueError):
            pending_import_sql([(c, result)], self.store)

    def test_import_planner_detects_tampered_source_object(self):
        c = candidate()
        result = self.automatically_verified(c)
        (self.store.objects / result["sources"][0]["extractionSha256"]).write_bytes(b"tampered")
        with self.assertRaises(ValueError):
            pending_import_sql([(c, result)], self.store)

    def test_correction_plan_requires_previous_content_digest_and_revision(self):
        c = candidate()
        c["vocabularyId"] = 1
        with self.assertRaises(ValueError):
            pending_import_sql([(c, self.automatically_verified(c))], self.store)

    def test_mock_cannot_establish_real_semantic_equivalence(self):
        result = self.check(sources=self.two_sources(), assessor=assessors.MockAssessor())
        self.assertEqual("NEEDS_RESEARCH", result["decision"])
        self.assertEqual("UNCERTAIN", result["semanticAssessment"]["verdict"])
        self.assertEqual("EQUIVALENT", result["semanticAssessment"]["simulatedVerdict"])
        self.assertEqual("NOT_VERIFIED", result["fields"]["meaning"]["result"])

    def test_environment_adapter_selection_and_no_automatic_credential_creation(self):
        self.assertIsNone(assessors.from_environment({}))
        self.assertIsInstance(assessors.from_environment({"JIAYOU_ASSESSOR_PROVIDER": "mock"}), assessors.MockAssessor)
        with self.assertRaises(ValueError):
            assessors.from_environment({"JIAYOU_ASSESSOR_PROVIDER": "not-registered"})
        self.assertIsInstance(assessors.from_environment({"JIAYOU_ASSESSOR_PROVIDER": "command", "JIAYOU_ASSESSOR_COMMAND": '["provider-wrapper"]'}), assessors.CommandAssessor)

    def test_strong_deterministic_bilingual_sources_need_no_ai_or_human_flag(self):
        vi = {**self.source, "adapter": "cvdict-v1"}
        a = {**self.lock, "adapter": "cvdict-v1", "sha256": self.store.put("測試 测试 [ce4 shi4] /(noun) thử nghiệm/\n".encode())}
        wiki = {**self.source, "id": "vi-wiki-fixture", "family": "wiktionary", "lineageFamilies": ["wiktionary"], "adapter": "vi-wiktionary-mandarin-v1"}
        raw = e.canonical({"parse": {"title": "测试", "pageid": 3, "wikitext": {"*": "{{-cmn-}}\n*[[Bính âm]]: cè shì (ce4 shi4)\n{{-noun-}}\n# thử nghiệm\n{{-vie-n-}}\n# không được lấy nghĩa ngoài Quan Thoại"}}})
        b = {**self.lock, "sourceId": wiki["id"], "adapter": wiki["adapter"], "sha256": self.store.put(raw)}
        result = self.check(sources=[(vi, a), (wiki, b)])
        self.assertEqual("AUTO_VERIFIED", result["decision"])
        self.assertEqual("DETERMINISTIC_SOURCE_AGREEMENT", result["semanticAssessment"]["assessmentMode"])
        self.assertEqual("BLOCKED_NO_AUTHORIZED_RECEIPT", result["publication"])
        # Same dataset family is still one source, even when the language changes.
        wiki["lineageFamilies"].append("cedict")
        self.assertEqual("NEEDS_RESEARCH", self.check(sources=[(vi, a), (wiki, b)])["decision"])

    def test_malformed_json_response_shapes_cannot_crash_verification(self):
        for raw in (b'[]', b'{"parse":[]}', b'{"parse":{"wikitext":"wrong"}}'):
            with self.assertRaises(ValueError):
                e.wiktionary(raw)
        command = [sys.executable, "-c", "print('[]')"]
        self.assertEqual("UNCERTAIN", e.assess({}, command, self.store)["verdict"])
        self.assertEqual("REJECTED", e.verify([], [], self.store)["decision"])

    def test_classifier_and_reference_glosses_are_not_taught_definitions(self):
        rows = e.cedict("書 书 [shu1] /book/CL:本[ben3]/variant of 書[shu1]/\n".encode())
        self.assertEqual(["DEFINITION", "CLASSIFIERS", "REFERENCE"], [r["lexicalRole"] for r in rows])

    def test_soft_redirect_requires_both_pages_to_confirm_forms_and_hashes(self):
        original = e.canonical({"parse": {"title": "测试", "pageid": 1, "wikitext": {"*": "==Chinese==\n{{zh-see|測試}}"}}})
        target = e.canonical({"parse": {"title": "測試", "pageid": 2, "wikitext": {"*": "==Chinese==\n{{zh-forms|s=测试}}\n{{zh-pron|m=cè shì}}\n===Noun===\n# test"}}})
        wrapper = {"kind": "JIAYOU_WIKTIONARY_SOFT_REDIRECT_V1", "originalSha256": e.sha(original), "targetSha256": e.sha(target),
                   "originalBase64": base64.b64encode(original).decode(), "targetBase64": base64.b64encode(target).decode()}
        rows = e.wiktionary(e.canonical(wrapper))
        self.assertEqual("测试", rows[0]["word"])
        self.assertEqual("測試", rows[0]["traditional"])
        self.assertEqual(["wiktionary"], rows[0]["inheritedFamilies"])
        wrong = target.replace("s=测试".encode(), "s=别字".encode())
        wrapper.update(targetSha256=e.sha(wrong), targetBase64=base64.b64encode(wrong).decode())
        self.assertEqual([], e.wiktionary(e.canonical(wrapper)))
        wrapper["targetSha256"] = "0" * 64
        with self.assertRaises(ValueError):
            e.wiktionary(e.canonical(wrapper))

    def test_restricted_expression_is_not_cleared_by_semantic_agreement(self):
        c = candidate()
        c["rightsStatus"] = "RESTRICTED"
        self.assertEqual("LICENSE_BLOCKED", self.automatically_verified(c)["decision"])

    def test_unusable_extra_source_does_not_block_other_sufficient_sources(self):
        sources = self.two_sources()
        bad = {**self.source, "id": "restricted-unused", "licenseStatus": "UNRESOLVED"}
        sources.append((bad, {**self.lock, "sourceId": bad["id"]}))
        command = assessors.CommandAssessor([sys.executable, "-c", 'import sys,json; r=json.load(sys.stdin); print(json.dumps(dict(requestSha256=r["requestSha256"],verdict="EQUIVALENT",vietnameseNatural=True,provider="SYNTHETIC_TEST_ONLY",modelVersion="fixture",rationale="Synthetic only",supportingExtractions=[x["extractionSha256"] for x in r["request"]["sources"]])))'])
        self.assertEqual("AUTO_VERIFIED", self.check(sources=sources, assessor=command)["decision"])

    def test_duplicate_audit_preserves_lesson_ids_and_distinct_meanings(self):
        a, b, c = candidate(), candidate(), candidate(meaning="another sense")
        b.update(candidateId="lesson-two", senseId="two")
        c.update(candidateId="other-sense", senseId="three")
        result = e.duplicate_audit([a, b, c])
        self.assertEqual(1, len(result["potentialLessonReuse"]))
        self.assertEqual([a["candidateId"], b["candidateId"]], result["potentialLessonReuse"][0]["candidateIds"])
        self.assertEqual(3, len(result["sameSpellingReading"][0]["candidateIds"]))
        self.assertEqual("another sense", c["content"]["meaning"])


if __name__ == "__main__":
    unittest.main()
