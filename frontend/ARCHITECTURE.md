# Frontend Architecture

Scope: the React app in `frontend/`. This file owns code structure, data flow and conventions.
Visual rules live in `DESIGN.md`; product truth in `PRODUCT.md`; working rules for agents in `../AGENTS.md`.

Paths are relative to `frontend/` unless noted. Status: living document — updated on 2026-10-07.
It describes what exists today; planned changes are tracked in GitHub issues (see §8).

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| UI | React 19.2 + TypeScript ~6.0 | Function components only |
| Build | Vite 8 | `npm run dev` / `build` / `preview` |
| Routing | react-router-dom 7 | Real URLs, one route per station |
| Styling | Tailwind v4 via `@tailwindcss/vite` | Tokens in `src/index.css` `@theme`; no other CSS |
| Monitoring | @sentry/react | Error tracking initialized conditionally via `VITE_SENTRY_DSN` |
| Icons | lucide-react | |
| Effects | canvas-confetti | Completion celebrations |
| Lint | oxlint | `npm run lint` |
| Tests | Vitest + React Testing Library + jsdom, Node + Puppeteer Core | Auth/API/component regressions, ink scoring, browser smoke |

No state-management or data-fetching library on purpose. The app is one user, ~25 network calls, no offline need. Revisit only when caching/optimistic/offline becomes real.

## 2. Runtime shape

- **SPA** rendered by `src/main.tsx` into `#root`, wrapped in `StrictMode` + `BrowserRouter`.
- **API base**: `VITE_API_BASE_URL` (build-time) or `/api/v1` fallback; dev proxy defaults to `http://localhost:8080`, overridable with `DEV_API_TARGET` for isolated testing.
- **Auth**: Cookie mode (`VITE_AUTH_COOKIE=true`) keeps access tokens in memory and refresh tokens in HttpOnly backend cookies. Legacy bearer mode persists tokens locally; saved profile excludes tokens. On 401 the client refreshes once and retries the original request.
- **Boot checks**: saved-user restore, backend health ping (`/health`) driving the offline banner, streak fetch for the sidebar.
- **Theme**: `src/index.css` defines `@theme` tokens (colour, font, animation). Legacy CSS has been removed; `index.css` is tokens + base only.
- **Deploy**: Vercel (root directory `frontend`), SPA rewrites in `vercel.json`, CSP `connect-src` whitelists the production API and staging API hosts. Adding a new external service means updating CSP.

### Routes

