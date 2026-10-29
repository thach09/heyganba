# Vocabulary auto-verification — unblock evidence audit

Handoff 2026-10-29; acquisition/test timestamps retain their actual 2026-10-28 UTC values. **Evidence acquisition improved and one real spelling correction was rehearsed; no real candidate qualifies for AUTO_VERIFIED yet.** No routine human approval gate was added and verification thresholds were not lowered.

Baseline `005dc1948eb2c11bc0ec205c996b5886b7d202a4`, branch `feat/v2.1-ux-and-stability`. Implementation commit: **`7ca452c60664a97acccc0cd43c15bc7ea63d1a53`**. This report/manifest form a separate local evidence commit; obtain its hash with `git log -1 --format=%H -- docs/QA/vocabulary-unblock-2026-10-29.md`. Nothing was pushed, merged or deployed.

Machine evidence: [585-record manifest](../Content/vocabulary-unblock-manifest-2026-10-29.jsonl). Its RUN header includes before/after counts, source locks, metadata/license acquisition hashes, test counts and skips, implementation hash delta and private output hashes. Per-record entries retain content digest, field results, extraction/snapshot references, reasons, source lineage/rights and unacquired sources. Definitions, optional draft text, raw datasets and provider secrets are excluded.

Private evidence: `C:\Users\LENOVO\AppData\Local\Temp\jiayou-real-evidence-ns_o_ie5`. Original evidence from `jiayou-vocabulary-trlkuzj7` remains intact. Reproduction requires these pinned source objects/candidates; the public manifest alone does not contain source definitions and is not a receipt.

## Actual results

| Scope | Before: AUTO / NEEDS / CONFLICT | After: AUTO / NEEDS / CONFLICT |
|---|---:|---:|
| Pilot, 25 existing + 25 new | 0 / 49 / 1 | **0 / 49 / 1** |
| Existing 560-row V14 snapshot | 0 / 557 / 3 | **0 / 558 / 2**, after the ID 173 correction on a clone |
| Combined 560 + 25 new, without double-counting pilot | 0 / 582 / 3 | **0 / 583 / 2** |

The 25 new meanings remain AI-assisted editorial drafts based on acquired definitions; they are not Vietnamese translations supplied by CC-CEDICT. All 25 remain NEEDS_RESEARCH. No new learner vocabulary, example, Hán Việt, official syllabus claim or curriculum mapping was published. No candidate is LICENSE_BLOCKED solely because an unavailable optional source was investigated; source-rights problems are reported separately below.

| Real pilot evidence | Before | After |
|---|---:|---:|
| English Wiki candidates with matching word/reading facts | 17/50 | **47/50** |
| English Wiki candidates with explicit matching-row POS | 12/50 | **41/50** |
| Vietnamese Wiki candidates with matching facts | 0/50 | **4/50** |
| CC-CEDICT candidates with matching reading | 49/50 | **49/50** |

These are extraction counts, **not verified-word counts**. The run processes 96 unique raw lexical snapshots: CC-CEDICT export, English Wiki original/redirect-target pages and 19 Vietnamese Wiki pages. Composite wrappers and extracted objects do not inflate this count. Same-input pilot rerun wrote **0 ledger rows**. No scaling/import of thousands of new entries occurred; the 560-row pass is re-audit of the existing local snapshot.

Three actual source registrations supplied matching facts, but only **two observed source families** exist: CC-CEDICT and Wiktionary. English/Vietnamese Wiki remain one family. Only CC-CEDICT currently has established independence eligibility; **zero candidates have an eligible independent pair**. Model assessments never count as a source family.

## Root causes and what was fixed

