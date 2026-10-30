"""Opt-in integration: JIAYOU_LOCAL_POSTGRES_CONFIG must name an owned audit.

Only a freshly created jiayou_ingestion_<uuid> database is written. No production
connection strings, reset, clean, migration edits or drop database operations.
An owned labeled Docker container or a private marked native PostgreSQL 16 cluster
is required; native endpoints must prove their private data_directory before writes.
"""
import copy
import concurrent.futures
import json
import os
import pathlib
import subprocess
import unittest
import uuid

from . import engine as e
from .ingestion import pending_import_sql
from . import test_engine as fixtures
from .projection import core_projection
from . import test_pending_research as draft_fixtures


def isolated_database(test):
    """Owned Docker audit or private native cluster; never accept an arbitrary DB URL."""
    cfg = e.strict_json(pathlib.Path(os.environ["JIAYOU_LOCAL_POSTGRES_CONFIG"]).read_bytes())
    database = "jiayou_ingestion_" + uuid.uuid4().hex[:12]
    env = os.environ.copy()
    if cfg.get("transport") == "native":
        root, data, binaries = (pathlib.Path(cfg[k]).resolve() for k in ("root", "dataDir", "binDir"))
        test.assertTrue(root.name.startswith("jiayou-core-verification-"))
        test.assertTrue(data.is_relative_to(root) and binaries.is_relative_to(root))
        test.assertEqual("127.0.0.1", cfg["host"])
        marker = e.strict_json((data / "jiayou-audit.json").read_bytes())
        test.assertEqual("core-verification-20261029", marker["auditId"])
        test.assertEqual(cfg["port"], marker["port"])
        prefix = [str(binaries / "psql.exe"), "-h", cfg["host"], "-p", str(cfg["port"]), "-U", cfg["user"]]
        env["PGPASSWORD"] = cfg["password"]
    else:
        test.assertTrue(cfg["name"].startswith("jiayou-vocabulary-pg-"))
        container = json.loads(subprocess.check_output(["docker", "inspect", cfg["name"]]))[0]
        test.assertEqual("vocabulary-20261028", container["Config"]["Labels"].get("jiayou.audit"))
        prefix = ["docker", "exec", "-i", cfg["name"], "psql", "-U", cfg["user"]]
    def sql(text, db=database, fail=False):
        test.assertTrue(db in (cfg["database"], "jiayou_fixture") or db.startswith("jiayou_ingestion_"))
        result = subprocess.run([*prefix, "-X", "-d", db, "-v", "ON_ERROR_STOP=1", "-tA"],
                                input=text.encode("utf8"), capture_output=True, env=env)
        if fail:
            test.assertNotEqual(0, result.returncode)
        else:
            test.assertEqual(0, result.returncode, result.stderr.decode("utf8"))
        return result.stdout.decode("utf8").strip()
    if cfg.get("transport") == "native":
        test.assertEqual(data, pathlib.Path(sql("SHOW data_directory;", cfg["database"])).resolve())
        test.assertEqual("16", sql("SHOW server_version_num;", cfg["database"])[:2])
    sql("CREATE DATABASE " + database + " TEMPLATE jiayou_fixture;", db=cfg["database"])
    return cfg, database, sql


