# HeyGanba product source of truth

This document records approved behavior and scope. UI rules live in
`frontend/DESIGN.md`; the frontend-specific briefing is `frontend/PRODUCT.md`.
Framework versions and passing test results are owned by build files and CI.

## Existing product

HeyGanba is a Vietnamese-language Japanese learning web application used on
both laptop and phone. The initial curriculum follows the existing Dekiru
Nihongo course structure. Existing stations support Kana reference, typing and
handwriting, vocabulary quizzes and SM-2 SRS, dictionary lookup and personal
vocabulary notebooks, Kanji reference/practice, grammar reference/practice and
server-graded mock exams. The dashboard shows activity, EXP and streaks.

Content must be reviewed before publication. New academic content remains
`PENDING_REVIEW` in staging migrations until approved. This milestone adds no
Japanese curriculum content. Admin write operations remain limited to 30 per
minute per admin; bulk content enters through Flyway.

The canonical study-day timezone is `Asia/Ho_Chi_Minh`. Streak qualification is
a separate engagement rule, not a definition of product retention. Production
runs on `main` (Vercel frontend, Render backend, Neon PostgreSQL); `develop` is
integration/staging. Redis is optional, with memory SRS caching as the default.

Preserve the HeyGanba name, Torii brand, current ink/paper UI and established
keyboard/mobile interactions. Product decisions about pricing, broad curriculum
expansion and a notification provider are not settled here.

## Approved roadmap — NOT IMPLEMENTED

The following updates are approved for future work, after foundation readiness
and founder approval of Product Update #1. They are not existing capabilities:

1. Daily Learning Plan.
2. Mistake Notebook / Smart Review (distinct from existing vocabulary notebooks).
3. Streak Freeze + Reminder.
4. Smart Onboarding + Placement Test.
5. Better Learning Feedback.

Foundation work may add tested, internal extension points, minimal preference
storage and server-owned rollout controls. It must not expose incomplete future
behavior. Reminder consent defaults off; per-user timezones and notification
delivery are outside this milestone. No AI mastery algorithm or unvalidated
skill taxonomy is approved.

## Evidence and limits

Existing behavior is supported by code and regression tests, not by claimed
retention improvements or testimonials. No product usage numbers or academic
effectiveness measurements have been established. Privacy policy, recovery
email provider and legal commitments require separate founder decisions.
