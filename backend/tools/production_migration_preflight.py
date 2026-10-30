"""Check source migration immutability before a production deploy hook.

Inputs must describe the backend actually deployed and its effective Flyway
locations. This check never connects to a database and cannot certify its
applied checksums, data, or publication approval. Those remain release checks.
Production-profile changes also require an explicit compatibility review; in
particular, an added Flyway location must not silently expand the release.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import hashlib
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys


ALLOWED_LOCATIONS = {
    "classpath:db/migration": "backend/src/main/resources/db/migration/",
    "classpath:db/migration-staging": "backend/src/main/resources/db/migration-staging/",
}
VERSIONED_SQL = re.compile(r"^V([0-9]+(?:[._][0-9]+)*)__.+\.sql$")
FULL_SHA = re.compile(r"^[0-9a-fA-F]{40}$")
PRODUCTION_PROFILE = "backend/src/main/resources/application-prod.yml"


class SafetyError(ValueError):
    pass


@dataclass(frozen=True)
class Script:
    path: str
    sha256: str

    @property
    def name(self) -> str:
        return PurePosixPath(self.path).name


@dataclass
class Inventory:
    versions: dict[tuple[int, ...], Script]
    unversioned: dict[str, Script]


def parse_locations(value: str) -> tuple[str, ...]:
    locations = tuple(item.strip() for item in value.split(","))
    if not value.strip() or any(not item for item in locations):
        raise SafetyError("PRODUCTION_FLYWAY_LOCATIONS must record the verified effective production locations")
    if len(set(locations)) != len(locations) or any(item not in ALLOWED_LOCATIONS for item in locations):
        raise SafetyError("production locations must be distinct, explicitly supported classpath locations")
    return locations


def validate_sha(value: str, label: str) -> str:
    if not FULL_SHA.fullmatch(value):
        raise SafetyError(f"{label} must be the full verified 40-character commit SHA")
    return value.lower()


def version_key(value: str) -> tuple[int, ...]:
    parts = [int(part) for part in re.split(r"[._]", value)]
    while len(parts) > 1 and parts[-1] == 0:
        parts.pop()
    return tuple(parts)


def inventory(files: dict[str, bytes], locations: tuple[str, ...]) -> Inventory:
    prefixes = tuple(ALLOWED_LOCATIONS[item] for item in locations)
    versions: dict[tuple[int, ...], Script] = {}
    unversioned: dict[str, Script] = {}
    for path, content in sorted(files.items()):
        if not path.startswith(prefixes) or not path.endswith(".sql"):
            continue
        script = Script(path, hashlib.sha256(content).hexdigest())
        match = VERSIONED_SQL.fullmatch(script.name)
        if match:
            key = version_key(match.group(1))
            if key in versions:
                raise SafetyError(f"duplicate migration version: {versions[key].path} and {path}")
            versions[key] = script
        elif script.name.startswith("V"):
            raise SafetyError(f"unsupported versioned SQL filename: {path}")
        else:
            unversioned[path] = script
    return Inventory(versions, unversioned)


def history_issues(deployed: Inventory, candidate: Inventory) -> list[str]:
    issues = []
    if not deployed.versions:
        return ["EMPTY_BASELINE: no versioned production migrations found; verify the deployed commit and locations"]
    for version, old in sorted(deployed.versions.items()):
        current = candidate.versions.get(version)
        if current is None:
            issues.append(f"REMOVED_VERSION: {old.path}")
            continue
        if old.name != current.name:
            issues.append(f"RENAMED_VERSION: {old.path} -> {current.path}")
        if old.sha256 != current.sha256:
            issues.append(f"MODIFIED_VERSION: {old.path} -> {current.path}")
    last_deployed = max(deployed.versions)
    for version, script in sorted(candidate.versions.items()):
        if version not in deployed.versions and version <= last_deployed:
            issues.append(f"BACKFILLED_VERSION: {script.path}")
    # Callbacks can mutate a database without a new version in schema history.
    # Repeatables also require a separate release review when their SQL changes.
    for path in sorted(deployed.unversioned.keys() | candidate.unversioned.keys()):
        if deployed.unversioned.get(path) != candidate.unversioned.get(path):
            issues.append(f"UNVERSIONED_SQL_CHANGED: {path}")
    return issues


def profile_issues(deployed: bytes, candidate: bytes) -> list[str]:
    if deployed != candidate:
        return [f"PRODUCTION_PROFILE_CHANGED: {PRODUCTION_PROFILE}; review effective Flyway locations and release compatibility"]
    return []


def git(repo: Path, *args: str) -> bytes:
    result = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, check=False)
    if result.returncode:
        raise SafetyError("local Git history could not be read; check the commit and fetch full history")
    return result.stdout


def load_inventory(repo: Path, sha: str, locations: tuple[str, ...]) -> Inventory:
    if git(repo, "cat-file", "-t", sha).strip() != b"commit":
        raise SafetyError("the supplied SHA is not a commit")
    prefixes = [ALLOWED_LOCATIONS[item].rstrip("/") for item in locations]
    paths = git(repo, "ls-tree", "-r", "--name-only", "-z", sha, "--", *prefixes).decode("utf8").split("\0")
    files = {path: git(repo, "show", f"{sha}:{path}") for path in paths if path.endswith(".sql")}
    return inventory(files, locations)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--deployed-sha", default=os.environ.get("PRODUCTION_BACKEND_DEPLOYED_SHA", ""))
    parser.add_argument("--candidate-sha", default=os.environ.get("GITHUB_SHA", ""))
    parser.add_argument("--locations", default=os.environ.get("PRODUCTION_FLYWAY_LOCATIONS", ""))
    args = parser.parse_args(argv)
    try:
        deployed_sha = validate_sha(args.deployed_sha, "PRODUCTION_BACKEND_DEPLOYED_SHA")
        candidate_sha = validate_sha(args.candidate_sha, "candidate SHA")
        locations = parse_locations(args.locations)
        deployed = load_inventory(args.repo, deployed_sha, locations)
        candidate = load_inventory(args.repo, candidate_sha, locations)
        issues = history_issues(deployed, candidate)
        issues.extend(profile_issues(
            git(args.repo, "show", f"{deployed_sha}:{PRODUCTION_PROFILE}"),
            git(args.repo, "show", f"{candidate_sha}:{PRODUCTION_PROFILE}"),
        ))
    except SafetyError as error:
        print(f"::error::Production migration preflight: {error}", file=sys.stderr)
        return 2
    print(f"Verified-source comparison: deployed={deployed_sha} candidate={candidate_sha}")
    print(f"Production locations: {','.join(locations)}")
    if issues:
        for issue in issues:
            print(f"::error::{issue}", file=sys.stderr)
        print("Production deployment blocked: migration history requires a reviewed compatibility plan.", file=sys.stderr)
        return 1
    print("Source migration history is preserved. Live applied checksums, schema compatibility, and publication approval still require release review.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
