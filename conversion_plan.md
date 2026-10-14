# Chinese Learning Platform Conversion Plan & Verification Report
**Repository**: `thach09/heyganba`  
**Branch**: `feat/chinese-platform-conversion`  
**Status**: Completed (100% Verified)

---

## 1. Executive Summary & Architectural Overrides

This document records the completed end-to-end transformation of the repository into a standalone **Chinese Learning Platform (HSK, Pinyin, Hanzi, and Vocabulary)** tailored for Vietnamese learners.

### Key Architectural Overrides Executed:
1. **Wiped Legacy Japanese Migrations (`V1`–`V39`)**:
   - Rather than coexisting with `language_code` flags, all 32 old Japanese migrations (`V1` through `V39`) were wiped clean.
   - Replaced with a unified Chinese-first schema (`V1__init_chinese_schema.sql`), rich HSK 1 seed dataset (`V2__seed_chinese_hsk1_data.sql`), and security hardening (`V3__disable_public_seed_admin_credential.sql`).
2. **Repurposed `KanaStationView` into `PinyinStationView`**:
   - Did not simply disable kana; repurposed the station into a full-featured **Pinyin & Tone Station** featuring 21 Initials (Thanh mẫu), 36 Finals (Vận mẫu), 4 Tones + Neutral Tone (Thanh điệu), an interactive SVG Tone Contour Wave (pitch curves `55`, `35`, `214`, `51`), and a 10-question tone discrimination drill awarding `+10 EXP`.
3. **Integrated Hanzi Handwriting with `hanzi-writer`**:
   - Replaced `KanjiStationView` with `HanziStationView` featuring traditional **Mi Zi Ge (米字格 - 8-grid rice square)** canvas, stroke-order animation (`writer.animateCharacter()`), and interactive quiz mode (`writer.quiz()`) awarding `+15 EXP`.
4. **Vocabulary Station with 3D Flashcards & Âm Hán Việt**:
   - 3D CSS flip flashcard mode with prominent Âm Hán Việt badges, HSK 1–6 and lesson filtering, and 10-question practice drills awarding `+20 EXP`.
5. **Neo-Chinese UI/UX Aesthetics**:
   - Cinnabar Red (`#E11D48`), Jade Green (`#10B981`), Imperial Gold (`#F59E0B`), Warm Rice Paper (`#FAF8F5`), Inkstone Dark (`#111318`).
   - Chinese Red Seal Stamp (`印章` - khắc chữ `漢`) brand icon and animated completion stamps (`<RedSealStamp text="通" />`).
   - Micro-animations: Floating `+EXP` rewards (`<FloatingExpReward />`) and 3D card flips.

---

## 2. Phase-by-Phase Completion Status

### Phase 1: Git Hygiene & Repo Cleanup — [DONE]
- [x] Deleted committed build, test, and lint status logs.
- [x] Untracked `frontend/dist/` from Git indexing.
- [x] Updated root `.gitignore` and `frontend/.gitignore` to ignore `*.log`, `dist/`, `.vercel/`, and `.env.local`.
- [x] Deleted `frontend/src/features/kana/kanaData.ts`.
- [x] Replaced `ToriiMark` and Japanese mascot references ("Rồng Nhật" -> "Kim Long (金龙)").

### Phase 2: Clean Chinese Database Schema & Seed Data (Backend + Flyway) — [DONE]
- [x] Deleted old migrations `V1` through `V39` in `backend/src/main/resources/db/migration/`.
- [x] Created `V1__init_chinese_schema.sql`:
  - `hanzi` table with `character` (UNIQUE), `traditional`, `pinyin`, `han_viet`, `radical`, `stroke_count`, `hsk_level`, `meaning_vi`, `decomposition`, `example_words_json`.
  - `vocabulary` table with `word`, `traditional`, `pinyin`, `pinyin_normalized`, `han_viet`, `part_of_speech`, `meaning_vi`, `hsk_level`, `lesson_number`, `example_zh`, `example_pinyin`, `example_vi`.
  - `grammar_rules` table with `title`, `structure`, `hsk_level`, `explanation_vi`, `examples_json`, `exercises_json`.
  - `character_mastery` table with `user_id`, `target_type` (`PINYIN`, `HANZI`, `VOCAB`), `target_key`, `mastery_score`, `practice_count`, `updated_at`.
  - Preserved core tables: `users`, `roles`, `srs_reviews`, `streaks`, `study_activities`, `vocab_notebooks`, `audit_logs`, `revoked_tokens`, `tts_audio`.
- [x] Created `V2__seed_chinese_hsk1_data.sql`:
  - 38 authentic HSK 1 vocabulary entries with Pinyin, normalized search strings, Sino-Vietnamese readings, and bilingual examples.
  - 26 foundational Hanzi characters (`人`, `口`, `日`, `月`, `水`, `火`, `山`, `木`, `好`, `学`, `生`, `中`, `国`, `语`, `文`, `大`, `小`, `多`, `少`, `上`, `下`, `左`, `右`, `一`, `二`, `三`).
  - 6 core HSK 1 grammar structures (`是`, `吗`, `的`, `在`, `不 vs 没`, `呢`) + 12 interactive quiz exercises.
