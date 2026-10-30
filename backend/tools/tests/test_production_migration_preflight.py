import contextlib
import io
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import production_migration_preflight as preflight


ROOT = "backend/src/main/resources/db/migration/"
STAGING = "backend/src/main/resources/db/migration-staging/"
LOCATIONS = ("classpath:db/migration", "classpath:db/migration-staging")


def compare(old, new):
    return preflight.history_issues(preflight.inventory(old, LOCATIONS), preflight.inventory(new, LOCATIONS))


class ProductionMigrationPreflightTest(unittest.TestCase):
    def setUp(self):
        self.original = {ROOT + "V1__legacy_schema.sql": b"CREATE TABLE learners(id BIGINT);"}

    def test_unchanged_history_passes(self):
        self.assertEqual(compare(self.original, self.original), [])

    def test_additive_higher_version_passes(self):
        candidate = {**self.original, ROOT + "V2__add_index.sql": b"CREATE INDEX learners_id ON learners(id);"}
        self.assertEqual(compare(self.original, candidate), [])

    def test_replacement_initialization_is_blocked(self):
        candidate = {ROOT + "V1__chinese_schema.sql": b"CREATE TABLE hanzi(id BIGINT);"}
        self.assertTrue(any("RENAMED_VERSION" in issue for issue in compare(self.original, candidate)))
        self.assertTrue(any("MODIFIED_VERSION" in issue for issue in compare(self.original, candidate)))

    def test_checksum_change_with_same_name_is_blocked(self):
        candidate = {ROOT + "V1__legacy_schema.sql": b"CREATE TABLE learners(id INTEGER);"}
        self.assertTrue(any("MODIFIED_VERSION" in issue for issue in compare(self.original, candidate)))

    def test_removing_historical_migration_is_blocked(self):
        self.assertTrue(any("REMOVED_VERSION" in issue for issue in compare(self.original, {})))

    def test_renumbering_historical_migration_is_blocked(self):
        candidate = {ROOT + "V2__legacy_schema.sql": next(iter(self.original.values()))}
        self.assertTrue(any("REMOVED_VERSION" in issue for issue in compare(self.original, candidate)))

    def test_inserting_below_last_deployed_version_is_blocked(self):
        old = {**self.original, ROOT + "V3__third.sql": b"SELECT 3;"}
        new = {**old, ROOT + "V2__second.sql": b"SELECT 2;"}
        self.assertTrue(any("BACKFILLED_VERSION" in issue for issue in compare(old, new)))

    def test_duplicate_versions_across_locations_are_blocked(self):
        with self.assertRaisesRegex(preflight.SafetyError, "duplicate migration version"):
            preflight.inventory({**self.original, STAGING + "V1__duplicate.sql": b"SELECT 1;"}, LOCATIONS)

    def test_equivalent_version_notation_is_duplicate(self):
        with self.assertRaisesRegex(preflight.SafetyError, "duplicate migration version"):
            preflight.inventory({**self.original, ROOT + "V1_0__duplicate.sql": b"SELECT 1;"}, LOCATIONS)

    def test_new_callback_cannot_bypass_history_check(self):
        candidate = {**self.original, ROOT + "beforeEachMigrate.sql": b"ALTER TABLE learners ADD COLUMN hidden BOOLEAN;"}
        self.assertTrue(any("UNVERSIONED_SQL_CHANGED" in issue for issue in compare(self.original, candidate)))

    def test_changed_or_removed_repeatable_is_blocked(self):
        old = {**self.original, ROOT + "R__view.sql": b"CREATE VIEW learner_view AS SELECT id FROM learners;"}
        changed = {**old, ROOT + "R__view.sql": b"DROP VIEW learner_view;"}
        self.assertTrue(any("UNVERSIONED_SQL_CHANGED" in issue for issue in compare(old, changed)))
        self.assertTrue(any("UNVERSIONED_SQL_CHANGED" in issue for issue in compare(old, self.original)))

    def test_unchanged_callback_and_repeatable_pass(self):
        old = {**self.original, ROOT + "beforeEachMigrate.sql": b"SELECT 1;", ROOT + "R__view.sql": b"SELECT 2;"}
        self.assertEqual(compare(old, old), [])

    def test_same_script_moved_within_resolved_locations_passes(self):
        candidate = {STAGING + "V1__legacy_schema.sql": next(iter(self.original.values()))}
        self.assertEqual(compare(self.original, candidate), [])

    def test_empty_or_wrong_location_baseline_is_blocked(self):
        self.assertTrue(any("EMPTY_BASELINE" in issue for issue in compare({}, self.original)))

    def test_locations_require_explicit_supported_values(self):
        for value in ["", "classpath:db/migration,", "filesystem:/production", "classpath:db/migration,classpath:db/migration"]:
            with self.subTest(value=value), self.assertRaises(preflight.SafetyError):
                preflight.parse_locations(value)

    def test_ref_inputs_reject_short_or_option_like_values(self):
        for value in ["", "main", "0b381af", "--all", "a" * 39, "g" * 40]:
            with self.subTest(value=value), self.assertRaises(preflight.SafetyError):
                preflight.validate_sha(value, "deployed SHA")
        self.assertEqual(preflight.validate_sha("A" * 40, "deployed SHA"), "a" * 40)

    def test_missing_baseline_fails_before_any_git_or_database_access(self):
        with contextlib.redirect_stderr(io.StringIO()) as errors:
            result = preflight.main(["--deployed-sha", "", "--candidate-sha", "a" * 40, "--locations", LOCATIONS[0]])
        self.assertEqual(result, 2)
        self.assertIn("PRODUCTION_BACKEND_DEPLOYED_SHA", errors.getvalue())

    def test_unchanged_production_profile_passes(self):
        profile = b"spring:\n  flyway:\n    locations: classpath:db/migration\n"
        self.assertEqual(preflight.profile_issues(profile, profile), [])

    def test_expanding_production_locations_requires_release_review(self):
        old = b"spring:\n  flyway:\n    locations: classpath:db/migration\n"
        new = b"spring:\n  flyway:\n    locations: classpath:db/migration,classpath:db/migration-staging\n"
        self.assertTrue(any("PRODUCTION_PROFILE_CHANGED" in issue for issue in preflight.profile_issues(old, new)))


if __name__ == "__main__":
    unittest.main()
