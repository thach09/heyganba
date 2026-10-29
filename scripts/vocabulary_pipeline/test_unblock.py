"""Synthetic parser/HTTP contract tests: never count as real semantic assessments."""
import copy
import io
import json
import unittest
import urllib.error

from . import assessors as a, engine as e
from .ingestion import pending_import_sql
from . import test_engine as fixtures

candidate = fixtures.candidate


class AssessorContractTest(unittest.TestCase):
    def setUp(self):
        self.request = {"requestSha256": "bound", "request": {"academicContent": candidate()["content"],
                        "classifiersRelevant": False, "sources": [{"extractionSha256": "evidence"}]}}
        self.answer = {"requestSha256": "bound", "verdict": "EQUIVALENT", "vietnameseNatural": True,
                       "rationale": "Synthetic fixture only", "supportingExtractions": ["evidence"],
                       "checks": {f: "PASS" for f in a.FACETS}}
        self.requests = []

    def adapter(self, provider="openai", answer=None, model="assessment-v1", author="author-v2", failures=()):
        answer = self.answer if answer is None else answer
        if provider == "openai":
            response = {"status": "completed", "model": model, "id": "fixture", "output": [
                {"type": "message", "content": [{"type": "output_text", "text": json.dumps(answer)}]}]}
        else:
            response = {"modelVersion": model, "responseId": "fixture", "candidates": [
                {"finishReason": "STOP", "content": {"parts": [{"text": json.dumps(answer)}]}}]}
        failures = list(failures)
        def opener(req, **kwargs):
            self.requests.append(req)
            if failures:
                raise failures.pop(0)
            stream = io.BytesIO(json.dumps(response).encode())
            stream.geturl = lambda: req.full_url
            return stream
        return a.HttpAssessor(provider, "assessment-v1", "TEST-NOT-A-KEY", author,
                              opener=opener, sleeper=lambda _: None)

    def run_adapter(self, adapter):
        return json.loads(adapter.run(e.canonical(self.request)))

    def test_both_official_transports_bind_metadata_and_evidence(self):
        for provider in ("openai", "gemini"):
            with self.subTest(provider=provider):
                adapter = self.adapter(provider)
                result = self.run_adapter(adapter)
                self.assertEqual("EQUIVALENT", result["verdict"])
                self.assertEqual("assessment-v1", result["modelVersion"])
                self.assertEqual(1, adapter.calls)
                body = json.loads(self.requests[-1].data)
                self.assertNotIn("TEST-NOT-A-KEY", json.dumps(body))
                self.assertEqual("POST", self.requests[-1].method)
                if provider == "openai":
                    self.assertFalse(body["store"])
                    self.assertTrue(body["text"]["format"]["strict"])
                else:
                    self.assertEqual("APPLICATION_JSON", body["generationConfig"]["responseFormat"]["text"]["mimeType"])

    def test_missing_credentials_never_attempts_http(self):
        adapter = a.from_environment({"JIAYOU_ASSESSOR_PROVIDER": "openai"})
        with self.assertRaisesRegex(a.AssessorUnavailable, "CREDENTIALS_NOT_CONFIGURED"):
            adapter.run(b"{}")
        self.assertFalse(adapter.available)
        self.assertEqual(0, adapter.calls)

    def test_provider_duplicate_and_nonfinite_json_fail_closed(self):
        for raw in (b'{"model":"a","model":"b"}',b'{"x":NaN}',b'{"checks":{"meaning":"PASS","meaning":"CONFLICT"}}'):
            with self.subTest(raw=raw),self.assertRaises(a.AssessorUnavailable):
                a.strict_provider_json(raw)

    def test_oversized_request_never_calls_provider(self):
        adapter=self.adapter()
        with self.assertRaisesRegex(a.AssessorUnavailable,"REQUEST_TOO_LARGE"):
            adapter.run(b"x"*1_048_577)
        self.assertEqual(0,adapter.calls)

    def test_invalid_refs_binding_types_and_schema_fail_closed(self):
        for update in ({"supportingExtractions": ["invented"]}, {"requestSha256": "stale"},
                       {"vietnameseNatural": "true"}, {"verdict": "APPROVED"}, {"rationale": ""}, {"extra": True}):
            with self.subTest(update=update), self.assertRaises(a.AssessorUnavailable):
                self.run_adapter(self.adapter(answer={**self.answer, **update}))

    def test_facet_conflict_and_unknown_cannot_be_overridden_by_verdict(self):
        for check, expected in (("CONFLICT", "CONFLICT"), ("UNKNOWN", "UNCERTAIN")):
            answer = copy.deepcopy(self.answer)
            answer["checks"]["reading"] = check
            self.assertEqual(expected, self.run_adapter(self.adapter(answer=answer))["verdict"])

    def test_classifier_not_applicable_only_when_not_relevant(self):
        self.answer["checks"]["classifiers"] = "NOT_APPLICABLE"
        self.assertEqual("EQUIVALENT", self.run_adapter(self.adapter())["verdict"])
        self.request["request"]["classifiersRelevant"] = True
        self.assertEqual("UNCERTAIN", self.run_adapter(self.adapter())["verdict"])

    def test_same_author_model_and_versioned_alias_are_denied(self):
        for author in ("assessment-v1", "openai:assessment-v1-2026-10-01", "models/assessment-v1-latest"):
            result = self.run_adapter(self.adapter(author=author))
            self.assertEqual("UNCERTAIN", result["verdict"])
            self.assertEqual("SAME_MODEL_DENIED", result["providerTrace"]["independence"])
        for invalid in (" ", "not a model", "../unknown"):
            with self.assertRaises(ValueError):
                self.adapter(author=invalid)

    def test_actual_model_mismatch_is_not_model_prose(self):
        with self.assertRaisesRegex(a.AssessorUnavailable, "MODEL_METADATA_MISMATCH"):
            self.run_adapter(self.adapter(model="another-model"))

    def test_retry_bounded_and_sensitive_errors_not_reported(self):
        error = lambda code: urllib.error.HTTPError("https://provider.invalid", code, "secret body", {}, None)
        adapter = self.adapter(failures=[error(429)])
        self.assertEqual("EQUIVALENT", self.run_adapter(adapter)["verdict"])
        self.assertEqual(2, adapter.calls)
        adapter = self.adapter(failures=[error(503), error(503)])
        with self.assertRaisesRegex(a.AssessorUnavailable, "^PROVIDER_HTTP_503$"):
            self.run_adapter(adapter)
        self.assertEqual(2, adapter.calls)
        adapter = self.adapter(failures=[error(401)])
        with self.assertRaisesRegex(a.AssessorUnavailable, "^PROVIDER_HTTP_401$"):
            self.run_adapter(adapter)
        self.assertEqual(1, adapter.calls)

    def test_later_failure_never_reuses_previous_response_trace(self):
        adapter = self.adapter()
        self.run_adapter(adapter)
        self.assertIsNotNone(adapter.last_response)
        self.assertEqual(1, self.run_adapter(adapter)["providerTrace"]["httpAttempts"])
        def unavailable(*args, **kwargs):
            raise urllib.error.HTTPError("https://provider.invalid", 401, "private body", {}, None)
        adapter.opener = unavailable
        with self.assertRaises(a.AssessorUnavailable):
            self.run_adapter(adapter)
        self.assertIsNone(adapter.last_response)

    def test_redirect_and_oversize_are_denied(self):
        for url, raw, code in (("https://attacker.invalid", b"{}", "REDIRECT_DENIED"),
                               ("https://api.openai.com/v1/responses", b"x" * 1_048_577, "RESPONSE_TOO_LARGE")):
            def opener(req, **kwargs):
                stream = io.BytesIO(raw)
                stream.geturl = lambda: url
                return stream
            adapter = a.HttpAssessor("openai", "assessment-v1", "TEST", "other", opener=opener)
            with self.assertRaisesRegex(a.AssessorUnavailable, code):
                self.run_adapter(adapter)


