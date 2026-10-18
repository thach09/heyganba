# Product metrics v1

Study days use `Asia/Ho_Chi_Minh`. Registration cohort membership comes from
`users.created_at`, restricted to ROLE_USER. Registration is not duplicated into
an analytics table. D7 return means at least one completed learning item on days
7–9 after registration; D30 uses days 30–32. Report only fully observed windows
through a specified closed study day. An immature cohort has no rate, not 0%.
Count each learner once and include learners who registered but never studied.

Completed learning comes from `study_activities.item_count > 0`, independently
of correctness or streak qualification. Existing sources cover SRS reviews,
grammar answers and submitted exams; notebook practice uses its existing source.
Kana typing and anonymous sessions currently lack durable completion facts and
are excluded. These limits must accompany retention reports. Historic aggregates
do not reconstruct exact attempt timestamps or content-level mistakes.

Streak survival measures continuous qualification under the streak policy, whose
threshold differs from a meaningful single completed item. Current mutable
`streaks` cannot reconstruct historical cohort survival. Do not publish a historic
survival percentage from the current streak counter.

Minimal first-party funnel events fill facts that cannot be inferred:

- `auth.login.v1`: server-confirmed successful login after required 2FA, never refresh.
- `learning.started.v1`: authenticated SRS/grammar station successfully loads a
  nonempty practice set. This is a client signal, not proof of completion. One
  UUID per mounted station deduplicates repeat loads. Exam starts already exist
  in exam-attempt records and are not duplicated.

No clicks, answer text, email, IP, tokens or arbitrary metadata are stored.
Schema constrains event/module pairs and UUID keys. Client events cannot claim
login or completion. The authenticated principal supplies learner identity.
Events cascade on account deletion; no retention-policy duration is invented.
Event delivery is best effort: no retries, learning never waits on event writes,
and transaction-isolated failures produce a redacted operational warning.
Failure rates and coverage gaps mean funnels are observational, not billing data.

`ProductMetricsService.retention` is an internal bounded-cohort reporting method,
not a dashboard or public endpoint. Its calculator is deterministic and tested.
Queries use bound parameters. No analytics infrastructure beyond PostgreSQL is
required. Future changes to windows or qualifying facts require a metric version.
