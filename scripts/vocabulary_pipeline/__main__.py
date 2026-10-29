"""python -m scripts.vocabulary_pipeline --help"""
import argparse
import base64
import collections
import gzip
import json
import pathlib
import time
import urllib.parse
from datetime import datetime, timezone, timedelta

from .engine import Store, Ledger, canonical, strict_json, fetch, verify, postgres_staging_sql, soft_redirect_target, duplicate_audit, RULESET
from .ingestion import pending_import_sql
from .assessors import CommandAssessor, from_environment


def registry(path):
    root = strict_json(pathlib.Path(path).read_bytes())
    if root.get("version") != "JIAYOU_SOURCE_REGISTRY_V1":
        raise ValueError("Unsupported registry")
    sources = {row["id"]: row for row in root["sources"]}
    if len(sources) != len(root["sources"]):
        raise ValueError("Duplicate source ID")
    return sources


def acquire(source, store, word=None):
    """Acquisition records are persisted even on failure, for bounded autonomous retry."""
    url = source["datasetUrl"]
    if source["adapter"] in ("wiktionary-mandarin-v1", "vi-wiktionary-mandarin-v1"):
        if not word:
            raise ValueError("Wiktionary acquisition needs a page identity")
        url += urllib.parse.quote(word, safe="") + "&prop=wikitext|revid&format=json"
    lock = {"sourceId": source["id"], "adapter": source["adapter"], "url": url,
            "retrievedAt": datetime.now(timezone.utc).isoformat(), "word": word}
    cooldown = store.root / ("cooldown-" + source["id"] + ".json")
    try:
        if cooldown.exists():
            until = strict_json(cooldown.read_bytes())["nextRetryAt"]
            if datetime.fromisoformat(until) > datetime.now(timezone.utc):
                lock["nextRetryAt"] = until
                raise ValueError("SOURCE_COOLDOWN")
        if source.get("accessStatus") != "PUBLIC_EXPORT":
            raise ValueError("ACCESS_NOT_CLEARED")
        data = fetch(url)
        if source.get("compression") == "gzip":
            # Bounded decompression; do not materialize a gzip bomb.
            import io
            with gzip.GzipFile(fileobj=io.BytesIO(data)) as stream:
                raw = stream.read(32 * 1024 * 1024 + 1)
            if len(raw) > 32 * 1024 * 1024:
                raise ValueError("Oversized uncompressed source")
            lock["downloadSha256"] = store.put(data)
            data = raw
        lock.update(status="FETCHED", sha256=store.put(data))
        if source["adapter"] in ("wiktionary-mandarin-v1", "vi-wiktionary-mandarin-v1"):
            page = strict_json(data).get("parse", {})
            if page.get("title") != word or not page.get("revid"):
                raise ValueError("Missing page or revision")
            lock["version"] = "revision-" + str(page["revid"])
        else:
            import re
            match = re.search(rb"^#! date=(.+)$", data, re.M)
            lock["version"] = match[1].decode().strip() if match else "sha256:" + lock["sha256"]
    except (ValueError, OSError) as exc:
        lock.update(status="NEEDS_RESEARCH", reason=str(exc))
        lock.pop("sha256", None)
        if getattr(exc, "retry_after", 0):
            lock["nextRetryAt"] = (datetime.now(timezone.utc) + timedelta(seconds=exc.retry_after)).isoformat()
            cooldown.write_bytes(canonical({"nextRetryAt": lock["nextRetryAt"]}))
    return lock


def resolve_soft_redirect(source, lock, store):
    if source["adapter"] != "wiktionary-mandarin-v1" or lock.get("status") != "FETCHED" or lock.get("relatedSources"):
        return lock
    original = store.get(lock["sha256"])
    target_word = soft_redirect_target(strict_json(original))
    if not target_word:
        return lock
    time.sleep(max(5, source["minimumRequestIntervalSeconds"]))
    target = acquire(source, store, target_word)
    updated = dict(lock)
    if target["status"] != "FETCHED":
        updated.update(relatedFailure=target)
        if target.get("reason") in ("HTTP_429", "SOURCE_COOLDOWN"):
            updated.update(reason=target["reason"], nextRetryAt=target.get("nextRetryAt"))
        return updated
    wrapper = {"kind": "JIAYOU_WIKTIONARY_SOFT_REDIRECT_V1", "originalSha256": lock["sha256"], "targetSha256": target["sha256"],
               "originalBase64": base64.b64encode(original).decode(), "targetBase64": base64.b64encode(store.get(target["sha256"])).decode()}
    updated.update(sha256=store.put(canonical(wrapper)), relatedSources=[target],
                   originalSnapshotSha256=lock["sha256"], version=lock["version"] + ":" + target["version"])
    # Validate the mapping during verification; no success assertion is made here.
    return updated


