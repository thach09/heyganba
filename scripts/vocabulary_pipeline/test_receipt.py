"""Opt-in cross-language integration against the EXISTING Java receipt verifier."""
import os
import pathlib
import subprocess
import unittest

from . import engine as e
from . import test_engine as fixtures


@unittest.skipUnless(os.environ.get("JIAYOU_JAVA_CLASSPATH"), "Requires isolated compiled backend and Jackson libraries")
class JavaReceiptCompatibilityTest(unittest.TestCase):
    def test_python_receipt_and_digest_match_java_verifier(self):
        fixture = fixtures.PipelineTest()
        fixture.setUp()
        self.addCleanup(fixture.doCleanups)
        c = fixtures.candidate()
        c["vocabularyId"] = 1
        result = fixture.automatically_verified(c)
        payload = e.receipt_payload(c, result, instance="fixture", revision=0, issuer="test", key_id="key", run_id="test-run", issued_at=1)
        path = fixture.root / "synthetic-payload.json"
        path.write_bytes(e.canonical(payload))
        source = pathlib.Path(__file__).with_name("ReceiptCompatibilityProbe.java")
        process = subprocess.run(["java", "--class-path", os.environ["JIAYOU_JAVA_CLASSPATH"], str(source), str(path)], capture_output=True, timeout=60)
        self.assertEqual(0, process.returncode, process.stderr.decode("utf8"))
        self.assertIn(b"5/5 receipt compatibility checks passed", process.stdout)


if __name__ == "__main__":
    unittest.main()