class ParserUnblockTest(unittest.TestCase):
    def parse(self, text):
        return e.wiktionary(e.canonical({"parse": {"title": "行", "pageid": 1, "wikitext": {"*": "==Chinese==\n" + text}}}))

    def test_variants_keep_regional_notes_and_generic_hanzi_head_keeps_pos(self):
        rows = self.parse("{{zh-pron|m=xíng,háng,2nb=regional}}\n===Noun===\n{{head|zh|hanzi}}\n# [[row]] {{gl|line}} {{zh-mw|條}}")
        self.assertEqual({e.pinyin("xíng"), e.pinyin("háng")}, {r["reading"] for r in rows})
        self.assertTrue(all(r["partOfSpeech"] == "noun" for r in rows))
        self.assertTrue(all(r["pronunciationNotes"] == "2nb=regional" for r in rows))
        self.assertEqual(["條"], rows[0]["classifierNotations"])

    def test_pronunciation_scope_does_not_borrow_polyphonic_readings(self):
        rows = self.parse("===Pronunciation 1===\n{{zh-pron|m=xíng}}\n====Verb====\n# walk\n===Pronunciation 2===\n{{zh-pron|m=háng}}\n====Noun====\n# row")
        self.assertEqual([(e.pinyin("xíng"), "walk"), (e.pinyin("háng"), "row")], [(r["reading"], r["definition"]) for r in rows])

    def test_nested_notes_cannot_hide_or_forge_outer_mandarin_argument(self):
        rows = self.parse("{{zh-pron|m=xíng,háng,2nb=regional|m_note={{q|regional}} {{l|zh|行}}|w_note={{quote|m=nǐ}}}}\n===Noun===\n# row")
        self.assertEqual({e.pinyin("xíng"), e.pinyin("háng")}, {r["reading"] for r in rows})
        self.assertTrue(all("{{q|regional}}" in r["pronunciationNotes"] for r in rows))
        self.assertEqual([], self.parse("{{zh-pron|c=hong4|note={{q|m=xíng}}}}\n===Noun===\n# row"))

    def test_link_label_and_dating_qualifier_are_retained(self):
        rows = self.parse("{{zh-pron|m=xíng}}\n===Noun===\n# {{tcl|zh|Vietnam|id=Q881}} {{defdate|from 19th c.}}")
        self.assertEqual("Vietnam (dated: from 19th c.)", rows[0]["definition"])

    def test_explicit_shared_reading_and_dialect_exclusion(self):
        rows = self.parse("{{zh-pron|m=xíng}}\n===Etymology 1===\n====Noun====\n# action\n# {{lb|zh|Cantonese}} dialect only\n===Etymology 2===\n====Verb====\n# go")
        self.assertEqual(["action", "go"], [r["definition"] for r in rows])

    def test_non_gloss_usage_is_not_definition(self):
        rows = self.parse("{{zh-pron|m=xíng}}\n===Noun===\n# {{n-g|Used in greetings}}")
        self.assertEqual("USAGE", rows[0]["lexicalRole"])

    def test_vietnamese_explicit_chinese_mandarin_only_and_source_language(self):
        text = "=={{langname|zh}}==\n==={{ĐM|pron}} 1===\n{{zh-pron|m=shǒuzhǐ|c=wrong}}\n===={{ĐM|n}}====\n{{head|zh|Danh từ}}\n# {{lb|zh|anatomy}} [[ngón tay|Ngón tay]].\n=={{langname|vi}}==\n# wrong language"
        raw = {"parse": {"title": "手指", "pageid": 1, "wikitext": {"*": text}}}
        rows = e.vi_wiktionary(e.canonical(raw))
        self.assertEqual(1, len(rows))
        self.assertEqual("vi", rows[0]["definitionLanguage"])
        self.assertEqual("noun", rows[0]["partOfSpeech"])
        self.assertEqual("(anatomy) Ngón tay.", rows[0]["definition"])
        raw["parse"]["wikitext"]["*"] = text.replace("m=shǒuzhǐ|", "")
        self.assertEqual([], e.vi_wiktionary(e.canonical(raw)))


