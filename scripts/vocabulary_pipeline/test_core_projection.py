"""Synthetic core/subset security tests, not real word approvals."""
import copy
import unittest
from . import engine as e, test_engine as fixtures
from .projection import core_projection, retained_projection_record
from .ingestion import pending_import_sql


class CoreProjectionTest(unittest.TestCase):
    def setUp(self):
        self.fixture = fixtures.PipelineTest()
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.c = fixtures.candidate(hanViet="UNVERIFIED draft; giữ nguyên", exampleZh="未核实")
        self.c.update(vocabularyId=173, eligibilityRevision=0)
        self.result = self.fixture.automatically_verified(self.c)

    def test_core_and_supplemental_outcomes_are_independent(self):
        self.assertEqual("CORE_VERIFIED", self.result["decision"])
        self.assertEqual("CORE_VERIFIED", self.result["coreVerification"])
        self.assertEqual("SUPPLEMENTAL_NEEDS_RESEARCH", self.result["supplementalVerification"])
        self.assertEqual("NOT_FULLY_VERIFIED", self.result["fullVerification"])
        self.assertEqual("NOT_VERIFIED", self.result["fields"]["hanViet"]["result"])

    def test_no_whole_word_approval_when_core_or_rights_missing(self):
        for mode in ("missing-assessor", "same-family", "restricted"):
            c = copy.deepcopy(self.c)
            if mode == "restricted": c["rightsStatus"] = "RESTRICTED"
            r = self.fixture.automatically_verified(c) if mode == "restricted" else self.fixture.check(c)
            self.assertNotEqual("CORE_VERIFIED", r["coreVerification"])
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                core_projection(c, r, self.fixture.store)

    def test_same_family_cannot_be_hidden_by_incomplete_lineage_metadata(self):
        sources = self.fixture.two_sources()
        sources[1][0]["family"] = sources[0][0]["family"]
        r = self.fixture.check(self.c,sources=sources)
        self.assertEqual("NOT_VERIFIED",r["fields"]["word"]["result"])
        self.assertNotEqual("CORE_VERIFIED",r["coreVerification"])

    def test_unused_uncleared_source_cannot_invalidate_verified_core(self):
        sources=self.fixture.two_sources()
        sources.append(({**self.fixture.source,"id":"unused","licenseStatus":"UNRESOLVED"},
                        {**self.fixture.lock,"sourceId":"unused"}))
        from .assessors import CommandAssessor
        import sys
        command=CommandAssessor([sys.executable,"-c",'import json,sys;r=json.load(sys.stdin);print(json.dumps(dict(requestSha256=r["requestSha256"],verdict="EQUIVALENT",vietnameseNatural=True,provider="SYNTHETIC_TEST_ONLY",modelVersion="fixture",rationale="Synthetic only",supportingExtractions=[x["extractionSha256"] for x in r["request"]["sources"]])))'])
        result=self.fixture.check(self.c,sources=sources,assessor=command)
        self.assertEqual("CORE_VERIFIED",result["coreVerification"])
        projected,out=core_projection(self.c,result,self.fixture.store)
        self.assertNotIn("unused",[s["sourceId"] for s in out["sources"]])

    def test_original_is_immutable_and_every_withheld_byte_is_retained(self):
        original = e.canonical(self.c)
        c, r = core_projection(self.c, self.result, self.fixture.store)
        self.assertEqual(original, e.canonical(self.c))
        self.assertIsNone(c["content"]["hanViet"])
        self.assertIsNone(c["content"]["exampleZh"])
        self.assertEqual("CORE_VERIFIED", r["decision"])
        self.assertEqual("NOT_FULLY_VERIFIED", r["fullVerification"])
        self.assertNotEqual(self.result["contentDigest"], r["contentDigest"])
        retained = e.strict_json(retained_projection_record(c, r, self.fixture.store))
        self.assertEqual(self.c, retained["candidate"])
        self.assertEqual(self.c["content"]["hanViet"], retained["candidate"]["content"]["hanViet"])
        self.assertEqual(e.digest(self.c["content"]), c["expectedDigest"])

    def test_optional_traditional_conflict_is_quarantined_not_core_failure(self):
        c = fixtures.candidate(traditional="錯字")
        r = self.fixture.automatically_verified(c)
        self.assertEqual("CONFLICT", r["decision"])
        self.assertEqual("CORE_VERIFIED", r["coreVerification"])
        self.assertEqual("CONFLICT", r["fields"]["traditional"]["result"])
        projected, result = core_projection(c, r, self.fixture.store)
        self.assertIsNone(projected["content"]["traditional"])
        self.assertEqual("NOT_PRESENT", result["fields"]["traditional"]["result"])

    def test_missing_pos_or_conflicting_core_never_projects(self):
        for values in ({"partOfSpeech": "verb"}, {"reading": "xíng"}):
            c = fixtures.candidate(**values)
            r = self.fixture.automatically_verified(c)
            with self.subTest(values=values), self.assertRaises(ValueError):
                core_projection(c, r, self.fixture.store)

    def test_raw_drafts_cannot_be_receipted_or_imported_as_core(self):
        with self.assertRaises(ValueError):
            e.receipt_payload(self.c, self.result, instance="test",revision=0,issuer="test",key_id="key",run_id="test",issued_at=1)
        with self.assertRaises(ValueError):
            pending_import_sql([(self.c,self.result)], self.fixture.store)

    def test_projection_receipt_has_no_supplemental_capability_or_false_presence(self):
        c,r = core_projection(self.c,self.result,self.fixture.store)
        payload = e.receipt_payload(c,r,instance="test",revision=1,issuer="test",key_id="key",run_id="test",issued_at=1)
        self.assertEqual({"hanViet":False,"examples":False},payload["capabilities"])
        for field in ("HAN_VIET","EXAMPLE_ZH","EXAMPLE_PINYIN","EXAMPLE_VI"):
            self.assertEqual({"result":"NOT_PRESENT","evidenceIds":[]},payload["fieldResults"][field])
        self.assertEqual(e.digest(c["content"]),payload["subject"]["contentDigest"])
        self.assertNotIn("signature",payload)
        sql = pending_import_sql([(c,r)],self.fixture.store)
        self.assertIn("vocabulary_research_quarantine",sql)
        self.assertNotIn("'APPROVED'",sql)

    def test_modified_original_or_projection_or_bundle_is_rejected(self):
        c,r = core_projection(self.c,self.result,self.fixture.store)
        for field,value in (("hanViet","leak"),("meaning","another meaning")):
            tampered=copy.deepcopy(c);tampered["content"][field]=value
            with self.subTest(field=field), self.assertRaises(ValueError):
                pending_import_sql([(tampered,r)],self.fixture.store)
        changed=copy.deepcopy(self.result);changed["fields"]["hanViet"]["result"]="VERIFIED"
        with self.assertRaises(ValueError):core_projection(self.c,changed,self.fixture.store)
        (self.fixture.store.objects / self.result["evidenceBundleSha256"]).write_bytes(b"tamper")
        with self.assertRaises(ValueError):pending_import_sql([(c,r)],self.fixture.store)
