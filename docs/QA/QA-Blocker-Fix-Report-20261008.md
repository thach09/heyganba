# QA Blocker Fix Report — 2026-10-08

Base: fix/qa-session-mutations at 3501b5f. Working branch: fix/qa-blocker-retries-focus.

**All three findings are VERIFIED FIXED in the tested local Chrome/PostgreSQL configuration.** Each was reproduced on the unchanged base before editing. The user/Tech Lead explicitly approved the [persistence proposal](Blocker-Idempotency-Proposal-20261008.md) after the initial blocked handoff; only then was V38 created. No production verification, push, merge or deployment is claimed.

| ID | Reproduced before fix | Root cause | Exact fix | Regression added | Original-scenario verification | Final status |
| --- | --- | --- | --- | --- | --- | --- |
| QA-008 | YES | Independent Grammar POSTs had no logical-action identity; retry after a committed response was lost recorded another item. | Keep original answer/UUID through failure, expose explicit retry, require UUID at API; lock learner and replay a matching receipt or save the typed result atomically with activity/streak. Reject changed payload under the same ID. | Commit→discard result→retry; one item/EXP/evidence fact; new IDs; rollback; concurrent retry; learner/operation scope; changed-payload rejection. UI retains answer/ID and counts score once. | Real HTTP 200 committed, response dropped, UI retry: activity stays 1, full result/EXP/streak unchanged, score 1/1. New question and pre-commit retry work at 1440/390. | VERIFIED FIXED |
| NEW-REGRESSION-001 | YES | SRS retry reapplied committed schedule/activity; one aggregate review row hid duplication. | Retain UUID/vocabulary/rating; replay original SRS result without reapplying SM-2, activity, streak or evidence. New reviews get new UUIDs. | Full schedule snapshot on retry; old outcome replay after a later review; distinct reviews; concurrent retries; rollback; changed rating/content rejection; EXP/streak thresholds; UI count/ID lifetime. | Real commit→lost response→retry: one activity and one UI review, unchanged repetitions/interval/ease/due/last-reviewed/update time. New card and pre-commit retry work at 1440/390. | VERIFIED FIXED |
| QA-006 | YES | Native Tab navigation could leave the dialog for BODY/browser chrome; restoration did not meet strict Help focus acceptance. | Opt-in Tab/Shift+Tab cycling and connected-opener restoration in existing Modal, enabled only for Help; preserve heading initial focus, Escape and layout. | Focused test failed before fix, passes after; six Tabs/six Shift+Tabs per width, document focus, unchanged checkpoint, Escape/opener and resumed shortcuts. | Final 1440/390 replay: focus contained, exam unchanged, Escape closes, opener restored; keys resume after returning focus to the exam. | VERIFIED FIXED |

Verification used supervised scripted Chrome interaction with the real API/PostgreSQL, native pointer/keyboard events and request/DB assertions, plus screenshot inspection. This is not a claim of additional human testing. Mutation probes recorded no page errors or horizontal overflow.

## Approved mutation contract

- Both POST bodies require attemptId as a UUID identifying the logical action, retained with its immutable payload through retries. New displayed questions/reviews reset it.
- V38 adds only learning_mutation_receipts: PK (user_id, operation, attempt_id), content ID, original answer/rating, typed response JSON and timestamp. Learner FK cascades on deletion; operations are restricted to Grammar/SRS. No existing migration/table was edited.
- Both writable transactions use existing UserRepository.findLockedById. Same learner/operation/ID replays the result; different content/payload under that ID returns 400. Concurrent retries serialize.
- Receipt, scheduling, activity and streak commit/rollback together. Pre-commit failure can retry. Only first execution publishes learning evidence; its existing best-effort AFTER_COMMIT contract remains unchanged.
- Authentication, content visibility, vocabulary restrictions and existing rate limits still run; replay bypasses none. Learner identity comes from the authenticated principal.
- Entire typed result replays, including original SRS due date; existing ApiResponse.timestamp describes each new HTTP response.
- Actual backend restart replayed four original receipts without changing results, activity or SRS state, including after later distinct reviews.

