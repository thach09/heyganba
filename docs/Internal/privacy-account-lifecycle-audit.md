# Privacy and account lifecycle audit

Verified against foundation code on 2026-10-07. This is a requirements/audit
document, **not a Privacy Policy or Terms of Service**. Founder/legal decisions
below remain unresolved; no retention promise or legal basis is invented.

| Capability | Actual state and evidence | Remaining dependency / launch constraint |
|---|---|---|
| Password change | Authenticated `/auth/password`, old-password check, BCrypt, token-version increment and session revocation. Cookie/security tests and desktop/mobile browser password change pass. | None for this existing flow. |
| Password recovery | No self-service recovery API or email channel. | Before broad public launch: select/approve an email provider, delivery/domain ownership and anti-enumeration, short-lived single-use recovery design. Do not treat changing a password while logged in as recovery. |
| Email verification | Registration does not verify mailbox ownership. | Email provider plus founder decision on access before verification. Do not describe accounts as verified or rely on an unverified mailbox for privileged recovery. |
| Account deletion | No learner/admin account-deletion UI/API. | Before broad public launch: authenticated confirmation/re-authentication, deletion scope, support route, audit treatment and backup expiry policy must be decided and implemented. No unsupported legal timelines. |
| Deactivation | Active checks reject login, issued access tokens and refresh. `SecurityHardeningTest` covers these paths. | Deactivation is not personal-data erasure. Any future delete flow must revoke/increment token version before deletion and test old access/refresh sessions. |
| Personal-data deletion | No complete erasure workflow. User-linked data includes profile/email/password hash, exams, SRS, activities, notebooks, preferences and new first-party facts. | Must include provider recovery copies, Sentry retention and any exports; no claim of immediate erasure from backups. |
| FK deletion behavior | V35/V36/V37 user FKs use CASCADE, tested on H2 and PostgreSQL. Existing user FKs cascade except `audit_logs`, which SET NULL. | Audit entries can still identify an actor/resource in text/metadata. Define justified security retention and anonymization before promising deletion. Review all FK/JSON fields, not only the profile row. |
| Notification consent | Own-account preferences; reminder opt-in defaults false, enabling requires HH:mm. Canonical Asia/Ho_Chi_Minh. | No delivery exists. Future channel consent, withdrawal UI, purpose/retention and provider are required; this boolean does not authorize marketing. |
| Analytics | Versioned login/practice starts and server-verified learning facts; no arbitrary metadata, raw answers, emails or tokens in new tables. Own-user identity comes from authentication. | Counts linked to learner IDs are pseudonymous personal data, not anonymous; retention/delete policy still needed. Historical gaps are documented, not fabricated. |
| Monitoring | Sentry redaction removes user context, body/header/cookie/query text, arbitrary extras and exception values; keeps diagnostic types/stack locations and request timing. Failure logs omit raw errors/upstream bodies. | Production frontend DSN absent at last provider check; Render API returned 401, so backend monitoring settings remain unverified. Configure authorized DSNs and verify one scrubbed staging error before release. |

## Founder/legal requirement draft — unresolved

Before a broad learner launch, decide controller/contact information, purpose and
necessary fields, lawful processing basis where applicable, service providers/
regions, account and security-log retention, recovery-copy expiry, user access/
correction/deletion procedure, incident communication, and age/consent rules if
relevant. Write and review legal documents using those decisions. Do not copy a
generic policy or claim compliance based only on security tests.

No new lifecycle API is added in this milestone: creating irreversible deletion
or recovery semantics before these decisions would invent product/policy scope.
These are explicit launch dependencies; they do not authorize enabling reminders
or the five future learner features.