def main():
    parser = argparse.ArgumentParser(description="Private lexical research; never publishes or modifies application data")
    parser.add_argument("--registry", default="scripts/vocabulary_pipeline/source-registry.json")
    parser.add_argument("--private-dir", required=True)
    sub = parser.add_subparsers(dest="action", required=True)
    get = sub.add_parser("acquire")
    get.add_argument("--source", required=True)
    get.add_argument("--word")
    get.add_argument("--lock", required=True)
    batch = sub.add_parser("acquire-batch")
    batch.add_argument("--source", required=True)
    batch.add_argument("--candidates", required=True)
    batch.add_argument("--locks", required=True)
    batch.add_argument("--limit", type=int, default=50)
    batch.add_argument("--retry-failed", action="store_true")
    batch.add_argument("--resolve-redirects", action="store_true", help="Follow one explicit zh-see mapping; require target zh-forms during parsing")
    run = sub.add_parser("verify")
    run.add_argument("--candidates", required=True)
    run.add_argument("--locks", required=True, help="JSON array of immutable acquisition records")
    run.add_argument("--output", required=True)
    run.add_argument("--assessor-command", help="Operator-controlled JSON argv array, no shell")
    run.add_argument("--pending-import-output", help="Optional private NEW Flyway candidate; only fresh AUTO_VERIFIED results, never auto-apply")
    run.add_argument("--pending-corrections-output", help="Private guarded orthography/POS patch; changed fields must be VERIFIED, whole record stays pending")
    args = parser.parse_args()
    root = pathlib.Path(args.private_dir).resolve()
    repo = pathlib.Path(__file__).resolve().parents[2]
    if root == repo or repo in root.parents:
        parser.error("Private evidence directory must be outside the repository")
    store = Store(root)
    sources = registry(args.registry)
    if args.action == "acquire":
        result = acquire(sources[args.source], store, args.word)
        pathlib.Path(args.lock).write_bytes(canonical(result) + b"\n")
        print(json.dumps({"status": result["status"], "sourceId": args.source, "sha256": result.get("sha256")}))
        return
    if args.action == "acquire-batch":
        if not 1 <= args.limit <= 100:
            parser.error("Batch limit must be 1..100")
        source = sources[args.source]
        if source["adapter"] not in ("wiktionary-mandarin-v1", "vi-wiktionary-mandarin-v1"):
            parser.error("Dataset exports must use acquire once; per-word batches are for page APIs")
        candidates = strict_json(pathlib.Path(args.candidates).read_bytes())
        path = pathlib.Path(args.locks)
        locks = strict_json(path.read_bytes()) if path.exists() else []
        count = 0
        for word in dict.fromkeys(c["content"]["word"] for c in candidates):
            old = next((x for x in locks if x["sourceId"] == source["id"] and x.get("word") == word), None)
            resolving = args.resolve_redirects and old and old["status"] == "FETCHED" and not old.get("relatedSources")
            if resolving and not soft_redirect_target(strict_json(store.get(old["sha256"]))):
                continue
            if not resolving and old and (old["status"] == "FETCHED" or not args.retry_failed):
                continue
            if count >= args.limit:
                break
            if count:
                time.sleep(max(2, source["minimumRequestIntervalSeconds"]))
            item = resolve_soft_redirect(source, old, store) if resolving else acquire(source, store, word)
            locks = [x for x in locks if not (x["sourceId"] == source["id"] and x.get("word") == word)] + [item]
            temp = path.with_suffix(path.suffix + ".tmp")
            temp.write_bytes(canonical(locks) + b"\n")
            temp.replace(path)
            count += 1
            if item.get("reason") in ("HTTP_429", "SOURCE_COOLDOWN"):
                break
        print(json.dumps({"attempted": count, "statuses": dict(collections.Counter(x["status"] for x in locks))}))
        return
    start = time.monotonic()
    candidates = strict_json(pathlib.Path(args.candidates).read_bytes())
    locks = strict_json(pathlib.Path(args.locks).read_bytes())
    command = CommandAssessor(strict_json(args.assessor_command)) if args.assessor_command else from_environment()
    ledger = Ledger(root / "research.sqlite")
    expected_records = ledger.versions()
    rows, identities, timings = [], set(), []
    now = datetime.now(timezone.utc)
    for candidate in candidates:
        record_start = time.monotonic()
        content = candidate.get("content", {}) if isinstance(candidate, dict) else {}
        content = content if isinstance(content, dict) else {}
        relevant = [(sources[lock["sourceId"]], lock) for lock in locks
                    if not lock.get("word") or lock["word"] == content.get("word")]
        result = verify(candidate, relevant, store, command, now)
        if result.get("identity") in identities:
            result["decision"] = "REJECTED"
            result["reasons"].append("DUPLICATE_SENSE_IDENTITY")
            # Retain the original authoritative ledger entry, not the later duplicate.
            result.pop("identity", None)
        elif result.get("identity"):
            identities.add(result["identity"])
        rows.append((candidate, result))
        timings.append({"candidateId": candidate.get("candidateId") if isinstance(candidate, dict) else None, "durationMs": round((time.monotonic() - record_start) * 1000, 3)})
    try:
        writes = ledger.ingest(rows, expected_records)
    finally:
        ledger.db.close()
    counts = dict(collections.Counter(result["decision"] for _, result in rows))
    manifest = {"version": "JIAYOU_RESEARCH_MANIFEST_V1", "ruleset": RULESET,
                "createdAt": now.isoformat(), "records": [result for _, result in rows],
                "counts": counts, "ledgerWrites": writes, "applicationVocabularyWrites": 0,
                "publicationReceiptsIssued": 0, "durationSeconds": round(time.monotonic() - start, 4)}
    manifest.update(recordTimings=timings, aiAssessorConfigured=bool(command) and not command.is_mock and getattr(command, "available", True),
                    assessorMode="DISABLED" if command is None else "MOCK_PROTOCOL_ONLY" if command.is_mock else "CONFIGURED_EXTERNAL_ASSESSOR" if getattr(command, "available", True) else "PROVIDER_UNAVAILABLE",
                    providerHttpAttempts=getattr(command, "calls", 0),
                    monetaryCost=None)
    manifest["duplicates"] = duplicate_audit(candidates)
    pathlib.Path(args.output).write_bytes(canonical(manifest) + b"\n")
    (root / "postgres-staging.sql").write_text(postgres_staging_sql(rows), encoding="utf8")
    if args.pending_import_output:
        planned = pathlib.Path(args.pending_import_output).resolve()
        if not planned.is_relative_to(root):
            parser.error("Import proposal must stay inside the private evidence directory")
        eligible = [(candidate, result) for candidate, result in rows if result["decision"] == "AUTO_VERIFIED"]
        if eligible:
            with planned.open("x", encoding="utf8") as stream:
                stream.write(pending_import_sql(eligible, store))
    if args.pending_corrections_output:
        planned = pathlib.Path(args.pending_corrections_output).resolve()
        if not planned.is_relative_to(root):
            parser.error("Correction proposal must stay inside the private evidence directory")
        scripts, proposals = [], []
        for candidate, result in rows:
            if not isinstance(candidate, dict) or not candidate.get("expectedContent"):
                continue
            try:
                script = pending_import_sql([(candidate, result)], store, allow_field_corrections=True)
                scripts.append(script)
                proposals.append({"candidateId": candidate["candidateId"], "status": "VERIFIED_FIELDS_ONLY_PENDING", "recordDecision": result["decision"]})
            except ValueError:
                proposals.append({"candidateId": candidate["candidateId"], "status": "BLOCKED_FIELD_OR_SENSE_EVIDENCE", "recordDecision": result["decision"]})
        if scripts:
            with planned.open("x", encoding="utf8") as stream:
                stream.write("\n".join(scripts))
        manifest["correctionProposals"] = proposals
        pathlib.Path(args.output).write_bytes(canonical(manifest) + b"\n")
    print(json.dumps({key: manifest[key] for key in ("counts", "ledgerWrites", "applicationVocabularyWrites", "publicationReceiptsIssued", "durationSeconds")}))


if __name__ == "__main__":
    main()
