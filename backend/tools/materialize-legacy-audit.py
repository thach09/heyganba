"""Materialize a pinned historical test corpus outside the repository; never a release import.
The default audit profile deliberately requires this external fixture. No missing rows are invented.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

REVISION = "fffcbc924fcbaeda45bf3d3097acc07013954faf"
RESOURCES = {'db/migration-staging/dictionary-coverage-pilot.json': '436499cecd7920967b4ddfbeffc554647a7ca2276584a7c3d3390a6744ee1d97', 'db/migration-staging/vietnamese-assisted-batch-a.tsv': '6721c0f4252ffd0b10b3f6df730dc1252422b634650ab046ed421fe02c4001db', 'db/migration-staging/vietnamese-assisted-batch-b.metadata.json': 'e288b168e04d610a6b093cd9851ae0bf2fcbb09c3dc9b58f33c7b0584eb58be3', 'db/migration-staging/vietnamese-assisted-batch-b.tsv': '6fa940a0cd02c86ca4f94968a068f52b239e31dd5fb637d139cbe98c3681e780', 'db/migration-staging/vietnamese-assisted-batch-c.metadata.json': '219510fafcf97b6e799772a7473ac67bb97efc887631e5ee74f8a5a4305dbae4', 'db/migration-staging/vietnamese-assisted-batch-c.tsv': 'f2f77bb369104eb4865ad90877f5a2353f74c17c8aa148b7018126befbc928c7', 'db/migration-staging/vietnamese-assisted-batch-d.metadata.json': '12c531961370fcea8d980a10430492c94bc96b5944c2e225dd148689e4f2fec3', 'db/migration-staging/vietnamese-assisted-batch-d.tsv': '037ca9eacf3ec6bbc1e00215a5998b25caa310c8a90f8ca7b4d5327557678443', 'db/migration-staging/vietnamese-assisted-batch-e.metadata.json': '55457986f7fcdb2fe3b36b26c9626f88c5944070c3410209d7670dde7d820365', 'db/migration-staging/vietnamese-assisted-batch-e.tsv': '4df122c9137e51aa20dab855a91cf34ab224bf4bd7d3feb74b737088ce849124', 'db/migration-staging/vietnamese-assisted-batch-f.metadata.json': 'cc0e657c3038688a2f2ea2f8e69e917fb1e500be43e9317ff17c27fb7d05119c', 'db/migration-staging/vietnamese-assisted-batch-f.tsv': '3efd992c3b91eb2941cc998a451cac7ac234a36c85b1b9741940425fdd738475', 'db/migration-staging/vietnamese-assisted-exclusions.tsv': '7c63d85081c5dfb5d58008e22b8535c4b6b9703c6cfa4d42f1761c46431f3c67', 'dictionary/README.md': '464e8e21172ef1e7677a00739db665b357dfc55d371f8dd3b7a2ae3036fb8254', 'dictionary/assisted-ja-vi.tsv': 'ea730e2e3a25dd99d1685471ffb2282bab20552be9b39db0304e2988ddc9e19f', 'dictionary/curated-ja-vi.tsv': '9b972e5f8c8692a160127adae34a58dee1092c1c216e7fd1af37e787896720bf', 'dictionary/jmdict.tsv.gz': '57d0941a4c314aa7621a2da041ada77e1b5b1bfe9611cd792512ec78c2979a29', 'dictionary/snapshot.json': '34a56ff651962f44cbf38c5210d4e33f6a2e111770d8cc6d2d1851f4eeede747'}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="New private directory OUTSIDE this repository")
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[2]
    target = args.output.resolve()
    if target.is_relative_to(repo) or target.exists():
        raise SystemExit("Refusing an existing destination or a destination inside the repository")
    # Authenticate every object before creating the destination.
    data = {}
    for name, expected in RESOURCES.items():
        raw = subprocess.check_output(["git", "show", REVISION + ":backend/src/main/resources/" + name], cwd=repo)
        if hashlib.sha256(raw).hexdigest() != expected:
            raise SystemExit("Historical fixture digest mismatch: " + name)
        data[name] = raw
    target.mkdir(parents=True)
    for name, raw in data.items():
        dest = target / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(raw)
    (target / "historical-audit-manifest.json").write_text(json.dumps({
        "revision": REVISION, "purpose": "PRIVATE_HISTORICAL_TEST_ONLY_NOT_CONTENT_APPROVAL",
        "sha256": RESOURCES,
    }, indent=2) + "\n", encoding="utf-8")
    print("Verified", len(data), "historical resources; no production resources changed.")

if __name__ == "__main__":
    main()