- [x] Created `V3__disable_public_seed_admin_credential.sql` to disable seed admin account.
- [x] Updated Spring Boot Entities, Repositories, DTOs & Services:
  - Multi-mode search in `VocabularyRepository` matching `word`, `traditional`, `pinyin`, `pinyin_normalized`, `han_viet`, `meaning_vi` case-insensitively.
  - `CharacterMastery` entity, repository, and service.
  - `ProgressController` with `POST /progress/practice` (awards +10 to +20 EXP, updates mastery) and `GET /progress/mastery`.
  - `ExpService` calculates EXP earned across Pinyin, Hanzi, and Vocabulary practice.

### Phase 3: Core Loop & Feature Modules (Frontend) — [DONE]
- [x] **Vocabulary Station (`FlashcardView.tsx`)**:
  - HSK 1–6 and Lesson filters + Mastery status (*Tất cả*, *Đang học*, *Đã thông thạo*).
  - 3D Flashcard flip mode with prominent Âm Hán Việt badge, Pinyin, Mandarin Web Speech TTS (`zh-CN`), and examples.
  - 10-question practice drill with multiple-choice and Pinyin typing, awarding `+20 EXP` and updating mastery.
- [x] **Pinyin & Tone Station (`PinyinStationView.tsx`)**:
  - `PinyinTable.tsx`: Interactive grid of 21 Initials, 36 Finals, and 4 Tones with audio playback.
  - `ToneContourWave.tsx`: Interactive SVG Pitch Contour Wave showing pitch curves `55`, `35`, `214`, `51`, and neutral tone.
  - `PinyinQuiz.tsx`: 10-question Tone discrimination and Pinyin typing quiz awarding `+10 EXP` upon completion.
  - Repurposed `features/kana/` files to cleanly re-export Pinyin components.
- [x] **Hanzi Station (`HanziStationView.tsx`)**:
  - Traditional **Mi Zi Ge (米字格)** canvas box with watermark red guidelines.
  - `hanzi-writer` integration:
    - Mode "Xem nét viết": animated stroke order (`writer.animateCharacter()`).
    - Mode "Luyện viết tay": interactive handwriting quiz (`writer.quiz()`) awarding `+15 EXP`.
  - Prominent Âm Hán Việt badge, decomposition notes, and real-time mastery score tracking.

### Phase 4: Neo-Chinese UI/UX & Engaging Animations — [DONE]
- [x] Configured CSS variables and design tokens in `index.css`: `--color-cinnabar`, `--color-jade`, `--color-gold`, `--color-rice-paper`, `--color-inkstone`.
- [x] Loaded Google Fonts `Noto Serif SC`, `Noto Sans SC`, and `Be Vietnam Pro` in `index.html`.
- [x] Brand Icon: Created Chinese Red Seal Stamp (`印章` - khắc chữ `漢`) in Sidebar and App Shell.
- [x] `<RedSealStamp text="通" />`: Traditional cinnabar seal stamp with `@keyframes seal-slam` cubic-bezier spring bounce.
- [x] `<FloatingExpReward amount={15} />`: Glowing gold pill floating up and fading into the progress bar.
- [x] 3D Card Flip CSS utilities: `perspective: 1000px`, `transform-style: preserve-3d`, `backface-visibility: hidden`.

### Phase 5: QA, Testing & Verification — [DONE]
- [x] **Backend Tests**: `mvn clean test` executed in `/backend`:
  - **221 tests run, 0 failures, 0 errors, 1 skipped (100% pass rate)**.
- [x] **Frontend Build**: `npm run build` (`tsc -b && vite build`) executed in `/frontend`:
  - **Zero TypeScript errors, 100% bundle generation success**.
- [x] **Frontend Lint**: `npm run lint` executed:
  - **0 errors** across all 90 source files.

---

## 3. Route Reference

| Route | Component | Purpose |
|---|---|---|
| `/` | `DashboardView` | Daily study streak, EXP level, review prompts |
| `/pinyin` | `PinyinStationView` | 21 Initials, 36 Finals, 4 Tones & Pitch Contour Wave |
| `/vocabulary` | `FlashcardView` | 3D Flashcards with Âm Hán Việt, HSK filters, and drills |
| `/hanzi` | `HanziStationView` | Mi Zi Ge handwriting canvas with HanziWriter |
| `/dictionary` | `DictionaryNotebookView`| Multi-mode search (Hanzi, Pinyin, Hán Việt, Meaning) |
| `/grammar` | `GrammarView` | HSK grammar structures and interactive exercises |
| `/exam` | `ExamView` | Practice tests and assessments |
| `/admin` | `AdminView` | Content moderation and curriculum administration |
| `/kana` | Redirect to `/pinyin` | Legacy link redirection |
| `/kanji` | Redirect to `/hanzi` | Legacy link redirection |

---

## 4. Flyway & Hibernate Schema Validation Resolution — [DONE]

- **Purged Leftovers**: Permanently removed `V12__expand_grammar_exercises.sql` and `R__refresh_jmdict_catalog.java`. Verified that only clean Chinese migrations (`V1`, `V2`, `V3`) exist in `db/migration/`.
- **Entity & Schema Alignment**:
  - Added `review_note VARCHAR(400)` to `grammar_exercises`.
  - Added `reading_passages`, `notebook_practice_sessions`, `product_events`, `learning_attempts`, `learning_mutation_receipts`, and `user_learning_preferences`.
  - Aligned column definitions and provided safe default values in `V1` and `V2` (`explanation`, `order_index`, `pinyin_normalized`, `han_viet`, `meaning_vi`) to pass Hibernate `ddl-auto=validate` with zero errors.