## Tests executed

| Check | Result |
| --- | --- |
| Focused backend | 37 pass, including 8 new LearningMutationRetryTest cases |
| Frontend npm test | 58 Vitest + 8 legacy handwriting pass |
| Frontend lint/build | Pass; ten existing hook/effect warnings, none added |
| Backend H2 mvn -B clean verify | 206 tests, zero failures/errors/skips; BUILD SUCCESS |
| Backend PostgreSQL 16 full mvn -B clean verify | 206 tests, zero failures/errors/skips; real PG driver/dialect, Flyway enabled, Hibernate validate, no H2 fallback |
| Flyway/schema | Fresh heyganba_qa_blocker_tests_20261008: 37 successful migration/history entries, V38 applied. Separate browser DB heyganba_blocker_ui_20261008 also migrated/schema-validated |
| Lost-response browser | Grammar/SRS at 1440×1000 and 390×844: commit→lost response→safe retry; new action; pre-commit failure/retry; typed result, activity, EXP/streak, SRS state, receipt/evidence counts and UI counts asserted |
| Original related probes | SRS 3-second save blocks early advancement; two cards persist; third pre-commit failure retries once. Grammar 1.8-second actual response delay yields one check/item under repeated keys; next question and pre-commit retry pass |
| Final Help browser | Both widths pass Tab/Shift+Tab containment, unchanged checkpoint, Escape, restored opener and resumed shortcuts |
| Restart replay | Four receipts pass after backend process restart |
| Visual/design | Desktop/mobile pending, retry/result and Help images opened/inspected; existing Impeccable detector exits 0 for touched files, no output |

## Files changed

Backend: Grammar controller; GrammarCheckRequest/FlashcardReviewRequest; GrammarService/FlashcardService; new receipt entity/repository/service; V38__learning_mutation_receipts.sql. New LearningMutationRetryTest; existing Grammar/Flashcard/content-visibility/learning-evidence request fixtures updated for UUID while retaining original assertions.

Frontend: GrammarView/FlashcardView, Modal and ExamView Help caller. Coverage: qa-batch-b.test.tsx, qa-regression.mjs, new qa-blocker-regression.mjs. Documentation: this report and approved proposal.

Schema changed: **YES — approved additive V38 only**. Dependencies: **NO changes**. Auth architecture, RBAC/2FA, ownership/content review, rate limits, CORS/CSP source configuration, Japanese curriculum, product metrics/formulas, feature flags and unrelated frontend modules remain unchanged. Local QA origin/port/databases were configured only for isolated testing. Other Modal callers retain prior native behavior.

## Remaining warnings, limits and Tech Lead review

- The approved required-UUID contract makes older clients without attemptId receive 400. API/client versions need coordination when eventually released; this sprint performs no release.
- Receipts have no automatic expiry: deleting them would let old retries execute again. Retention/storage growth and per-learner serialization merit review. No broad ledger/worker/cache/transaction framework was introduced.
- Ten existing lint warnings and existing Mockito/JDK dynamic-agent warnings remain. Existing error toasts retain manual dismissal after recovery; native-click probes confirm retry controls remain reachable, including mobile scrolling. No unrelated cleanup was added.
- Browser coverage is Chrome viewport emulation, not physical mobile/cross-engine testing. No production data/behavior was tested. Scope is these three findings and their specified related regressions.

Evidence: C:\Users\LENOVO\AppData\Local\Temp\heyganba-blocker-fix-20261008. Key files: baseline exploratory.json/focus-probe.json, final-mutations/results.json and screenshots, final-help/results-C.json, related-final/verification.json, restart-proof/restart-replay.json, frontend logs and final H2/PG logs. Logs are credential-redacted; restart fixtures contain no passwords/tokens.

Changes are committed locally in focused Conventional Commits, the working tree is clean at handoff, and task-owned QA servers are stopped. No push, merge or deployment occurred. Work stops after these three findings, with no redesign or future feature work.
