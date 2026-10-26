"""Check the controlled migration/resource allowlist; this is NOT a licensing approval."""
import argparse
import hashlib
import json
import re
import shutil
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "backend/src/main/resources/db/release-migrations-manifest.json"

def require(condition, message):
    if not condition:
        raise ValueError(message)

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def canonical_sha(raw):
    return sha(raw.replace(b"\r\n", b"\n"))

def check_source_manifest():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8-sig"))
    migrations = manifest["migrations"]
    require([item["version"] for item in migrations] == list(range(1, 15)), "Uncontrolled release versions")
    require(manifest["locations"] == ["classpath:db/migration", "classpath:db/migration-release"], "Unsafe locations")
    require(manifest["heldVersions"] == list(range(15, 24)), "Restricted versions must remain held")
    for item in migrations:
        source = (ROOT / item["sourcePath"]).resolve()
        require(source.is_relative_to(ROOT) and source.is_file(), "Missing or unsafe migration source")
        expected = item["sha256Lf"]
        require(canonical_sha(source.read_bytes()) == expected, "Source checksum changed: " + item["fileName"])
        packaged = ROOT / "backend/src/main/resources" / item["packagedPath"]
        require(canonical_sha(packaged.read_bytes()) == expected, "Release copy changed: " + item["fileName"])
        require(source.read_bytes().replace(b"\r\n", b"\n") == packaged.read_bytes().replace(b"\r\n", b"\n"), "Release copy is not normalized-equivalent")
    return manifest

def check_jar(jar_path, manifest):
    prefix = "BOOT-INF/classes/"
    migrations = manifest["migrations"]
    with zipfile.ZipFile(jar_path) as jar:
        listing = jar.namelist()
        require(len(listing) == len(set(listing)), "Duplicate archive entries")
        names = set(listing)
        sql = {name for name in names if re.search(r"/V[0-9]+__[^/]+\.sql$", name)}
        expected = {prefix + item["packagedPath"] for item in migrations}
        require(sql == expected, "Unexpected or missing migration resources: " + repr(sorted(sql ^ expected)))
        hashes = {}
        for item in migrations:
            path = prefix + item["packagedPath"]
            require(canonical_sha(jar.read(path)) == item["sha256Lf"], "Packaged migration changed: " + path)
            hashes[item["packagedPath"]] = sha(jar.read(path))
        manifest_path = prefix + "db/release-migrations-manifest.json"
        require(json.loads(jar.read(manifest_path)) == manifest, "Stale packaged manifest")
        callback = prefix + manifest["callback"]["path"]
        require(canonical_sha(jar.read(callback)) == manifest["callback"]["sha256Lf"], "Callback changed")
        allowed = expected | {manifest_path, callback} | {prefix + name for name in
                   ("application.yml", "application-prod.yml", "application-dev.yml", "application-staging.yml")}
        resources = sorted(name for name in names if name.startswith(prefix) and not name.endswith(("/", ".class")))
        require(set(resources) == allowed, "Uncontrolled non-class resources: " + repr(sorted(set(resources) ^ allowed)))
        forbidden_classes = [name for name in names if name.startswith(prefix) and re.search(
            r"(?:DictionaryCuration|AssistedDictionaryCuration|PublicationCatalogFixture|.*Test|.*TestBase)(?:\$[^/]*)?\.class$", name)]
        require(not forbidden_classes, "Historical/test classes in executable JAR")
        markers = (b"@local.test", b"qa-browser", b"qa-admin@", b"e2e-user@", b"BEGIN PRIVATE KEY")
        leaked = [name for name in resources if any(marker.lower() in jar.read(name).lower() for marker in markers)]
        require(not leaked, "QA/private-key marker in production resources")
        return {"jar": str(jar_path), "sha256": sha(jar_path.read_bytes()), "migrationCount": len(sql),
                "sqlMigrationResources": sorted(sql), "rawPackagedMigrationSha256": hashes,
                "resourceInventory": resources, "japaneseResources": 0, "qaFixtureResources": 0,
                "restrictedVersionsPackaged": [], "licensingApproval": "NOT_GRANTED_BY_THIS_CHECK"}

def rejection_tests(jar_path, manifest):
    cases = {"restrictedV21": ("BOOT-INF/classes/db/migration-release/V21__unapproved.sql", b"-- synthetic negative fixture"),
             "japaneseCorpus": ("BOOT-INF/classes/dictionary/jmdict.tsv.gz", b"synthetic"),
             "qaFixture": ("BOOT-INF/classes/qa/fixture.json", b"{}"),
             "trustCatalog": ("BOOT-INF/classes/catalog.json", b"{}")}
    # Only newly created temporary files are removed; resolved directory is explicitly contained in user temp.
    with tempfile.TemporaryDirectory(prefix="heyganba-artifact-negative-") as folder:
        directory = Path(folder).resolve()
        require(directory.is_relative_to(Path(tempfile.gettempdir()).resolve()), "Unexpected temporary directory")
        for name, (entry, payload) in cases.items():
            target = directory / (name + ".jar")
            shutil.copyfile(jar_path, target)
            with zipfile.ZipFile(target, "a") as jar:
                jar.writestr(entry, payload)
            try:
                check_jar(target, manifest)
            except ValueError:
                continue
            raise ValueError("Artifact gate accepted " + name)
    return list(cases)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--jar", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--test-rejections", action="store_true")
    args = parser.parse_args()
    manifest = check_source_manifest()
    result = {"sourceMigrationCount": len(manifest["migrations"])}
    if args.jar:
        jar = args.jar.resolve()
        result["artifact"] = check_jar(jar, manifest)
        if args.test_rejections:
            result["rejectedSyntheticArtifacts"] = rejection_tests(jar, manifest)
    require(not args.test_rejections or args.jar is not None, "--test-rejections needs --jar")
    rendered = json.dumps(result, indent=2) + "\n"
    if args.output:
        args.output.write_text(rendered, encoding="utf-8")
    print(rendered, end="")

if __name__ == "__main__":
    main()