1. **Parsing, confirmed:** `zh-pron` can contain comma-separated variants and nested templates in notes. The old narrow regex missed valid outer `m=` values. The parser now balances templates, only reads outer Mandarin arguments, retains regional notes, and scopes readings by pronunciation/etymology. It preserves explicit POS headings across generic Hanzi heads, handles narrow gloss/classifier/place/link/date templates, and excludes dialect-only/non-gloss senses. No Cantonese readings or inferred sandhi are used.
2. **Vietnamese evidence, confirmed:** real pages use `langname|zh`, `zho-pron`, and `ĐM`/`section` headings, not only the legacy cmn layout. The adapter now handles explicit Chinese/Mandarin layouts and keeps definition language Vietnamese. Hán-Nôm/translingual sections cannot supply modern readings. Acquisition attempted 49/50 pages: **19 fetched, 28 missing page/revision, 2 HTTP 429**. One final page was not requested when the batch stopped. Only four candidate records yield supported facts. Fifteen fetched pages still lack a supported Mandarin/form mapping; Vietnamese soft redirects are not implemented and remain research, not success. Cooldown stops were honored.
3. **Reading gaps retained:** `不客气` and `对不起` use Hanzi shorthand inside `m=`; no expansion was invented. CC-CEDICT citation reading for existing ID 3 differs from the stored sandhi-style reading. New candidate `葡萄` teaches a neutral final syllable while the pinned Wiki notation supplies `pútáo`; the parser does not silently equate them or delete tone distinctions.
4. **Missing source corroboration:** every one of the 585 records lacks sufficient independent POS evidence. CC-CEDICT provides no explicit POS for the pilot; Wiki POS alone cannot satisfy a two-family rule. Entry lineage of Wiki remains unresolved; domain differences and absent citations do not prove independence.
5. **Missing semantic assessment:** all 585 records lack a genuine independent assessment or two independent Vietnamese definitions. Environment probes found no configured provider credentials/model and no known Ollama/LM Studio local model. **Real provider calls = 0; real assessments = 0.** Explicit OpenAI configuration without credentials returns `PROVIDER_CREDENTIALS_NOT_CONFIGURED` and continues the batch. It is not a successful API call.
6. **Optional draft fields:** all 560 existing rows still have at least one optional field unverified. Even sufficient core evidence would not qualify the whole current record. This task preserves draft bytes and verified flags remain false; it does not erase optional content to manufacture approvals.

Aggregated categories are candidate-level and overlap; they must not be summed as independent records:

| Category, combined 585 | Records |
|---|---:|
| Insufficient independent POS evidence | 585 |
| Missing semantic validation | 585 |
| Optional draft unverified | 560 |
| At least one active source not acquired | 519 |
| Source lineage unresolved in processed evidence | 68 |
| A processed source fetch unavailable | 36 |
| Unsupported parsing/form mapping | 28 |
| Reading divergence | 18 |
| No parsed headword in a processed non-Wiki source | 2 |
| Remaining field conflicts | 2 |

“Not acquired” does not mean 519 failed HTTP requests: most of the existing snapshot was outside the 50-word web pilot. Exact source status and field evidence are in each manifest record. Known conflicts are not downgraded merely to improve a success metric.

## Real assessor adapters

The existing adapter interface now has stdlib REST transports for configured OpenAI Responses and Gemini generateContent endpoints. No SDK/dependency, key, subscription or trust issuer was created. See [policy/configuration](../Content/vocabulary-verification-policy.md).

Structured output covers meaning, Vietnamese naturalness, reading/polyphony, POS, classifiers, context and disagreements. Requests contain the actual taught academic fields and source extraction references. API metadata supplies actual model/version/response ID; responses bind request SHA-256 and known extraction hashes. CONFLICT overrides equivalence; unknown required facets remain uncertain. Same author-model aliases are denied. Operator-supplied author identity is not independently authenticated and must be accurate.

Retries/timeouts/response size are bounded, redirects are denied, errors are sanitized, OpenAI requests use `store=false`, and a failed later request cannot inherit an earlier response trace. Raw responses would remain private. **Mock HTTP tests only verify contract behavior.** Live provider compatibility, model quality and semantic accuracy remain untested until an authorized independent provider/model is configured. Model confidence cannot override source contradictions, license restrictions or missing POS.