class PendingFieldCorrectionTest(unittest.TestCase):
    def setUp(self):
        self.fixture = fixtures.PipelineTest()
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.c = candidate(hanViet="draft only", exampleZh="未核实")
        self.c.update(vocabularyId=173, eligibilityRevision=0, expectedContent={**self.c["content"], "traditional": "测试"})
        self.c["expectedDigest"] = e.digest(self.c["expectedContent"])
        self.result = self.fixture.check(self.c)
        self.assertEqual("NEEDS_RESEARCH", self.result["decision"])

    def test_verified_orthography_preserves_drafts_and_stays_pending(self):
        sql = pending_import_sql([(self.c, self.result)], self.fixture.store, allow_field_corrections=True)
        self.assertIn("traditional='測試'", sql)
        self.assertIn("review_status='PENDING_REVIEW'", sql)
        self.assertNotIn("han_viet=NULL", sql)
        self.assertNotIn("example_zh=NULL", sql)
        self.assertNotIn("'APPROVED'", sql)
        with self.assertRaises(ValueError):
            pending_import_sql([(self.c, self.result)], self.fixture.store)

    def test_unverified_pos_and_sense_changes_are_not_scoped_corrections(self):
        for field, value in (("partOfSpeech", "verb"), ("meaning", "different sense"), ("reading", "xíng")):
            c = copy.deepcopy(self.c)
            c["content"][field] = value
            result = self.fixture.check(c)
            with self.subTest(field=field), self.assertRaises(ValueError):
                pending_import_sql([(c, result)], self.fixture.store, allow_field_corrections=True)

    def test_conflict_cannot_use_partial_correction(self):
        result = {**self.result, "decision": "CONFLICT"}
        with self.assertRaises(ValueError):
            pending_import_sql([(self.c, result)], self.fixture.store, allow_field_corrections=True)

    def test_pos_correction_also_requires_semantic_sense_alignment(self):
        c = copy.deepcopy(self.c)
        c["expectedContent"]["partOfSpeech"] = "verb"
        c["expectedDigest"] = e.digest(c["expectedContent"])
        result = self.fixture.check(c, sources=self.fixture.two_sources())
        self.assertEqual("VERIFIED", result["fields"]["partOfSpeech"]["result"])
        self.assertEqual("UNCERTAIN", result["semanticAssessment"]["verdict"])
        with self.assertRaises(ValueError):
            pending_import_sql([(c, result)], self.fixture.store, allow_field_corrections=True)
