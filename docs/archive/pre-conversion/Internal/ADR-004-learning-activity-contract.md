# ADR 004: minimal learning activity contract

Status: accepted for foundation implementation, 2026-10-07.

## Existing facts and missing information

`study_activities` stores day/source totals, not individual content or mistakes.
`srs_reviews` overwrites the current scheduling state. Grammar checks have no
attempt history. `exam_results` already owns submitted result details and
timestamps; `notebook_practice_sessions` owns deduplicated session totals, and
notebook items own practice/correct counts. EXP and streak are derived summaries.
Kanji progress counts accepted practice, without complete attempt/error history.
Do not duplicate exam/notebook/streak/EXP facts into new analytics records.

## Contract and minimal storage

Use an internal immutable `LearningActivity` contract: learner ID, activity type,
content reference, optional skill reference, result, occurrence time and module.
The first adapters cover SRS and grammar. Add `learning_attempts` only for those
two missing per-attempt facts. Publish a small in-process Spring transaction event
and persist after the main learning transaction commits. This is not a queue/event
bus service and adds no infrastructure. Rollback must not create a completed fact.
Isolated capture failure logs a safe category and never breaks the answer response.
Delivery is best effort, not an exactly-once ledger; reporting must disclose gaps.

SRS references the existing vocabulary ID; result is RECALLED/FORGOT based on the
existing rating contract, not a claim of independent server answer grading.
Grammar references the exercise ID and its existing `grammar_rules.id` as the
skill reference; CORRECT/INCORRECT is server-graded. Store no answer text or email.
Content/skill references are immutable strings (`vocabulary:<id>`,
`grammar-exercise:<id>`, `grammar-rule:<id>`), generated from verified server
entities. They deliberately have no curriculum FK: archived/deleted content must
not erase the historical reference. They do not grant access to pending content.
User FK cascades on account deletion. Only trusted services can publish attempts.

No new academic taxonomy, skill catalog, AI score or persisted mastery is needed.
Progress is derived from attempt/correct counts and latest timestamp for a real
skill reference. This is observed accuracy, not mastery. No score to recalibrate
or unversioned heuristic is introduced. Future planners must account for evidence
volume, curriculum review status and the limits of self-rated SRS evidence.

One `(user_id, skill_ref, occurred_at)` index supports bounded per-skill derivation;
no general indexing of every reference. No backfill fabricates historic mistakes.
Contract version 1 must be changed explicitly if result semantics change.

## Extension path and limits

Future adapters can project exams and notebook sessions from their existing
stores, preserving their source IDs and semantics. Per-question notebook facts,
Kanji error evidence and Kana history need a separate demonstrated product need;
this milestone does not capture them speculatively. Mistake Notebook/Daily Plan
can begin with new grammar/SRS evidence and must not infer old mistakes from totals.
There is no new learner UI or public learning-history API in this milestone.

Validation: committed/rolled-back transaction capture, server content/skill IDs,
correct/incorrect derivation, failed capture isolation, FK deletion and real
PostgreSQL migration/schema checks alongside existing learning/security tests.
