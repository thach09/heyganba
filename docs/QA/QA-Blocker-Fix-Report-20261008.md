# QA Blocker Fix Report — 2026-10-08

Base: `fix/qa-session-mutations` at `3501b5f`. Working branch: `fix/qa-blocker-retries-focus`.

**Sprint remains incomplete: one VERIFIED FIXED, two blocked on explicit Tech Lead persistence approval.** The three findings were independently replayed before editing; the previous fix report and existing passing tests were not used as proof. No mutation implementation or migration has been created while approval is pending.

| ID | Reproduced before fix | Root cause | Exact fix | Regression coverage | Original-scenario verification | Final status |
| --- | --- | --- | --- | --- | --- | --- |
| QA-008 | YES | Every Grammar POST records an activity independently; failed transport gives the client no logical-attempt identity to reuse. | Not implemented pending persistence approval. Proposed learner-scoped durable receipt and immutable retry payload/attempt ID. | Fresh external Chrome probe forwards a real POST, confirms HTTP 200, discards the response, then retries; DB assertions confirm the defect. Passing lost-response regression will accompany the approved implementation. | One displayed answer still creates two GRAMMAR items, 1→2, although UI score counts it once. | BLOCKED — approval required |
| NEW-REGRESSION-001 | YES | SRS retry reapplies an already committed review and records another activity; aggregate review-row count conceals duplication. | Not implemented pending the same approval. Proposed replay of the original SRS outcome without repeating state/activity effects. | Fresh external commit→lost response→UI retry probe; confirms FLASHCARD item count rather than relying on one aggregate review row. Passing replay/state regression awaits approval. | One displayed review still creates two FLASHCARD items, 1→2; both real POSTs return HTTP 200. | BLOCKED — approval required |
| QA-006 | YES | Native dialog navigation can move focus into BODY/browser chrome; native restoration did not meet the strict Help acceptance contract. | Add opt-in explicit Tab/Shift+Tab cycling and connected-opener restoration to the existing shared Modal; enable only for Exam Help. Keep native dialog, heading initial focus, Escape and existing layout. | New focused Help test failed before the fix and passes afterwards. Extend the real browser regression with six Tabs and six Shift+Tabs at each width, focus/document assertions, checkpoint equality, Escape, opener and resumed shortcuts. | At 1440 and 390, focus stays inside Help, background exam state is unchanged, Escape closes, opener regains focus, and study shortcuts work after returning focus to the exam. | VERIFIED FIXED — local Chrome |

Browser verification above is supervised scripted interaction with the actual API/PostgreSQL, plus screenshot inspection, not a claim of additional human testing. Screenshots and original-failure evidence were captured outside the repository.

## Persistence approval gate

See [the concrete proposal](Blocker-Idempotency-Proposal-20261008.md) for schema, transaction/retry contract, alternatives and acceptance tests. One additive `learning_mutation_receipts` table is proposed, keyed by authenticated learner, operation and client attempt UUID, storing request identity and the original response in the mutation transaction. Existing aggregates and best-effort AFTER_COMMIT learning evidence cannot safely serve as replay receipts.

The Sprint 2 request explicitly says: “Do not create a migration without Tech Lead approval.” Approval was requested and remains pending at this handoff. No schema, DTO, controller, Grammar/SRS service or mutation UI change was made. Retrying these two ambiguous completed mutations remains unsafe until the approved fix is implemented.

Tech Lead review is required for the durable receipt schema/retention, the required `attemptId` API contract for older clients, and use of the existing learner row lock to serialize the two affected paths. These are proposed choices, not deployed behavior.

## Validation executed

- Frontend `npm test`: 56 Vitest + 8 legacy handwriting tests pass. Includes the existing delayed SRS save, two distinct reviews, pre-commit retry, repeated Grammar input and modal shortcut regressions.
- `npm run lint` and `npm run build`: pass. Ten existing hook/effect lint warnings remain; this focus change adds none.
- Backend `mvn -B clean verify`: 198 tests, zero failures/errors/skips. The first runner was interrupted because PowerShell `ErrorActionPreference=Stop` promoted Mockito stderr to a terminating error; rerun with normal stderr handling completed BUILD SUCCESS. Existing Mockito/JDK dynamic-agent warnings remain.
- Full PostgreSQL test rerun was not required for this partial fix because backend mutation/persistence code is unchanged. The browser backend uses PostgreSQL 16, Flyway enabled and Hibernate `validate`, with all 36 existing migrations; no migration was added or edited.
- Real related browser probes both pass: SRS 3-second saves cannot be canceled by early advancement, two distinct cards persist, and a pre-commit failure retries the third card once; Grammar rapid repeated input yields one delayed check/item, next question works, and a pre-commit failure creates no activity until retry succeeds.
- Exam Help original keyboard and stricter focus probes pass at 1440×1000 and 390×844. Desktop/mobile screenshots were opened and inspected; no horizontal overflow. Enter on the restored Help button retains its native role of reopening Help; the resumed study-shortcut check first returns focus to the question.
- Existing Impeccable design detector invoked for the touched Modal/Exam files: exit 0, no output. No visual redesign or new design tokens.

## Files and unchanged systems

Changed: `frontend/src/components/Modal.tsx`, `frontend/src/features/exam/ExamView.tsx`, `frontend/tests/unit/qa-batch-b.test.tsx`, `frontend/tests/qa-regression.mjs`, this report and the linked persistence proposal.

Schema changed: **NO**. Dependencies changed: **NO**. Auth architecture, RBAC/2FA, ownership/content review, rate limits, CORS/CSP source configuration, Japanese curriculum, metrics and future features remain unchanged. Only the isolated local QA server origin/port/database were configured for browser testing. Other shared-modal callers retain their previous native behavior because explicit cycling is opt-in.

Evidence: `C:\Users\LENOVO\AppData\Local\Temp\heyganba-blocker-fix-20261008`, especially `exploratory.json`, baseline `focus-probe.json`, `focus-after/results-C.json`, `related/verification.json`, frontend logs and `backend-h2-retry.log`. Independent report consulted: `heyganba-independent-qa-20261008/Independent-QA-Verification-Report.md`.

Focused fix commit: `99637d8`. Task-owned QA servers are stopped after checks, logs are credential-redacted and the working tree is clean at handoff. No push, merge or deployment occurred. Work stops at this report while the two persistence-dependent findings await approval.
