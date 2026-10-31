# Jiayou — final engineering audit

Repository: https://github.com/thach09/jiayou · reviewed 31 October 2026.
This report ships inside the release tree. Resolve its containing main SHA with
`git rev-parse HEAD`; the final handover response records the immutable merged SHA
and completed main CI runs. A clean repository does not authorize deployment.

## Functional history disposition

Merge-base: `6169a015dd384ccaa085f0a89a1799035e240de7`. Refreshed baseline main was
`96cba89748b41b719d574b100d7b3a697059513a`; V2.1 tip remains
`9e8f3d789448c3d30e991bfd02de0f31785ffa1e`. Full log, cherry equivalence,
range-diff and semantic review found 41 branch-only and four baseline-main-only
commits, rather than relying on GitHub's file list.

The [complete machine-readable matrix](engineering-audit-evidence/v21-integration-matrix.json)
records every SHA, files, behavior, dependencies, equivalent implementation and disposition:

| Disposition | Count | Result |
|---|---:|---|
| Qualified V2.1 functionality | 26 | Integrated selectively, including four repaired/adapted contributions |
| ALREADY_IN_MAIN | 1 | Rate-limit window fix, PR46 |
| SUPERSEDED | 1 | Old dependency patch replaced by PR47; no old lockfile restored |
| RESEARCH_ONLY | 12 | Retained on original/archive refs; no editorial publication inferred |
| UNSAFE_OR_UNVERIFIED | 1 | Global legacy Flyway strategy conflicts with isolated bootstrap; retained outside release |

Commit5e2a1b5 is split: useful supplemental-draft withholding API/authority regressions
are integrated; its research/corpus pipeline remains non-public. Commit count is not
a completeness measure. The application, routes, SRS, grammar, exams and account
infrastructure already present on baseline main were retained.

## Integrated fixes and independent review

