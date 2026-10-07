# API client contract

The HTTP client lives in `frontend/src/lib/api/client.ts`. Session storage and
epoch protection live in `session.ts`; shared envelopes and typed errors live in
`types.ts`. Feature endpoints belong to their feature, including account
class-code updates. The old `services/api.ts` compatibility export has been removed
after station endpoints migrated.

Ordinary HTTP/network failures retain the existing response-envelope contract.
`error.kind` distinguishes network, authentication, validation, server, HTTP and
protocol failures. Server 5xx bodies are never displayed. Aborted requests reject
with `AbortError`; callers must ignore cancellation and cancel obsolete effects.

Token rotation remains single-flight. Cancellation stops an individual consumer,
not the shared rotation. A delayed old-token 401 reuses a completed rotation.
The session epoch prevents a pending refresh from restoring cleared credentials.
Logout waits for rotation and revokes the latest token before clearing the local
session. Transient refresh failures retain the session; invalid credentials clear
it and emit the existing expiration event. Cookie mode still keeps JWTs in memory
and migrates old refresh credentials without persisting new ones.

Validation: existing React/Node tests plus cancellation, shared-refresh consumer
isolation, delayed 401 and typed error regressions; TypeScript/build and lint.
No backend contract or authentication transport change is required.
