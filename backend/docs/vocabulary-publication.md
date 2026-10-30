# Vocabulary publication authority

The Chinese runtime requires both APPROVED status and a valid server-owned publication proof. A URL, domain allowlist, imported review flag, legacy digest or admin note cannot substitute for a proof. An administrator may preview drafts; this does not grant publication authority. Exam generation applies the proof gate even to administrators.

## Operator contract

Set `app.vocabulary.publication.catalog` to an absolute path outside application resources. The default is blank and denies learner access to vocabulary. Mount the catalog and its sibling `objects/` directory read-only for the application identity. Restrict writers to the trusted content-verification/release operator. No HTTP endpoint can register keys, issue receipts, change rights or configure this path. Never configure the synthetic test catalog in a real environment.

The operator must assess actual source content, source independence, entry/sense alignment and each field before issuing a receipt. WEB_CROSS_CHECKED is supported without mandatory human editorial review. A signature authenticates that assessment; it does not establish its factual correctness or copyright permission. Missing legal permission remains a separate blocker, not a reason to fabricate a signed clearance.

The JSON version is `VOCAB_PUBLICATION_CATALOG_V1`. It contains:

- `instanceId`: stable installation identity, scoped independently from other databases.
- `keys`: trusted issuer/key IDs, Ed25519 X.509 public keys (Base64), active flag and validity intervals (`notBefore`, `notAfter`). Private signing keys never belong in the application.
- `inactiveIssuers` and `revokedReceipts`: explicit deny lists.
- `policy`: required verificationMethod/policyVersion/decisionVersion, source registrations (family, kind, allowedFields, syllabusVersions) and optional-field capabilities.
- `rights`: source ID to explicit `CLEARED` decision, licenseId, decisionRef, notAfter and permitted scopes (`CORE_FIELDS`, `OPTIONAL_FIELDS`, `SYLLABUS_IDS`). These are operator decisions backed by licensing records, not claims accepted from a content author.
- `receipts`: `<instanceId>:vocabulary:<databaseId>` to Base64 of the strict signed V1 envelope.

Receipt subjects use `VOCAB_CONTENT_V2` (see the exported digest version in source) and the current eligibility revision. That revision is the latest vocabulary CREATE/UPDATE/ARCHIVE/REJECT/PROVENANCE/PROVENANCE_UPDATE/PUBLISH_REVOKE audit ID, or zero before such an event. APPROVE does not increment eligibility: a duplicate approval is idempotent. All admin vocabulary transitions lock the same row. Edits return to PENDING_REVIEW and synchronize modern/compatibility academic columns; editing content back does not revive an old receipt.

Each referenced evidence bundle, source snapshot and extraction must exist at `objects/<sha256>` and match its signed SHA-256. Missing, changed, oversized or symlinked objects deny access. Catalog limit: 8 MiB; individual evidence object limit: 32 MiB; the receipt verifier has stricter envelope/payload limits. This implementation is intended for controlled batches, not an unbounded bulk signing/import mechanism.

The fixture builder under test sources documents the precise JSON shape using only ephemeral keys and synthetic source objects. It is not an operator signing tool and is excluded from the executable JAR. No real corpus has been signed or licensed by these tests.

## Explicit core-subset proposals

The research pipeline may report CORE_VERIFIED while supplemental drafts remain unresolved. This research outcome alone grants no runtime visibility. Authority and receipt V1 still require WORD/READING/MEANING/PART_OF_SPEECH, two registered independent lexical families for each, and a digest over all nine actual stored fields. Present traditional must also be verified.

The V1.2 research projector can prepare a separate pending core-only candidate, with unverified traditional and all retained Hán Việt/example enrichment absent from its academic columns. Original candidate/result bytes remain in an immutable evidence object and a generated operator-owned `vocabulary_research_quarantine` row. The pending update and retention commit together with before-content/revision guards. Quarantine has no learner Entity/API, and no production migration or release allowlist is automatically changed. Keep it and raw objects outside public-serving paths, with access restricted to the verification/release operator.

The quarantine also captures the existing physical academic columns, including hidden/different legacy aliases, before synchronizing them; it retains a separate SHA-256 for that DB snapshot. Effective getter values alone are insufficient to preserve every draft. Raw snapshots never participate in learner projection or authorize a field.

This is an explicit data projection, not an authorization mask. The operator must read back the projected row and new revision before creating an unsigned proposal for the existing V1 receipt contract. Capabilities remain false; withheld fields are actually null/NOT_PRESENT. An original receipt cannot bind the projected row, a projected receipt cannot bind a row retaining draft fields, and reintroducing a draft changes the full digest and denies access. No optional field is silently discarded or described as verified. FULLY_VERIFIED is separate from CORE_VERIFIED and from permission to publish.

No runtime authority or digest implementation is relaxed by this path. New policy-version receipts require an explicit compatible trusted catalog and actual source rights. Existing catalog policy versions are not upgraded automatically. Synthetic Java/PG bridge tests demonstrate representation compatibility, not real corpus clearance or a genuine assessor result.

## Withdrawal and read boundaries

### Source-supported pending research additions

The research CLI's `--pending-research-output` is an explicit, separate admission
mode for **new** rows only. A reusable, immutable DEFINITION extraction must match
the proposed word, reading and selected sense hash. The candidate must declare its
editorial Vietnamese origin and matching content license; missing semantic/POS
verification remains visible in field results. This is not CORE_VERIFIED and does
not relax the receipt verifier, trusted catalog, rights registry or digest contract.

The generated candidate SQL stays outside release resources and always writes
PENDING_REVIEW, no lesson/official HSK assignment, false optional capabilities and
no publication digest. It cannot overwrite an existing row, merge homographs,
import unverified examples or issue a receipt. Transaction locking, exact binding,
withdrawal checks and no-op reruns remain required. Full source-supported drafts
are retained, not passed through the publication core projection. An external AI
key is not required to research or store pending content; independent evidence is
still required to call it verified. The 2026-10-30 local rehearsal is not a release.

Every HTTP request observes one catalog snapshot. The next request reloads the catalog and sees key, receipt and rights revocations; there is no cross-request TTL. An already running request may complete against its prior snapshot. Use an atomic operator-side catalog replacement to avoid transient partial JSON; partial/malformed reads deny access.

Vocabulary lessons, dictionary, notebook, SRS, Hanzi compounds and dashboard word counts check current proofs. A warmed SRS cache is not authorization: academic data is rebuilt from current database rows. Withheld rows on an early page cannot starve later eligible SRS words. Historical embedded Hanzi definitions are replaced with the authorized vocabulary projection.

New exam snapshots bind all lexical answer/distractor sources to proof IDs and content digests. Recovery, submission and detailed-result reads revalidate those bindings. Old lexical snapshots without a trustworthy origin manifest are rejected with a short learner-facing message. Ownership, attempt expiration, grading and idempotent submission remain server-authoritative. No attempt or learning history is deleted by a vocabulary withdrawal.

The durable database and filesystem trust configuration remain operator trust boundaries. Database administrators can alter audit history; the application does not claim tamper-proof storage against a database superuser. Non-vocabulary grammar/reading/Hanzi base content retains its existing separate review policy. Syllabus-version/official-level coverage still requires an independently validated content release and is not inferred from an APPROVED flag.