[PR50](https://github.com/thach09/jiayou/pull/50), squash
`7ed0e5dd6c63bb0db161cb8e39511ffaecbcbcf8`, adds readiness tied to Actuator,
bounded SRS eviction/midnight expiry with authenticated cache-miss fallback,
versioned effective-field digests and signed publication receipt verification.
Absent/revoked/mismatched catalogs fail closed. Academic creation/edits remain pending;
the initial Jiayou profile rejects publication before any write. Chinese dictionary
source and speech client identity are Jiayou. Japanese corpus/helpers are excluded
from the executable JAR, with their bytes and explicit historical tests preserved.

[PR51](https://github.com/thach09/jiayou/pull/51) contains the frontend integration
and this audit: bounded request/body deadlines, caller cancellation, speech cleanup,
exam/lesson checkpoint validation, confirmed-logout recovery erasure, stable retry
states, published-identity notebook resolution, Hanzi asset/callback recovery and
empty-group navigation, admin labels, honest internal-practice labels and dashboard
due-review routing. It preserves PR47 dependencies and the Jiayou bootstrap.

PassA used compilation and regressions. A separate reviewer read the actual diff
and found additional defects, rather than reusing implementation conclusions.
All reviewed blocking findings were corrected: static-reading publication bypass,
Hanzi empty-level trap, silent missing-voice feedback, legacy branding, resource
ownership across concurrent canvases and hidden WebGL retries after failure.
[PassB evidence](engineering-audit-evidence/independent-review-final.json) includes
35 independently executed targeted tests with no failures/skips.

## UX, accessibility and performance

Browser fixtures exercised all eight primary routes at390/768/1024/1440px in both
themes:64 route cases without horizontal overflow or error-boundary failures.
Eight additional auth-modal Escape cases passed. Twelve desktop/mobile interaction
checks cover login form, password labels/Escape, exam answer reload, missing-voice
feedback without answer loss, theme persistence and confirmed-logout checkpoint
erasure. These use intercepted synthetic APIs, not proof of server persistence.
Backend ownership/auth persistence is covered separately by API integration tests.

Screenshots were inspected; representative before/after files and browser results
are under `engineering-audit-evidence/`. The corrected baseline probe demonstrates
the no-WebGL crash; early screenshots made with an incomplete EXP fixture are not
used as product evidence. The new compact static fallback avoids blank320px spaces
and overlapping speech bubbles. Pinyin step dots retain their appearance with24px
hit areas, named controls and announced current step. Admin inputs retain labels.

No animation dependency or additional celebration was added. Reduced motion stops
the 3D idle frame loop; manual interaction still works. Cheer timers and owned GPU
geometry/material/texture resources are released, while shared palette templates
are retained. Keyboard Enter/Space works on both native fallback and WebGL controls.
This is a focused WCAG2.2-relevant review, not an accessibility certification.

Complete local font subsets retain three OFL notices and fallback glyph coverage:
30,928 serif/30,890 sans codepoints. All six upstream source hashes match. Assets
total22.27MB on disk; the measured cold dashboard requested eight font resources,
202,958 transfer bytes. This is distinct from downloading every subset at startup.
Fonts load from the same origin; no Google Fonts request is required. Bundle byte
comparisons are in `engineering-audit-evidence/bundle-size-comparison.json`;
measurements are local observations, not low-end-device benchmarks.

## Security, curriculum and migration boundary

[Source ledger](engineering-audit-evidence/source-ledger.json) distinguishes browser
specifications, ASVS5.0.0/API Security Top10 references, Unicode/Pinyin/HSK version
facts and font notices. Sources guide the audit; they do not approve translations,
prove curriculum coverage or grant publication rights. The static reading corpus
has no demonstrated publication authority and is compiled out of production even
if its DEV fixture flag is set. Pinyin's pending/admin-preview gate remains intact.

Auth/token revocation, cookie-origin defenses, RBAC/BOLA, response filtering,
payload limits, trusted proxy handling, rate limits and idempotency retain their
regressions. No high/critical issue was knowingly introduced. The signature scan
covered2,398 reachable historical/archive blobs (~96MB), with zero high-confidence
alerts. It does not establish exhaustive secret absence or security certification.

Every historical SQL/bootstrap resource is unchanged from the reviewed baseline.
Jiayou keeps its dedicated33-table schema-only lineage: roles/target marker only,
no curriculum/default admin/legacy users. Schema and API still block APPROVED in
the initial profile. PR48's source-history preflight remains available and is not
proof of live legacy compatibility. No repair/clean/baseline/checksum rewrite or
live migration was performed. The historical Japanese PostgreSQL pilot requires
its own large legacy fixture; its explicit skip is not reported as PostgreSQL PASS.

## Validation receipts and repository cleanup

PR50 CI188 and dedicated bootstrap run3 passed. Local full backend verification:
533 tests, zero failures/errors, seven explicit PostgreSQL-only skips; separate
historical audit24 tests, zero failures/errors, one historical pilot skip.
Frontend full tests, lint/build, full audit and production audit passed; final CI
receipts are linked from PR51 and the handover response. No audit severity was
lowered, advisory suppressed or dependency force-upgraded. The final batch adds
explicit retained-fixture and isolated Docker validation to CI; it never publishes
images or deploys. Bootstrap also validates main pushes.

Docker daemon was unavailable locally during this audit. Compose configuration
validation runs without starting services; fresh image/Nginx/fail-closed startup
checks run in isolated GitHub CI. A first backend test exposed an obsolete service
name assertion; it was corrected and full tests rerun. Browser harness corrections
addressed offscreen selectors, the intended beforeunload confirmation and accessible
name selection; these are not concealed product PASS claims. Vitest emits an
environment-creation performance suggestion; test isolation was not weakened.

No original source/archive worktree, branch or migration was deleted. Original138
entries retain their47 ARCHIVE/91 NEEDS_REVIEW disposition and verified1,031 hashes;
31 migration resources remain recoverable. New cleanup excludes Japanese data from
runtime instead of deleting evidence. Static reading sources remain DEV research
fixtures. Historical operating notes now point to current README/HANDOVER; long
reports, licenses and recovery evidence remain preserved rather than bulk-pruned.
The [file inventory](engineering-audit-evidence/repository-file-classification.json)
records retention categories. Generated target/dist/node_modules files are ignored
and separately inventoried, not described as nonexistent because status is clean.

## Anh Hưng: exact next task and operational limits

Use README and `docs/HANDOVER.md`; Node24, JDK21, Maven3.9, PostgreSQL16. Build with
frontend `npm ci`, full audit, lint/build/test and backend `mvn -B clean verify`.
Historical fixtures use the documented opt-in profile; they never enter runtime.
Run `python scripts/validate-compose.py` without creating services. Use the final
clean checkout and immutable merged SHA from the handover response.

Next safe task is a separately authorized read-only Arch host discovery and additive
deployment-manifest review: identify existing Ganbarou ingress/datasource location
without revealing credentials, capacity/thermal/disk budgets, port ownership and
backup ownership. Tailscale is private administration, not public accessibility.
Select Jiayou hostname, private Compose identity/networks/roles/volume/secrets,
immutable images, HTTPS/Tunnel route and rollback; reserve Ganbarou/OS headroom.
Rehearse encrypted/off-host backup restore into a separate target and initial
bootstrap/validate restart before requesting activation approval.

Ganbarou and heyganba.site were not modified. Vercel project remains preserved but
repository-ID binding query returns no linked projects; both Render auto-deploy
settings remain off. Actions validate only. No laptop access, DNS/billing change,
production secret read, database write, deployment or infrastructure purchase occurred.
No legacy accounts/password hashes/2FA/notes/SRS/exams/rewards were transferred.
Content provenance/licensing, initial admin workflow, native audio, account recovery,
legal/privacy policy, real host capacity and production acceptance remain separate
decisions. Repository handover readiness is not a public-launch claim.