## Additional source and licensing investigation

Details and primary links: [source registry research](../Content/automated-source-registry.md).

- **CVDICT:** GitHub API and raw README main/master again returned 404. Indexed README claims a CC-CEDICT-derived translation and BY-SA license; unavailable live bytes cannot verify entries, rights or independence. No access controls were bypassed.
- **Vietnamese Wiki:** actual site rights API returned CC BY-SA 4.0; response hash is in the manifest. Revision attribution and per-entry lineage checks still apply. Two locales remain one family.
- **COW:** live license file is available and WordNet-style. The authors' paper describes merging SEW and Wiktionary data; no automatic independence from Wiki was claimed. No Chinese–English sense was presented as a pre-existing Vietnamese translation.
- **CLC HCMUS Chinese–Vietnamese:** live page offers sample downloads, without inspected reuse terms sufficient for this application's use; data was not imported.
- **Trannosaur/PanLex:** live README declares BY-SA and warns that modern Vietnamese/Hán-Nôm senses are mixed. Current PanLex license is BY-NC-SA with separate commercial authorization. Historical snapshot rights and entry origin remain unresolved; the mirror declaration was not used as a rights grant.
- **CWN:** old restrictive terms appear in the search index, but the direct license URL now returns 404. This is not a verified current license and is not confused with COW. No data was ingested.

Rights restrictions and application publication authorization remain separate from linguistic assessment. **Unsigned publication proposals = 0**, because no whole record is eligible; **trusted production receipts = 0**. No signer/key, issuer authorization or production source-rights grant was fabricated.

## Corrections on isolated data

- **IDs 6 and 42, 再见:** proposed `Thán từ` rather than the existing verb label for the farewell sense. English Wiki supports interjection/noun, but a corroborating independent POS/sense source is still missing. Both proposals are blocked; both lesson IDs and existing data remain unchanged.
- **ID 173, 手表:** actual CC-CEDICT form evidence supports `手錶`. An explicit guarded field-only pending proposal was generated and applied through real Flyway on `jiayou_real_correction_d61d20c3`, cloned from the owned local V14 fixture. Exactly **one academic field changed on one record**; audit revision changed 0→1. **560 rows before/after**, same ID/lesson, unchanged draft optional text and actual synthetic notebook/SRS relationships. The row remains PENDING_REVIEW with optional flags false and no publication digest. Flyway applied one private candidate migration; rerun applied zero. This SQL was not placed in application release resources or an allowlist.

Field-only correction is opt-in, only for VERIFIED traditional/POS fields on existing NEEDS_RESEARCH records. POS also requires semantic equivalence for the selected sense. Word/reading/meaning changes, unverified fields, conflicts, licensing blocks, stale before-content/revisions and withdrawn records cannot use this path. No-op imports now also reject later revocation/provenance audit changes; a genuinely fresh verified correction with current before/revision remains possible. Normal AUTO_VERIFIED pending import behavior is retained.

Total proposed corrections: **3**. Eligible/applied to isolated data: **1**. Blocked: **2**. Real corpus approvals/publications: **0**. No production database was read or mutated.

## Validation

Tests used an isolated archive of baseline HEAD plus this task's pipeline files. Unrelated dirty backend/frontend changes were deliberately preserved and excluded from this feature candidate; their integration is **not** certified by these runs. Original working-tree target/dist were not built or cleaned. Maven was offline against cached dependencies; frontend used the existing isolated dependency installation.

