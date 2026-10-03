# Frontend Architecture

Scope: the React app in `frontend/`. This file owns code structure, data flow and conventions.
Visual rules live in `DESIGN.md`; product truth in `PRODUCT.md`; working rules for agents in `../AGENTS.md`.

Paths are relative to `frontend/` unless noted. Status: living document — verified against code on 2026-10-02.
It describes what exists today; planned changes are tracked in GitHub issues (see §8).

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| UI | React 19.2 + TypeScript ~6.0 | Function components only |
| Build | Vite 8 | `npm run dev` / `build` / `preview` |
| Routing | react-router-dom 7 | Real URLs, one route per station |
| Styling | Tailwind v4 via `@tailwindcss/vite` | Tokens in `src/index.css` `@theme`; no other CSS |
| Icons | lucide-react | |
| Effects | canvas-confetti | Completion celebrations |
| Lint | oxlint | `npm run lint` |
| Tests | none yet | Test plan tracked in #13 |

No state-management or data-fetching library on purpose. The app is one user, ~25 network calls, no offline need. Revisit only when caching/optimistic/offline becomes real.

## 2. Runtime shape

- **SPA** rendered by `src/main.tsx` into `#root`, wrapped in `StrictMode` + `BrowserRouter`.
- **API base**: `VITE_API_BASE_URL` (build-time) or `/api/v1` fallback; dev uses the Vite proxy to `http://localhost:8080`.
- **Auth**: JWT access + refresh persisted in `localStorage` (`heyganba_access_token`, `heyganba_refresh_token`, `heyganba_user`). On 401 the client refreshes once and retries the original request.
- **Boot checks**: saved-user restore, backend health ping (`/health`) driving the offline banner, streak fetch for the sidebar.
- **Theme**: `src/index.css` defines `@theme` tokens (colour, font, animation). Legacy CSS has been removed; `index.css` is tokens + base only.
- **Deploy**: Vercel (root directory `frontend`), SPA rewrites in `vercel.json`, CSP `connect-src` whitelists the production API and staging API hosts. Adding a new external service means updating CSP.

### Routes

| Route | View | Notes |
|---|---|---|
| `/` | `DashboardView` | Tracker, EXP level, 30-day charts |
| `/kana` | `KanaStationView` | Tabs: table / typing drill / handwriting |
| `/vocabulary` | `FlashcardView` | Multiple-choice SRS session |
| `/kanji` | `KanjiStationView` | Tabs: browse / write |
| `/grammar` | `GrammarView` | Tabs: browse / practice |
| `/grammar/:ruleId` | `GrammarRulePage` | Reading page + related rules |
| `/exam` | `ExamView` | Config, runner, result, history, leaderboard |
| `/admin` | `AdminView` | `ROLE_ADMIN` only; inline 403 otherwise |
| `*` | redirect to `/` | |

## 3. Current layout

```
src/
  App.tsx                  # router + auth state + layout + health + streak + sidebar state
  main.tsx
  index.css                # @theme tokens + base (64 lines)
  components/              # Sidebar, SubmitButton, FeedbackAlert, MascotBadge
  features/
    admin/ auth/ dashboard/ exam/ flashcard/
    kana/   # + kanaData.ts, kanaAudio.ts, KanaCanvas
    kanji/ grammar/
  services/
    api.ts                 # fetch wrapper + token storage + refresh + updateClassCode
    japaneseSpeech.ts      # TTS via Web Speech API
  assets/
```

Notes for anyone touching this code:

- **All network calls go through `services/api.ts`** (verified: no other `fetch` in `src/`).
- `services/api.ts` holds the fetch wrapper, token persistence, and one domain call (`updateClassCode`).
- Views declare their DTO interfaces inline.
- Auth state lives in `App.tsx` and is prop-drilled to every route (`user`, `onRequireLogin`).
- Data fetching runs in `useEffect` through `apiRequest`.

## 4. Data layer

`apiRequest<T>(endpoint, options)` returns `ApiResponse<T>`; on 401 it refreshes once through `/auth/refresh` and retries the original request. Call sites pass string endpoints directly from views.

- Session storage lives in the same module: `localStorage` keys `heyganba_access_token`, `heyganba_refresh_token`, `heyganba_user`.
- Kana typing progress persists under its own key (`heyganba_kana_typing`) from `KanaQuiz`.
- `services/japaneseSpeech.ts` owns text-to-speech via the Web Speech API.

## 5. Auth and routing

`App.tsx` restores the saved user, opens `AuthModal` for login/register, gates `/admin` on `role === 'ROLE_ADMIN'` (inline 403 otherwise), and passes `user` + `onRequireLogin` to every route. The sidebar navigates with `NavLink`; `kanaScript` is held in `App.tsx` state so the nav flyout can switch Hiragana/Katakana.

## 6. Testing

No tests today. CI job `frontend-test` runs `npm run lint` + `npm run build`; the backend is covered separately by `backend-test` and `backend-migration-check`. Test stack and the first cases to cover are tracked in #13.

## 7. Conventions

- **UI copy is Vietnamese; code, comments, commits and docs are English** (`../CONTRIBUTING.md`).
- New UI follows `DESIGN.md`; colours/fonts/radii come from `@theme` tokens only. No raw hex, no default Tailwind palette (it is wiped).
- Interactions must match existing stations: keyboard shortcuts (1–4, Enter, Space), submit behaviour, correct/wrong presentation. No per-station UX dialects.
- `index.css` stays tokens + base; component styling uses utilities.
- Behaviour changes require an approved feature doc in `../docs/features/` first (`../AGENTS.md`).
- New dependency requires a reason stated in the PR. Default answer is no.
- Before reporting done: `npm run lint` + `npm run build` (plus tests once they exist), and desktop 1440 + mobile 390 screenshots reviewed by hand.

## 8. Tracking

- Work items live in GitHub issues; PRs link the issue they close.
- Current frontend refactor: #13 — test harness, API layer, app shell, component splits.
- Next feature: #11 — Dictionary + Study Vault.
- This file is updated when the structure changes; it does not carry a backlog.

## 9. Verification commands

```
npm run dev       # Vite dev server + proxy to localhost:8080
npm run lint      # oxlint
npm run build     # tsc -b && vite build
```

Per `../AGENTS.md`: after UI changes, verify with desktop 1440 and mobile 390 screenshots before reporting done.
