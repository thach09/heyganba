# Grammar/SRS retry receipt proposal — approval required

Base: `fix/qa-session-mutations`, `3501b5f`. No migration or mutation implementation has been created.

## Reproduced problem

Fresh local PostgreSQL browser fixtures reproduced both independent findings: forward the real POST, confirm HTTP 200, discard its response, then retry from the UI. Grammar and SRS each increased `study_activities.item_count` from 1 to 2 for one displayed action. The SRS aggregate review row count remained 1, so it does not detect repeated application of a review.

Neither request currently identifies the logical client action. The server applies each POST independently. The frontend pending guard cannot distinguish a pre-commit failure from a lost successful response.

## Smallest proposed persistence change

One additive table, `learning_mutation_receipts`, restricted to the two affected operations:

| Column | Purpose |
| --- | --- |
| `user_id BIGINT` | FK to the authenticated learner, `ON DELETE CASCADE` |
| `operation VARCHAR(16)` | Constrained to `GRAMMAR_CHECK` or `SRS_REVIEW` |
| `attempt_id UUID` | Logical action ID generated once by the client and retained through retries |
| `content_id BIGINT` | Exercise or vocabulary ID |
| `request_value VARCHAR(200)` | Exact submitted answer or rating; detects key reuse with a different payload |
| `response_json TEXT` | Original typed response, including the original SRS outcome |
| `created_at TIMESTAMP WITH TIME ZONE` | Receipt timestamp |

Primary key: `(user_id, operation, attempt_id)`. No existing table or migration changes. Receipts have no automatic expiry in this fix: deleting them would allow old retries to execute again. Retention can be reviewed separately without changing this sprint's contract.

## Local implementation contract

1. Require a UUID `attemptId` on the affected mutation requests. Update their frontend callers and request fixtures together. This is an API contract change for older clients and requires Tech Lead review.
2. Keep one immutable pending payload/ID through a transport failure. Grammar retry resends the original selected answer; SRS retry resends the original rating. A genuinely new displayed question/review receives a new ID.
3. Retain authentication, content visibility, vocabulary restrictions and existing rate limits. Scope receipt lookup to the authenticated user, never a client-supplied learner.
4. Use the existing `UserRepository.findLockedById` inside the affected writable transaction to serialize competing receipts for that learner. Check the receipt before applying effects. A matching receipt returns its original response; a reused ID with different content/payload is rejected.
5. Save the response receipt in the same transaction as review state, study activity and streak changes. Rollback leaves no receipt or learning effects; committed response loss leaves a receipt that a retry can replay. Publish learning evidence only for the first execution. No generic transaction/event framework is needed.

## Alternatives considered

- Frontend debounce or disabling retry: cannot resolve a committed request whose response was lost; removes recovery for real failures.
- In-memory/Redis deduplication: not atomic with the database transaction; restarts, eviction or process boundaries can lose protection. Redis is optional in this product.
- Dedupe by user/content/answer or time window: conflates legitimate repeated practice with transport retries.
- Existing `srs_reviews`/`study_activities`: aggregates overwrite individual attempts and do not retain replayable results.
- Existing `learning_attempts`: advisory evidence is written in a separate, fail-open AFTER_COMMIT transaction; it lacks the original answer/rating and SRS response. Repurposing it would change an unrelated evidence contract and still need persistence changes for replay.

## Required validation after approval

Real commit → dropped response → UI retry for each module; exact original result replay; one activity item and unchanged SRS repetitions/interval/ease/due/last-reviewed on retry; one UI score/review count; new actions proceed; pre-commit failures can retry; concurrent same-ID submissions; changed-payload rejection; ownership isolation; receipt survives backend restart.

Run full frontend tests/lint/build, backend H2 and PostgreSQL 16 with Flyway enabled and Hibernate `validate`, plus the related slow-save, double-input and next-question scenarios. Review screenshots at 1440 and 390. Create the additive migration only after explicit Tech Lead approval.