| Executed gate | Result |
|---|---|
| Python unit + local PostgreSQL ingestion + Java receipt bridge | **74 total, 74 passed, 0 failures/errors/skips**: 71 unit, 2 PG, 1 Java |
| Existing offline pipeline units | All 50 retained and passed; 21 new unit tests |
| Actual PostgreSQL generated correction via Flyway | applied 1 / repeat 0; pending 1; learner data preserved |
| Actual post-migration snapshot Python↔Java V2 digest comparison | **560/560 match**; no signing |
| `mvn -o -B clean verify`, H2 | exit 0; **509 total, 502 passed, 0 failures/errors, 7 skipped** |
| `mvn -o -B test`, CI PostgreSQL env on separate local DB | exit 0; **509 total, 502 passed, 0 failures/errors, 7 skipped** |
| `npm test` | exit 0; **276/276 Vitest in 31 files + 8/8 Node tests** |
| `npm run lint`, `npm run build` | both exit 0 |
| `git diff --check`, implementation staged diff check | exit 0; only Git LF→CRLF normalization notices |

Each Maven suite's seven skips are the existing three `PostgresSchemaStagingRehearsalTest` and four `ProductionMigrationSafetyTest` opt-in cases; their names/reasons are retained verbatim in the manifest. This task did not enable those seven separate rehearsal databases. It did run PostgreSQL API tests, both ingestion integration cases and a real Flyway pending correction on an isolated clone. No test was removed/skipped to obtain a green result. Provider mock cases, Java assertions and digest comparisons are not added to JUnit test totals.

No new CVE scan was run. Existing Spring advisory memo/exceptions remain in force; this report does not claim a CVE-free scanner result.

CI configuration was preserved: its existing offline command currently invokes the original `test_engine` module. The 21 new `test_unblock` cases and the opt-in integration modules were explicitly run locally as reported above; they are not silently claimed to run in that existing CI step. A subsequent CI change should include the new offline module.

## Workspace and exact delta

Start status: 42 modified tracked paths, 1 deleted (`render.yaml`), 77 untracked default status entries; index empty. Backup/status/diffs and SHA-256 for **1001 baseline files** were captured before changes. **992 baseline files retain identical hashes**; the other nine are clean-at-start task files listed below. All maintainer dirty/untracked files are preserved, with zero unrelated hash changes. Raw source/license objects, private DB config, generated SQL, fixtures and logs stay outside Git.

Implementation files, committed separately from this report:

- `scripts/vocabulary_pipeline/engine.py`
- `scripts/vocabulary_pipeline/assessors.py`
- `scripts/vocabulary_pipeline/ingestion.py`
- `scripts/vocabulary_pipeline/__main__.py`
- `scripts/vocabulary_pipeline/source-registry.json`
- `scripts/vocabulary_pipeline/ReceiptCompatibilityProbe.java`
- `scripts/vocabulary_pipeline/test_postgres.py`
- `scripts/vocabulary_pipeline/test_unblock.py` (new)
- `docs/Content/vocabulary-verification-policy.md`
- `docs/Content/automated-source-registry.md`

Evidence commit adds only this report and `docs/Content/vocabulary-unblock-manifest-2026-10-29.jsonl`. Implementation before/after SHA-256 is in the manifest; report/manifest self-hashes are omitted to avoid circular references and are available through Git objects. No migrations, backend runtime source, frontend source, CI or deployment configuration changed in this task.

Remaining work is concrete: obtain independently attributable/reusable POS-and-sense evidence, configure a genuinely independent assessor when available, resolve reading shorthand/divergences and optional draft evidence, then repeat this pilot before expansion. Live assessor absence does not prevent research or scoped draft correction, but current evidence does not justify AUTO_VERIFIED or publication.

Final cleanup limitation: after the completed test runs, the Docker Desktop Linux daemon API became unavailable (`dockerDesktopLinuxEngine` pipe missing). The final inspect/stop of owned container `jiayou-vocabulary-pg-20261028` could not execute, so its current state is not confirmed. Docker was not restarted and no other containers were touched. Previously completed PostgreSQL/Flyway tests and retained logs are distinct from this unconfirmed cleanup; local audit databases/evidence were retained.
