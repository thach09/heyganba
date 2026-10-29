"""Explicit core publication candidates; original drafts stay immutable and quarantined.

No runtime masking, digest reinterpretation, signing or rights authorization. Apply a
guarded pending import, read its actual fields/revision, then obtain operator authority.
"""
import copy
from .engine import CORE, FIELDS, RULESET, canonical, digest, sha


def bound_record(candidate, result, store):
    raw = store.get(result["evidenceBundleSha256"])
    expected = canonical({"candidate": candidate, "verification": {k: v for k, v in result.items() if k != "evidenceBundleSha256"}})
    if raw != expected or result["contentDigest"] != digest(candidate["content"]) or result.get("ruleset") != RULESET:
        raise ValueError("Stale, modified or unsupported verification result")
    return raw


def core_projection(candidate, result, store):
    """Return a separate candidate/result; never mutate or mark the original fully verified."""
    bound_record(candidate, result, store)
    if (result.get("coreVerification") != "CORE_VERIFIED"
            or result.get("decision") in ("LICENSE_BLOCKED", "REJECTED")
            or any(result["fields"][f]["result"] != "VERIFIED" for f in CORE)
            or any(r in ("MEANING_OR_SENSE_CONFLICT", "UNRESOLVED_POS_SENSE_AMBIGUITY") for r in result["reasons"])):
        raise ValueError("Independent core verification is required")
    projected = copy.deepcopy(candidate)
    original = candidate["content"]
    withheld = [f for f in FIELDS if f not in CORE and original.get(f) is not None
                and (f != "traditional" or result["fields"][f]["result"] != "VERIFIED")]
    if not withheld:
        raise ValueError("No supplemental draft needs a separate core projection")
    for field in withheld:
        projected["content"][field] = None
    if candidate.get("vocabularyId") is not None:
        projected.setdefault("expectedContent", copy.deepcopy(original))
        projected.setdefault("expectedDigest", digest(projected["expectedContent"]))
    projected["publicationProjection"] = {"kind": "CORE_SUBSET_V1", "sourceContentDigest": digest(original),
        "retainedRecordSha256": result["evidenceBundleSha256"], "withheldFields": withheld}
    out = copy.deepcopy(result)
    out.pop("evidenceBundleSha256", None)
    for field in withheld:
        out["fields"][field] = {"result": "NOT_PRESENT", "evidence": []}
    out.update(contentDigest=digest(projected["content"]), decision="CORE_VERIFIED", verificationScope="CORE_ONLY_PROJECTION",
               fullVerification="NOT_FULLY_VERIFIED", supplementalVerification="SUPPLEMENTAL_WITHHELD",
               projectionOf=result["evidenceBundleSha256"], reasons=["SUPPLEMENTAL_DRAFT_RETAINED_IN_QUARANTINE"])
    out["supplementalFields"] = {f: dict(out["fields"][f]) for f in FIELDS if f not in CORE}
    out["evidenceBundleSha256"] = store.put(canonical({"candidate": projected, "verification": out}))
    return projected, out


def retained_projection_record(candidate, result, store):
    """Check both linked immutable records before emitting any destructive field update."""
    bound_record(candidate, result, store)
    info = candidate.get("publicationProjection", {})
    if info.get("kind") != "CORE_SUBSET_V1" or result.get("verificationScope") != "CORE_ONLY_PROJECTION":
        raise ValueError("Explicit core-subset projection required")
    retained = store.get(info["retainedRecordSha256"])
    from .engine import strict_json
    original = strict_json(retained)
    original_candidate, original_result = original["candidate"], original["verification"]
    original_result = {**original_result, "evidenceBundleSha256": sha(retained)}
    recomputed_candidate, recomputed_result = core_projection(original_candidate, original_result, store)
    if canonical(recomputed_candidate) != canonical(candidate) or canonical(recomputed_result) != canonical(result):
        raise ValueError("Projection changed after field verification")
    return retained
