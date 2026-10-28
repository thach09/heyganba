"""Opt-in integration: JIAYOU_LOCAL_POSTGRES_CONFIG must name an owned Docker audit.

Only a freshly created jiayou_ingestion_<uuid> database is written. No production
connection strings, reset, clean, migration edits or drop database operations.
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


@unittest.skipUnless(os.environ.get("JIAYOU_LOCAL_POSTGRES_CONFIG"), "Requires explicitly configured isolated PostgreSQL Docker audit")
class PostgreSQLIngestionTest(unittest.TestCase):
    def test_transactional_import_correction_and_learner_identity(self):
        cfg = e.strict_json(pathlib.Path(os.environ["JIAYOU_LOCAL_POSTGRES_CONFIG"]).read_bytes())
        self.assertTrue(cfg["name"].startswith("jiayou-vocabulary-pg-"))
        container = json.loads(subprocess.check_output(["docker", "inspect", cfg["name"]]))[0]
        self.assertEqual("vocabulary-20261028", container["Config"]["Labels"].get("jiayou.audit"))
        database = "jiayou_ingestion_" + uuid.uuid4().hex[:12]

        def sql(text, db=database, fail=False):
            result = subprocess.run(["docker", "exec", "-i", cfg["name"], "psql", "-X", "-U", cfg["user"], "-d", db, "-v", "ON_ERROR_STOP=1", "-tA"],
                                    input=text.encode("utf8"), capture_output=True)
            if fail:
                self.assertNotEqual(0, result.returncode)
            else:
                self.assertEqual(0, result.returncode, result.stderr.decode("utf8"))
            return result.stdout.decode("utf8")

        sql("CREATE DATABASE " + database + " TEMPLATE jiayou_fixture;", db=cfg["database"])
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