@unittest.skipUnless(os.environ.get("JIAYOU_LOCAL_POSTGRES_CONFIG"), "Requires explicitly configured isolated PostgreSQL Docker audit")
class PostgreSQLIngestionTest(unittest.TestCase):
    def test_source_supported_pending_addition_is_idempotent_and_never_verified(self):
        cfg,database,sql=isolated_database(self)
        fixture=draft_fixtures.PendingResearchTest();fixture.setUp();self.addCleanup(fixture.doCleanups)
        c,r=fixture.c,fixture.result
        plan=pending_import_sql([(c,r)],fixture.fixture.store,allow_research_drafts=True)
        before=sql("SELECT json_agg(v ORDER BY id) FROM vocabulary v;")
        sql("BEGIN;\n"+plan+"\nSELECT 1/0;\nCOMMIT;",fail=True)
        self.assertEqual(before,sql("SELECT json_agg(v ORDER BY id) FROM vocabulary v;"))
        sql("BEGIN;\n"+plan+"\nCOMMIT;")
        added=int(sql("SELECT vocabulary_id FROM vocabulary_research_bindings;"))
        self.assertEqual(before,sql(f"SELECT json_agg(v ORDER BY id) FROM vocabulary v WHERE id<>{added};"))
        self.assertEqual('t',sql(f"SELECT review_status='PENDING_REVIEW' AND hsk_level IS NULL AND lesson_id IS NULL AND NOT han_viet_verified AND NOT example_verified AND provenance_content_sha256 IS NULL AND verification_evidence_json::jsonb->>'status'='SOURCE_SUPPORTED_DRAFT_NOT_VERIFIED' FROM vocabulary WHERE id={added};"))
        revision=sql(f"SELECT max(id) FROM audit_logs WHERE table_name='vocabulary' AND record_id={added};")
        sql("BEGIN;\n"+plan+"\nCOMMIT;")
        self.assertEqual(revision,sql(f"SELECT max(id) FROM audit_logs WHERE table_name='vocabulary' AND record_id={added};"))
        self.assertEqual('561',sql("SELECT count(*) FROM vocabulary;"))
        other=copy.deepcopy(c);other['candidateId']='another-sense';other['senseId']='another-sense'
        other_result=fixture.fixture.check(other)
        collision=pending_import_sql([(other,other_result)],fixture.fixture.store,allow_research_drafts=True)
        sql("BEGIN;\n"+collision+"\nCOMMIT;",fail=True)
        sql(f"UPDATE vocabulary SET review_status='ARCHIVED' WHERE id={added}; INSERT INTO audit_logs(table_name,record_id,action) VALUES('vocabulary',{added},'PUBLISH_REVOKE');")
        sql("BEGIN;\n"+plan+"\nCOMMIT;",fail=True)

    def test_core_projection_retains_drafts_atomically_and_never_publishes_them(self):
        cfg, database, sql = isolated_database(self)
        fixture = fixtures.PipelineTest()
        fixture.setUp()
        self.addCleanup(fixture.doCleanups)
        original = fixtures.candidate(hanViet="DRAFT; giữ nguyên", exampleZh="未核实")
        original.update(vocabularyId=173, eligibilityRevision=0)
        sql("UPDATE vocabulary SET word='测试',traditional='測試',pinyin='cè shì',reading='cè shì',meaning_vi='thử nghiệm',meaning='thử nghiệm',part_of_speech='noun',han_viet=convert_from(decode('" + original["content"]["hanViet"].encode('utf8').hex() + "','hex'),'UTF8'),sino_vietnamese=NULL,example_zh='未核实',example_sentence=NULL,example_pinyin=NULL,example_reading=NULL,example_vi=NULL,example_meaning=NULL WHERE id=173;")
        sql("UPDATE vocabulary SET sino_vietnamese='LEGACY HIDDEN DRAFT',example_sentence='OLD HIDDEN EXAMPLE',reading='HIDDEN LEGACY READING',meaning='HIDDEN LEGACY MEANING' WHERE id=173;")
        c, result = core_projection(original, fixture.automatically_verified(original), fixture.store)
        plan = pending_import_sql([(c,result)],fixture.store)
        sql("BEGIN;\n"+plan+"\nSELECT 1/0;\nCOMMIT;",fail=True)
        self.assertEqual("t",sql("SELECT han_viet IS NOT NULL AND example_zh IS NOT NULL FROM vocabulary WHERE id=173;"))
        self.assertEqual("t",sql("SELECT to_regclass('vocabulary_research_quarantine') IS NULL;"))
        sql("BEGIN;\n"+plan+"\nCOMMIT;")
        actual = sql("SELECT han_viet IS NULL AND sino_vietnamese IS NULL AND example_zh IS NULL AND example_sentence IS NULL AND example_pinyin IS NULL AND example_reading IS NULL AND example_vi IS NULL AND example_meaning IS NULL AND review_status='PENDING_REVIEW' AND NOT han_viet_verified AND NOT example_verified AND provenance_content_sha256 IS NULL FROM vocabulary WHERE id=173;")
        self.assertEqual("t",actual)
        retained = json.loads(sql("SELECT retained_record FROM vocabulary_research_quarantine WHERE vocabulary_id=173;"))
        self.assertEqual(original,retained["candidate"])
        academic = json.loads(sql("SELECT retained_academic FROM vocabulary_research_quarantine WHERE vocabulary_id=173;"))
        self.assertEqual("LEGACY HIDDEN DRAFT",academic["sino_vietnamese"])
        self.assertEqual("OLD HIDDEN EXAMPLE",academic["example_sentence"])
        self.assertEqual("HIDDEN LEGACY READING",academic["reading"])
        self.assertEqual("HIDDEN LEGACY MEANING",academic["meaning"])
        self.assertEqual(original["content"]["hanViet"],academic["han_viet"])
        revision = sql("SELECT max(id) FROM audit_logs WHERE table_name='vocabulary' AND record_id=173;")
        sql("BEGIN;\n"+plan+"\nCOMMIT;")
        self.assertEqual("1",sql("SELECT count(*) FROM vocabulary_research_quarantine;"))
        self.assertEqual(revision,sql("SELECT max(id) FROM audit_logs WHERE table_name='vocabulary' AND record_id=173;"))
        sql("UPDATE vocabulary_research_quarantine SET retained_academic='{}'::jsonb;")
        sql("BEGIN;\n"+plan+"\nCOMMIT;",fail=True)
        self.assertEqual("t",sql("SELECT review_status='PENDING_REVIEW' FROM vocabulary WHERE id=173;"))

    def test_verified_field_only_correction_preserves_optional_and_guards_revision(self):
        cfg, database, sql = isolated_database(self)
        fixture = fixtures.PipelineTest()
        fixture.setUp()
        self.addCleanup(fixture.doCleanups)
        old = fixtures.candidate(traditional="测试", hanViet="draft only", exampleZh="未核实")
        sql("UPDATE vocabulary SET word='测试',traditional='测试',pinyin='cè shì',reading='cè shì',meaning_vi='thử nghiệm',meaning='thử nghiệm',part_of_speech='noun',han_viet='draft only',sino_vietnamese='draft only',example_zh='未核实',example_sentence='未核实',example_pinyin=NULL,example_reading=NULL,example_vi=NULL,example_meaning=NULL WHERE id=173;")
        corrected = copy.deepcopy(old)
        corrected["content"]["traditional"] = "測試"
        corrected.update(vocabularyId=173, eligibilityRevision=0, expectedContent=old["content"], expectedDigest=e.digest(old["content"]))
        result = fixture.check(corrected)
        self.assertEqual("NEEDS_RESEARCH", result["decision"])
        plan = pending_import_sql([(corrected, result)], fixture.store, allow_field_corrections=True)
        optional_query = "SELECT row_to_json(t) FROM (SELECT han_viet,sino_vietnamese,example_zh,example_sentence,example_pinyin,example_reading,example_vi,example_meaning,lesson_id FROM vocabulary WHERE id=173) t;"
        before = sql(optional_query)
        sql("BEGIN;\n" + plan + "\nCOMMIT;")
        self.assertEqual(before, sql(optional_query))
        self.assertEqual("測試|PENDING_REVIEW|f|f", sql("SELECT traditional,review_status,han_viet_verified,example_verified FROM vocabulary WHERE id=173;"))
        revision = sql("SELECT max(id) FROM audit_logs WHERE table_name='vocabulary' AND record_id=173;")
        sql("BEGIN;\n" + plan + "\nCOMMIT;")
        self.assertEqual(revision, sql("SELECT max(id) FROM audit_logs WHERE table_name='vocabulary' AND record_id=173;"))
        sql("INSERT INTO audit_logs(table_name,record_id,action) VALUES('vocabulary',173,'PUBLISH_REVOKE');")
        sql("BEGIN;\n" + plan + "\nCOMMIT;", fail=True)
        sql("UPDATE vocabulary SET review_status='ARCHIVED' WHERE id=173;")
        sql("BEGIN;\n" + plan + "\nCOMMIT;", fail=True)
        self.assertEqual(before, sql(optional_query))

    def test_transactional_import_correction_and_learner_identity(self):
        cfg, database, sql = isolated_database(self)
        fixture = fixtures.PipelineTest()
        fixture.setUp()
        self.addCleanup(fixture.doCleanups)
        c = fixtures.candidate()
        result = fixture.automatically_verified(c)
        plan = pending_import_sql([(c, result)], fixture.store)
        baseline = int(sql("SELECT count(*) FROM vocabulary;"))
        sql(plan[:plan.index("\nDO ")])  # schema once, as a serialized Flyway release would do
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda _: sql("BEGIN;\n" + plan + "\nCOMMIT;"), range(2)))
        self.assertEqual(baseline + 1, int(sql("SELECT count(*) FROM vocabulary;")))
        vocabulary_id = int(sql("SELECT vocabulary_id FROM vocabulary_research_bindings;"))
        self.assertEqual("PENDING_REVIEW", sql("SELECT review_status FROM vocabulary WHERE id=" + str(vocabulary_id) + ";").strip())
        revision = int(sql("SELECT max(id) FROM audit_logs WHERE table_name='vocabulary' AND record_id=" + str(vocabulary_id) + ";"))
        sql("BEGIN;\n" + plan + "\nCOMMIT;")
        self.assertEqual(revision, int(sql("SELECT max(id) FROM audit_logs WHERE table_name='vocabulary' AND record_id=" + str(vocabulary_id) + ";")))
        # Actual notebook/SRS rows, not simulated counters; corrections must preserve them.
        sql("INSERT INTO users(email,password_hash,full_name,role_id,is_active) VALUES('pipeline@example.invalid','NOT_AN_AUTHENTICATING_HASH','SYNTHETIC TEST ONLY',(SELECT min(id) FROM roles),false);")
        uid = int(sql("SELECT id FROM users WHERE email='pipeline@example.invalid';"))
        sql(f"INSERT INTO vocab_notebooks(user_id,title) VALUES({uid},'SYNTHETIC');")
        notebook = int(sql(f"SELECT id FROM vocab_notebooks WHERE user_id={uid};"))
        sql(f"INSERT INTO vocab_notebook_items(notebook_id,vocabulary_id,practice_count) VALUES({notebook},{vocabulary_id},7); INSERT INTO srs_reviews(user_id,vocabulary_id,due_date,repetitions) VALUES({uid},{vocabulary_id},CURRENT_TIMESTAMP,4);")
        learning_query = f"SELECT row_to_json(x) FROM (SELECT (SELECT row_to_json(n) FROM vocab_notebook_items n WHERE vocabulary_id={vocabulary_id}) AS notebook,(SELECT row_to_json(s) FROM srs_reviews s WHERE vocabulary_id={vocabulary_id}) AS srs) x;"
        learning_before = sql(learning_query)
        sql(f"UPDATE vocabulary SET lexical_source_ref='STALE_SOURCE',meaning_source_ref='STALE_SOURCE',source_version='STALE_VERSION' WHERE id={vocabulary_id};")
        corrected = fixtures.candidate(meaning="bài kiểm tra")
        corrected.update(vocabularyId=vocabulary_id, eligibilityRevision=revision, expectedContent=c["content"], expectedDigest=e.digest(c["content"]))
        verified = fixture.automatically_verified(corrected)
        correction = pending_import_sql([(corrected, verified)], fixture.store)
        sql("BEGIN;\n" + correction + "\nCOMMIT;")
        self.assertEqual("bài kiểm tra", sql(f"SELECT meaning_vi FROM vocabulary WHERE id={vocabulary_id};").strip())
        self.assertEqual(learning_before, sql(learning_query))
        new_revision = int(sql(f"SELECT max(id) FROM audit_logs WHERE table_name='vocabulary' AND record_id={vocabulary_id};"))
        self.assertGreater(new_revision, revision)
        self.assertEqual("t", sql(f"SELECT lexical_source_ref IS NULL AND meaning_source_ref IS NULL AND source_version LIKE 'evidence-bundle:%' FROM vocabulary WHERE id={vocabulary_id};").strip())
        sql("BEGIN;\n" + correction + "\nCOMMIT;")
        self.assertEqual(new_revision, int(sql(f"SELECT max(id) FROM audit_logs WHERE table_name='vocabulary' AND record_id={vocabulary_id};")))
        sql("BEGIN;\n" + plan + "\nCOMMIT;", fail=True)  # stale import cannot restore old meaning
        stale = copy.deepcopy(corrected)
        stale["content"]["meaning"] = "another stale change"
        stale_plan = pending_import_sql([(stale, fixture.automatically_verified(stale))], fixture.store)
        sql("BEGIN;\n" + stale_plan + "\nCOMMIT;", fail=True)
        self.assertEqual("bài kiểm tra", sql(f"SELECT meaning_vi FROM vocabulary WHERE id={vocabulary_id};").strip())
        self.assertEqual(learning_before, sql(learning_query))
        self.assertEqual("PENDING_REVIEW", sql(f"SELECT review_status FROM vocabulary WHERE id={vocabulary_id};").strip())
        self.assertEqual(baseline + 1, int(sql("SELECT count(*) FROM vocabulary;")))
        # Reject stale no-op after provenance changes, but a new verified correction
        # with the actual before-content/revision must not be permanently locked out.
        sql(f"INSERT INTO audit_logs(table_name,record_id,action) VALUES('vocabulary',{vocabulary_id},'PROVENANCE_UPDATE');")
        sql("BEGIN;\n" + correction + "\nCOMMIT;", fail=True)
        fresh = fixtures.candidate(meaning="bài kiểm tra mới")
        fresh.update(vocabularyId=vocabulary_id, expectedContent=corrected["content"], expectedDigest=e.digest(corrected["content"]),
                     eligibilityRevision=int(sql(f"SELECT max(id) FROM audit_logs WHERE table_name='vocabulary' AND record_id={vocabulary_id};")))
        fresh_plan = pending_import_sql([(fresh, fixture.automatically_verified(fresh))], fixture.store)
        sql("BEGIN;\n" + fresh_plan + "\nCOMMIT;")
        self.assertEqual("bài kiểm tra mới", sql(f"SELECT meaning_vi FROM vocabulary WHERE id={vocabulary_id};").strip())
        self.assertEqual(learning_before, sql(learning_query))
        sql(f"UPDATE vocabulary SET review_status='ARCHIVED' WHERE id={vocabulary_id}; INSERT INTO audit_logs(table_name,record_id,action) VALUES('vocabulary',{vocabulary_id},'ARCHIVE');")
        archived_revision = int(sql(f"SELECT max(id) FROM audit_logs WHERE table_name='vocabulary' AND record_id={vocabulary_id};"))
        retry = copy.deepcopy(corrected)
        retry.update(expectedContent=corrected["content"], expectedDigest=e.digest(corrected["content"]), eligibilityRevision=archived_revision)
        retry["content"] = {**corrected["content"], "meaning": "new correction after withdrawal"}
        withdrawn_plan = pending_import_sql([(retry, fixture.automatically_verified(retry))], fixture.store)
        sql("BEGIN;\n" + withdrawn_plan + "\nCOMMIT;", fail=True)
        self.assertEqual("ARCHIVED", sql(f"SELECT review_status FROM vocabulary WHERE id={vocabulary_id};").strip())
        self.assertEqual(learning_before, sql(learning_query))


if __name__ == "__main__":
    unittest.main()
