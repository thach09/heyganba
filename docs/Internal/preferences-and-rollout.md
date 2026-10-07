# Preferences and rollout foundation

Authenticated `GET/PUT /users/me/preferences` only reads/writes the principal's
preferences. There is no user-ID parameter and no profile UI change. Missing rows
return unset duration, reminder OFF and no time. PUT replaces these three fields;
duration may be null or 1–1440 minutes (a technical day limit, not a recommended
study goal). Reminder time uses HH:mm, is required on opt-in, and is interpreted
in the canonical `Asia/Ho_Chi_Minh` study day. There is no per-user timezone,
notification provider, scheduler or reminder delivery promise. Turning opt-in
off clears consent even if a preferred time is retained. New rows cascade when
the account is deleted. Future reminder UX still needs disclosure and a channel
decision before delivery is enabled.

`FeatureFlagService` is server authority. Five future roadmap flags have no UI or
behavior attached. Missing configuration is OFF; enabled=true alone with a missing
percentage is also OFF. Config shape:

```yaml
app:
  rollout:
    flags:
      dailyplan:
        enabled: false
        percentage: 0
```

Keys: dailyplan, mistakenotebook, streakreminder, placementtest, learningfeedback.
Environment equivalents include `APP_ROLLOUT_FLAGS_DAILYPLAN_ENABLED` and
`APP_ROLLOUT_FLAGS_DAILYPLAN_PERCENTAGE`. Keep production unset/OFF during foundation.
Percentages outside 0–100 fail configuration validation; service also fails closed.
SHA-256 v1 assigns each authenticated learner a stable feature-specific bucket.
Increasing percentage preserves included learners. Rollout does not grant RBAC or
content access: future endpoints must call `requireEnabled` AND existing auth,
ownership/content-review checks. Frontend flags are presentation only and cannot
enable backend behavior. Do not expose unfinished features with configuration.

Promotion: implement behind OFF on a develop feature branch; verify tests and
reviewed content; test on staging only; release code behind OFF via validated main
PR; explicitly authorize a limited percentage; observe errors and learning
completion; expand to 100%. Internal tests use a controlled staging cohort, not
an assumed production admin bypass. Rollback disables the flag first, then rolls
back code through a reviewed PR if necessary. Flags do not undo data migrations.
No paid service, experimentation dashboard or new infrastructure is introduced.
