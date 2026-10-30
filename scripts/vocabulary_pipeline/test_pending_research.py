"""Pending content admission is not verified/published content. Synthetic fixtures only."""
import copy
import hashlib
import unittest
from . import engine as e, test_engine as fixtures
from .ingestion import pending_import_sql


class PendingResearchTest(unittest.TestCase):
    def setUp(self):
        self.fixture=fixtures.PipelineTest();self.fixture.setUp();self.addCleanup(self.fixture.doCleanups)
        self.c=fixtures.candidate()
        self.c.update(draftOnly=True,contentLicense=self.fixture.source['licenseId'],
                      meaningOrigin='AI_ASSISTED_VIETNAMESE_EDITORIAL_SYNTHETIC_TEST_ONLY')
        first=self.fixture.check(self.c)['sources'][0]
        self.c['draftSenseEvidence']={k:first[k] for k in ('sourceId','snapshotSha256','entryId','senseId')}
        self.c['draftSenseEvidence']['definitionSha256']=hashlib.sha256(first['definition'].encode()).hexdigest()
        self.result=self.fixture.check(self.c)

    def test_opt_in_pending_admission_preserves_unverified_state_and_cannot_get_receipt(self):
        self.assertEqual('NEEDS_RESEARCH',self.result['decision'])
        with self.assertRaises(ValueError):pending_import_sql([(self.c,self.result)],self.fixture.store)
        plan=pending_import_sql([(self.c,self.result)],self.fixture.store,allow_research_drafts=True)
        self.assertIn("'PENDING_REVIEW'",plan);self.assertNotIn("'APPROVED'",plan)
        self.assertEqual('NOT_VERIFIED',self.result['fields']['meaning']['result'])
        with self.assertRaises(ValueError):
            e.receipt_payload(self.c,self.result,instance='test',revision=0,issuer='test',key_id='test',run_id='test',issued_at=1)

    def test_invented_sense_or_editorial_rights_claim_cannot_enter_draft_mode(self):
        for change in ('sense','license','origin','reading','restricted'):
            c=copy.deepcopy(self.c)
            if change=='sense':c['draftSenseEvidence']['senseId']='invented'
            elif change=='license':c['contentLicense']='INVENTED'
            elif change=='origin':c['meaningOrigin']='INDEPENDENTLY_VERIFIED_BY_MYSELF'
            elif change=='reading':c['content']['reading']='xíng'
            else:c['restrictedContent']=True
            r=self.fixture.check(c)
            with self.subTest(change=change),self.assertRaises(ValueError):
                pending_import_sql([(c,r)],self.fixture.store,allow_research_drafts=True)

    def test_existing_row_or_optional_draft_cannot_be_overwritten_by_research_mode(self):
        for change in ('id','optional'):
            c=copy.deepcopy(self.c)
            if change=='id':c['vocabularyId']=173
            else:c['content']['exampleZh']='UNVERIFIED'
            r=self.fixture.check(c)
            with self.subTest(change=change),self.assertRaises(ValueError):
                pending_import_sql([(c,r)],self.fixture.store,allow_research_drafts=True)

    def test_changed_result_or_missing_source_object_is_rejected(self):
        r=copy.deepcopy(self.result);r['fields']['meaning']['result']='VERIFIED'
        with self.assertRaises(ValueError):pending_import_sql([(self.c,r)],self.fixture.store,allow_research_drafts=True)
        (self.fixture.store.objects/self.result['sources'][0]['snapshotSha256']).write_bytes(b'tampered')
        with self.assertRaises(ValueError):pending_import_sql([(self.c,self.result)],self.fixture.store,allow_research_drafts=True)
