# Contributing to HeyGanba

Thanks for contributing to HeyGanba. This document defines how we write commits, branches and pull requests.

## Language policy

- **English is the default** for commit messages, code, code comments, and project docs.
- **Vietnamese is reserved for user-facing content** (UI copy, learning material shown to students), since the product serves Vietnamese learners.
- Existing Vietnamese code/docs are migrated **as files are touched** — do not mass-rewrite unrelated files.

## Commits — Conventional Commits

Write every commit message in **English**, following [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

- <what changed and why>
```

- **type**: `feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `test` · `chore` · `build` · `ci`
- **scope** (optional): affected area — `ui`, `api`, `agents`, `design`, `deploy`, `security`, …
- **description**: imperative mood, lowercase, no trailing period, ~72 chars max
- **body**: explain *what* and *why* — not *how* (the diff shows how); use bullets for multiple points
- **footer** (when needed): `BREAKING CHANGE: …`, `Refs: #12`

Examples:

```
feat(ui): multiple-choice flashcards instead of self-rating

- Pick Vietnamese meaning or kana reading (keys 1-4); distractors from the session deck
- Correct maps to SRS GOOD, wrong maps to FORGOT
```

```
fix(api): keep checkAnswer writable on PostgreSQL

@Transactional(readOnly = true) blocked INSERT into study_activities.
```

One commit = one logical change. Never mix a refactor with a feature in the same commit.

## Branches & pull requests

- Branch off `develop`, named `<type>/<short-description>` — e.g. `feat/kana-restyle`, `fix/mobile-sidebar`
- Never push directly to `main` — `main` is the production branch (Vercel/Render deploy from it)
- PR description says **what needs review** and **the risks**, not a changelog; link related issues; keep PRs small

## Before opening a PR

- `cd frontend && npm run lint && npm run build`
- `cd backend && mvn -B test`
- Never commit secrets (`.env`, `.local-secrets.env`, `.secrets/`)