| Route | View | Notes |
|---|---|---|
| `/` | `DashboardView` | Tracker, EXP level, 30-day charts |
| `/kana` | `KanaStationView` | Tabs: table / typing drill / handwriting |
| `/vocabulary` | `FlashcardView` | Multiple-choice SRS session |
| `/dictionary` | `DictionaryNotebookView` | Course + JMdict search, personal notebooks, server-graded practice (#11) |
| `/kanji` | `KanjiStationView` | Tabs: browse / write |
| `/grammar` | `GrammarView` | Tabs: browse / practice |
| `/grammar/:ruleId` | `GrammarRulePage` | Reading page + related rules |
| `/exam` | `ExamView` | Config, runner, result, history, leaderboard |
| `/admin` | `AdminView` | `ROLE_ADMIN` only; inline 403 otherwise |
| `*` | redirect to `/` | |

## 3. Current layout

```
src/
  App.tsx                  # provider/boundary composition
  app/                     # AuthProvider/useAuth, AppShell, lazy routes, ErrorBoundary
  lib/api/                 # typed client, session storage, shared DTOs
  main.tsx
  index.css                # @theme tokens + base (64 lines)
  components/              # Sidebar, SubmitButton, FeedbackAlert, MascotBadge
  features/
    admin/ auth/ dashboard/ dictionary/ exam/ flashcard/
    kana/   # + kanaData.ts, kanaAudio.ts, KanaCanvas
    kanji/ grammar/
  services/
    api.ts                 # temporary compatibility exports while feature APIs migrate
    japaneseSpeech.ts      # TTS via Web Speech API
  assets/
```

Notes for anyone touching this code:

- JSON requests go through `services/api.ts`; audio blobs use `services/ttsAudio.ts` with the same API base and token. Refresh requests are shared across simultaneous 401 responses, and a pending refresh cannot restore a logged-out session.
- `lib/api` owns HTTP and session concerns; `features/account/api.ts` owns class-code updates. Other station endpoint extraction is in progress.
- Views declare their DTO interfaces inline.
- Auth state lives in `app/AuthProvider.tsx`; station components consume `app/useAuth.ts`.
- Data fetching runs in `useEffect` through `apiRequest`.

## 4. Data layer

`apiRequest<T>(endpoint, options)` returns `ApiResponse<T>`; on 401 it refreshes once through `/auth/refresh` and retries the original request. Station endpoint extraction is in progress; the client supports typed failures and silent AbortError cancellation.

- Session storage lives in `lib/api/session.ts`: `localStorage` keys `heyganba_access_token`, `heyganba_refresh_token`, `heyganba_user`.
- Kana typing progress persists under its own key (`heyganba_kana_typing`) from `KanaQuiz`.
- `services/japaneseSpeech.ts` uses cached server TTS with Web Speech as fallback. Playback sequencing prevents stale responses playing over a newer request; completed blob URLs are released.
- `components/Modal.tsx` uses a native dialog for focus trapping, inert background and Escape. Password changes clear the local session after the server invalidates all old tokens.
- `features/kana/handwritingScore.ts` compares normalized ink against skeletonized Noto Serif JP glyphs. Both coverage and precision must reach 80%; it does not grade stroke direction/order.

## 5. Auth and routing

`AuthProvider` restores the token-free saved profile, owns login/logout/password dialogs and session-expiration handling. Stations consume `useAuth()` directly; profile updates propagate to the shell. `app/routes.tsx` lazy-loads major views with a design-token loading state. The top-level boundary reports exceptions to Sentry and shows safe recovery actions; a route boundary resets on pathname changes. Admin UI gating supplements backend RBAC and never authorizes an API operation.

Kana script selection lives in `?script=hiragana|katakana`, survives refresh and browser history, and retains the existing sidebar flyout.

## 6. Testing

CI runs `npm run lint`, `npm run build` and `npm test` on Node 24. The unit suite checks ink coverage, precision, tolerance, missing strokes and scribbles. `node tests/browser-smoke.mjs` runs against an isolated backend (default 8081) and Vite (5174), creating a local test account and desktop/mobile screenshots. `node tests/glyph-browser.mjs` checks complete/incomplete ink using real Japanese glyphs in Chrome. `node tests/handwriting-ui.mjs` traces a real glyph through pointer events and verifies congratulations are cleared when ink changes at both viewport widths. Set `CHROME_PATH` on other platforms. Backend H2 and PostgreSQL/Flyway suites cover permissions and data integrity separately.

## 7. Conventions

- **UI copy is Vietnamese; code, comments, commits and docs are English** (`../CONTRIBUTING.md`).
- New UI follows `DESIGN.md`; colours/fonts/radii come from `@theme` tokens only. No raw hex, no default Tailwind palette (it is wiped).
- Interactions must match existing stations: keyboard shortcuts (1–4, Enter, Space), submit behaviour, correct/wrong presentation. No per-station UX dialects.
- `index.css` stays tokens + base; component styling uses utilities.
- Behaviour changes require an approved feature doc in `../docs/features/` first (`../AGENTS.md`).
- New dependency requires a reason stated in the PR. Default answer is no.
- Before reporting done: `npm run lint` + `npm run build` + existing tests, and desktop 1440 + mobile 390 screenshots reviewed by hand.

## 8. Tracking

- Work items live in GitHub issues; PRs link the issue they close.
- Current frontend refactor: #13 — test harness, API layer, app shell, component splits.
- Next feature: #11 — Dictionary + Study Vault (Hoàn thành 02/10/2026).
- This file is updated when the structure changes; it does not carry a backlog.

## 9. Verification commands

```
npm run dev       # Vite dev server + proxy to localhost:8080
npm run lint      # oxlint
npm run build     # tsc -b && vite build
```

Per `../AGENTS.md`: after UI changes, verify with desktop 1440 and mobile 390 screenshots before reporting done.
