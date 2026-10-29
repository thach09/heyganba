"""Generate a NEW PostgreSQL Flyway candidate outside release resources.

No APPROVED writes, deletes, historical checksum changes or automatic production
execution. Publication remains the existing authority's separate decision. Existing
records require explicit before content/digest/revision; homographs are never merged.
"""
import hashlib

from .engine import FIELDS, RULESET, canonical, digest, identity


def literal(value):
    if value is None:
        return "NULL"
    if not isinstance(value, str) or "\0" in value or ";" in value:
        raise ValueError("Unsupported SQL value; do not rewrite content to pass export")
    return "'" + value.replace("'", "''") + "'"


def pending_import_sql(rows, store, *, allow_field_corrections=False):
    """Fully verified lexical candidates only. Unchanged import is a no-op.

    Stable sense bindings, transactional advisory lock and exact effective-field
    comparisons prevent duplicate/stale imports. Source objects are checked before
    planning. The generated script is NOT added to the controlled release allowlist.
    """
    if not rows or len(rows) > 100:
        raise ValueError("Import batch must contain 1..100 verified records")
    output = ["-- GENERATED RESEARCH CANDIDATE: lexical verification is not publication authorization.",
              "-- Requires V14 schema; run through a separately controlled NEW Flyway release.",
              "CREATE TABLE IF NOT EXISTS vocabulary_research_bindings (sense_identity VARCHAR(64) PRIMARY KEY, vocabulary_id BIGINT NOT NULL UNIQUE REFERENCES vocabulary(id), content_digest VARCHAR(64) NOT NULL, evidence_bundle_sha256 VARCHAR(64) NOT NULL);",]
    seen = set()
    for candidate, result in rows:
        content = candidate["content"]
        before_content = candidate.get("expectedContent", {})
        changed_fields = [f for f in FIELDS if content.get(f) != before_content.get(f)]
        partial = (allow_field_corrections and candidate.get("vocabularyId") is not None
                   and result.get("decision") == "NEEDS_RESEARCH" and bool(changed_fields)
                   and set(changed_fields) <= {"traditional", "partOfSpeech"}
                   and ("partOfSpeech" not in changed_fields or result.get("semanticAssessment", {}).get("verdict") == "EQUIVALENT")
                   and all(result.get("fields", {}).get(f, {}).get("result") == "VERIFIED"
                           and result["fields"][f].get("evidence") for f in changed_fields))
        if ((result.get("decision") != "AUTO_VERIFIED" and not partial) or result.get("contentDigest") != digest(content)
                or result.get("identity") != identity(content, candidate["senseId"]) or result.get("identity") in seen):
            raise ValueError("Only distinct, current AUTO_VERIFIED candidates may be planned")
        vocabulary_id = candidate.get("vocabularyId")
        if vocabulary_id is not None:
            if (type(vocabulary_id) is not int or vocabulary_id <= 0 or type(candidate.get("eligibilityRevision")) is not int
                    or candidate["eligibilityRevision"] < 0 or digest(candidate.get("expectedContent", {})) != candidate.get("expectedDigest")):
                raise ValueError("Correction needs exact previous content, digest, ID and eligibility revision")
            if result["contentDigest"] == candidate["expectedDigest"]:
                raise ValueError("Unchanged existing vocabulary needs no import or write")
        seen.add(result["identity"])
        store.get(result["evidenceBundleSha256"])
        for source in result["sources"]:
            store.get(source["snapshotSha256"])
            store.get(source["extractionSha256"])
        if not partial and any(content.get(f) is not None for f in FIELDS[5:]):
            raise ValueError("Optional-field import capability is not implemented; keep optional data absent")
        values = {f: literal(content.get(f)) for f in FIELDS}
        key, fingerprint, bundle = (literal(result[f]) for f in ("identity", "contentDigest", "evidenceBundleSha256"))
        source_version = literal("evidence-bundle:" + result["evidenceBundleSha256"])
        # Ingesting a second homograph is deliberately refused rather than merging learner identities.
        lock_key = literal("jiayou-research:" + content["word"])
        metadata_json = canonical({"ruleset": RULESET, "bundleSha256": result["evidenceBundleSha256"],
                                      "status": "VERIFIED_FIELDS_ONLY_PENDING" if partial else "LINGUISTICALLY_VERIFIED_NOT_PUBLISHED",
                                      "recordDecision": result["decision"], "changedFields": changed_fields if partial else list(FIELDS),
                                      "attribution": [{k: s[k] for k in ("sourceId", "license", "attribution", "obligations", "sourceUrl", "sourceVersion", "revisionUrls", "relatedSources")} for s in result["sources"]]})
        metadata = "convert_from(decode('" + metadata_json.hex() + "','hex'),'UTF8')"
        checks = " AND ".join(column + " IS NOT DISTINCT FROM " + values[field]
                              for column, field in [("word", "word"), ("traditional", "traditional"),
                                                    ("COALESCE(pinyin,reading)", "reading"),
                                                    ("COALESCE(meaning_vi,meaning)", "meaning"),
                                                    ("part_of_speech", "partOfSpeech"),
                                                    ("COALESCE(han_viet,sino_vietnamese)", "hanViet"),
                                                    ("COALESCE(example_zh,example_sentence)", "exampleZh"),
                                                    ("COALESCE(example_pinyin,example_reading)", "examplePinyin"),
                                                    ("COALESCE(example_vi,example_meaning)", "exampleVi")])
        if vocabulary_id is not None:
            before = {f: literal(candidate["expectedContent"].get(f)) for f in FIELDS}
            columns = ["word", "traditional", "COALESCE(pinyin,reading)", "COALESCE(meaning_vi,meaning)",
                       "part_of_speech", "COALESCE(han_viet,sino_vietnamese)", "COALESCE(example_zh,example_sentence)",
                       "COALESCE(example_pinyin,example_reading)", "COALESCE(example_vi,example_meaning)"]
            before_checks = " AND ".join(column + " IS NOT DISTINCT FROM " + before[f] for column, f in zip(columns, FIELDS))
            assignments = ",".join(column + "=" + values[f] for column, f in [
                ("word", "word"), ("traditional", "traditional"), ("pinyin", "reading"), ("reading", "reading"),
                ("meaning_vi", "meaning"), ("meaning", "meaning"), ("part_of_speech", "partOfSpeech")]
                                   if not partial or f in changed_fields)
            clear_optional = ("" if partial else ",pinyin_normalized=NULL,han_viet=NULL,sino_vietnamese=NULL,example_zh=NULL,example_sentence=NULL,example_pinyin=NULL,example_reading=NULL,example_vi=NULL,example_meaning=NULL,meaning_source_ref=NULL,han_viet_source_ref=NULL,example_source_ref=NULL")
            action = f"""
    PERFORM id FROM vocabulary WHERE id={vocabulary_id} FOR UPDATE;
    IF EXISTS(SELECT 1 FROM vocabulary WHERE id={vocabulary_id} AND review_status IN ('ARCHIVED','REJECTED')) THEN
      RAISE EXCEPTION 'Withdrawn vocabulary requires an explicit release policy, not an automatic correction';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM vocabulary WHERE id={vocabulary_id} AND {before_checks}) OR
       COALESCE((SELECT max(id) FROM audit_logs WHERE table_name='vocabulary' AND record_id={vocabulary_id} AND action IN ('CREATE','UPDATE','ARCHIVE','REJECT','PROVENANCE','PROVENANCE_UPDATE','PUBLISH_REVOKE')),0)<>{candidate['eligibilityRevision']} THEN
      RAISE EXCEPTION 'Stale correction: current content or eligibility revision changed';
    END IF;
    IF EXISTS(SELECT 1 FROM vocabulary WHERE word={values['word']} AND id<>{vocabulary_id}) THEN
      RAISE EXCEPTION 'Correction collides with existing word identity';
    END IF;
    UPDATE vocabulary SET {assignments}{clear_optional},review_status='PENDING_REVIEW',verification_method='WEB_CROSS_CHECKED',verification_policy_version={literal(RULESET)},verification_evidence_json={metadata},source_ref='jiayou-research:'||{key},source_version={source_version},lexical_source_ref=NULL,han_viet_verified=false,example_verified=false,provenance_content_sha256=NULL,reviewed_at=NULL,reviewed_by=NULL WHERE id={vocabulary_id};
    INSERT INTO audit_logs(table_name,record_id,action,before_value,after_value) VALUES('vocabulary',{vocabulary_id},'UPDATE',{literal(candidate['expectedDigest'])},{fingerprint});
    UPDATE vocabulary_research_bindings SET sense_identity={key},content_digest={fingerprint},evidence_bundle_sha256={bundle} WHERE vocabulary_id={vocabulary_id};
    IF NOT FOUND THEN
      INSERT INTO vocabulary_research_bindings VALUES({key},{vocabulary_id},{fingerprint},{bundle});
    END IF;
"""
        else:
            action = f"""
    IF EXISTS(SELECT 1 FROM vocabulary WHERE word={values['word']}) THEN
      RAISE EXCEPTION 'Existing word or homograph: explicit sense reconciliation required';
    END IF;
    INSERT INTO vocabulary(word,traditional,pinyin,reading,meaning_vi,meaning,part_of_speech,han_viet,sino_vietnamese,example_zh,example_sentence,example_pinyin,example_reading,example_vi,example_meaning,hsk_level,lesson_id,review_status,needs_human_check,source_ref,curriculum_version,source_version,verification_method,verification_policy_version,verification_evidence_json,han_viet_verified,example_verified)
    VALUES({values['word']},{values['traditional']},{values['reading']},{values['reading']},{values['meaning']},{values['meaning']},{values['partOfSpeech']},NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PENDING_REVIEW',false,'jiayou-research:'||{key},'UNMAPPED_RESEARCH',{source_version},'WEB_CROSS_CHECKED',{literal(RULESET)},{metadata},false,false) RETURNING id INTO new_id;
    INSERT INTO audit_logs(table_name,record_id,action,after_value) VALUES('vocabulary',new_id,'CREATE',{fingerprint});
    INSERT INTO vocabulary_research_bindings VALUES({key},new_id,{fingerprint},{bundle});
"""
        body = f"""
DECLARE bound_id BIGINT; bound_digest TEXT; new_id BIGINT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended({lock_key},0));
  SELECT vocabulary_id,content_digest INTO bound_id,bound_digest FROM vocabulary_research_bindings WHERE sense_identity={key} FOR UPDATE;
  {"" if vocabulary_id is None else "IF bound_id IS NOT NULL AND bound_id<>" + str(vocabulary_id) + " THEN RAISE EXCEPTION 'Identity belongs to another vocabulary'; END IF;"}
  IF bound_id IS NOT NULL THEN
    PERFORM id FROM vocabulary WHERE id=bound_id FOR UPDATE;
  END IF;
  IF bound_id IS NOT NULL AND bound_digest={fingerprint} AND EXISTS(SELECT 1 FROM vocabulary WHERE id=bound_id AND {checks}) THEN
    IF EXISTS(SELECT 1 FROM vocabulary WHERE id=bound_id AND review_status IN ('ARCHIVED','REJECTED')) OR
       NOT EXISTS(SELECT 1 FROM audit_logs WHERE id=(SELECT max(id) FROM audit_logs WHERE table_name='vocabulary' AND record_id=bound_id AND action IN ('CREATE','UPDATE','ARCHIVE','REJECT','PROVENANCE','PROVENANCE_UPDATE','PUBLISH_REVOKE')) AND action IN ('CREATE','UPDATE') AND after_value=bound_digest) THEN
      RAISE EXCEPTION 'Bound research was superseded or withdrawn; verify again before planning';
    END IF;
    NULL;
  ELSE
    {"IF bound_id IS NOT NULL THEN RAISE EXCEPTION 'Stale research import: explicit correction plan required'; END IF;" if vocabulary_id is None else "IF bound_id IS NOT NULL AND bound_id<>" + str(vocabulary_id) + " THEN RAISE EXCEPTION 'Identity belongs to another vocabulary'; END IF;"}
{action}
  END IF;
END
"""
        delimiter = "$jiayou_" + hashlib.sha256(body.encode()).hexdigest()[:16] + "$"
        if delimiter in body:
            raise ValueError("Unsafe SQL delimiter")
        output.append("DO " + delimiter + body + delimiter + ";")
    return "\n".join(output) + "\n"
