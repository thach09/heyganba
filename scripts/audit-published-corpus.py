"""Reconcile all published database rows against the audited release decisions."""
import argparse
from collections import Counter
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('review_digest', ROOT / 'scripts/generate-reviewed-vocabulary-migration.py')
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)
OPTIONAL = ('han_viet', 'sino_vietnamese', 'example_zh', 'example_sentence',
            'example_pinyin', 'example_reading', 'example_vi', 'example_meaning')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-audit', required=True, type=Path)
    parser.add_argument('--database-snapshot', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    source = json.loads(args.source_audit.read_text(encoding='utf-8'))
    snapshot = json.loads(args.database_snapshot.read_text(encoding='utf-8'))
    expected = Counter()
    expected_legacy = {}
    for row in source['records']:
        clearance = row['optionalClearance']
        digest = clearance.get('postApprovalDigest') or clearance['postClearanceDigest']
        key = (row['word'], row['pinyin'], row['meaningVi'], row['internalCourseLevel'], row['partOfSpeech'], digest)
        expected[key] += 1
        if row['legacyId'] is not None:
            assert row['legacyId'] not in expected_legacy
            expected_legacy[row['legacyId']] = key
    actual = Counter()
    actual_legacy = {}
    rows = snapshot['vocabulary']
    for row in rows:
        assert all(row.get(field) is None for field in OPTIONAL), f"Optional field is not NULL: ID {row['id']}"
        assert not row['han_viet_verified'] and not row['example_verified']
        if row['review_status'] != 'APPROVED':
            assert row['review_status'] == 'PENDING_REVIEW' and row['provenance_content_sha256'] is None
            continue
        content = dict(row)
        content['pinyin'] = row['pinyin'] if row['pinyin'] is not None else row['reading']
        content['meaning_vi'] = row['meaning_vi'] if row['meaning_vi'] is not None else row['meaning']
        digest = review.digest(content)
        assert digest == row['provenance_content_sha256'], f"Actual content digest mismatch: ID {row['id']}"
        key = (row['word'], content['pinyin'], content['meaning_vi'], row['hsk_level'], row['part_of_speech'], digest)
        actual[key] += 1
        actual_legacy[row['id']] = key
    assert actual == expected, {'missing': list((expected - actual).elements()), 'unexpected': list((actual - expected).elements())}
    assert all(actual_legacy.get(identity) == content for identity, content in expected_legacy.items()), 'Legacy row IDs changed'
    history = snapshot['migrationHistory']
    assert [int(row['version']) for row in history] == list(range(1, 24))
    assert all(row['success'] and row['checksum'] is not None for row in history)
    fingerprint = hashlib.sha256(json.dumps(sorted(actual.elements(), key=repr), ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
    result = {'status': 'PASS', 'database': snapshot['database'], 'rows': len(rows),
              'approved': sum(actual.values()), 'pending': len(rows) - sum(actual.values()),
              'matchedAuditedRecords': sum(expected.values()), 'preservedLegacyIds': len(expected_legacy),
              'unpublishedOptionalRowsWithValues': 0, 'digestMismatches': 0,
              'contentMultisetSha256': fingerprint, 'classificationRows': snapshot['classificationCount'],
              'userCountAtSnapshot': snapshot['userCount'], 'migrationHistory': history,
              'sourceAuditSha256': hashlib.sha256(args.source_audit.read_bytes()).hexdigest(),
              'databaseSnapshotSha256': hashlib.sha256(args.database_snapshot.read_bytes()).hexdigest()}
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: value for key, value in result.items() if key != 'migrationHistory'}))


if __name__ == '__main__':
    main()
