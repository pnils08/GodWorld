---
title: Lore Canon-Ingest Pipeline Plan
created: 2026-08-17
updated: 2026-08-17
type: plan
tags: [architecture, antigravity, notebooklm, draft]
sources:
  - docs/plans/2026-08-15-lore-writer.md — pipeline.56, the generation half this plan extends
  - project_canon-authority-model (memory) — NotebookLM = only source for canon; Supermemory = downstream cards, ~30% of NotebookLM's corpus; ingestion is scripted with NO hand-review gate as of 2026-08-12
  - docs/MODEL_HIERARCHY.md §4 antigravity entry — goal-substitution risk (2026-08-17), demonstrated ability, model routing
  - scripts/notebooklmPush.js (research.23) — existing general-purpose NotebookLM source-push bridge
  - scripts/notebooklmCanonSourcesValidate.js + scripts/notebooklmCanonSources.json — existing source-inventory policy validator
  - Mike-direct, 2026-08-17 (S377) — pipeline description in session transcript
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.59 row"
  - "[[2026-08-15-lore-writer]] — parent spec, generation stage"
  - "[[../index]] — add entry same commit"
---

# Lore Canon-Ingest Pipeline Plan

**Goal:** After a lore-writer piece is generated and graded pass/fail, ingest it (and its grounding source article) into the correct store with clean naming, tagging, and no duplicates — pass results become canon in NotebookLM, fail results stay in an audit trail and never touch canon.

**Architecture:** Extends pipeline.56 (`docs/plans/2026-08-15-lore-writer.md`) past generation into verification and ingest. Reuses two pieces of existing infrastructure instead of building new ones: `scripts/notebooklmPush.js` (already a general-purpose "push a file into the GodWorld NotebookLM notebook" bridge, used today for editions) becomes the ingest mechanism for passed lore; `scripts/notebooklmCanonSourcesValidate.js` + `scripts/notebooklmCanonSources.json` (already an allowlist-based source-inventory validator) gets a new bucket for lore sources so dedup/format hygiene is enforced the same way it already is for published editions. The pass/fail judgment itself stays on the Claude/Rhea side per the existing lore-writer spec ("Nothing moves out of quarantine without Rhea passing and me reading it") — never handed to agy, per the goal-substitution finding in `MODEL_HIERARCHY.md`.

**Terminal:** research-build (design + wiring) / engine-sheet (if any schema/cron change is needed)

**Pointers:**
- Prior work: `scripts/loreWriter.js` (pipeline.56, landed `8c1b4107`, env/model-fixed `71b7cdd6`)
- Related plan: `[[2026-08-15-lore-writer]]`
- Research basis: session transcript S377 (Mike-direct pipeline description + Q&A on RAG target)

**Acceptance criteria:**
1. A passed lore piece lands as a NotebookLM source in the GodWorld notebook (`config/notebooklm.json` → `notebookId`), titled and tagged so it's identifiable as lore, not an edition.
2. A failed lore piece never reaches NotebookLM — it's recorded in a local rejection log instead, with the reason it failed.
3. `notebooklmCanonSourcesValidate.js` recognizes lore-sourced entries as their own bucket and can report duplicates or policy violations among them, same as it already does for published sources.
4. The pass/fail judgment call is never delegated to agy at any point in the pipeline — verified by reading the actual wiring, not assumed.

---

## Tasks

### Task 1: Add a lore-source bucket to the canon-sources policy

- **Files:**
  - `scripts/notebooklmCanonSources.json` — modify (add `"allowedLoreSourceIds": []` empty array alongside the existing buckets)
  - `scripts/notebooklmCanonSourcesValidate.js` — modify (add `allowedLoreSourceIds: 'lore'` to the `BUCKETS` map, ~line 11)
- **Steps:**
  1. Add the new key to the JSON policy file, empty array (nothing ingested yet).
  2. Add the matching entry to `BUCKETS` in the validator so it classifies and reports on that bucket the same way it does `published`/`canon-reference`/`excluded`.
- **Verify:** `node scripts/notebooklmCanonSourcesValidate.js` → runs clean, new bucket shows 0 entries, no errors.
- **Status:** [ ] not started

### Task 2: Make `notebooklmPush.js` usable for a non-edition source

- **Files:**
  - `scripts/notebooklmPush.js` — modify
- **Steps:**
  1. Confirm `--cycle <N>` is actually required for a non-audio push (read the `degrade()` calls and `parseArgs` around line 43-52) — if it's only used for audio-overview + Drive-dest naming, add a `--kind lore` flag that skips the cycle requirement and titles the source `Lore: <slug> (Y<n>C<m>)` instead of the edition title format.
  2. Confirm `--no-audio` (or equivalent) suppresses the audio-overview branch entirely for lore pushes — lore pieces don't need an audio deep-dive by default.
- **Verify:** `node scripts/notebooklmPush.js --file output/lore-quarantine/POP-00131-lorenzo-jordan.md --kind lore --no-audio` (dry-run flag if the script supports one, otherwise confirm against a disposable test notebook first — do NOT test against the live GodWorld notebook without a dry-run path) → source added, no audio job kicked off.
- **Status:** [ ] not started

### Task 3: Wire the pass/fail branch

- **Files:**
  - New: a thin orchestration script or a `/lore-ingest` skill step (name TBD at implementation time) that: reads a quarantine file, runs it through the existing Rhea review pattern, and branches.
- **Steps:**
  1. On PASS: call `notebooklmPush.js --file <path> --kind lore --no-audio`; record the resulting source id back into `notebooklmCanonSources.json`'s new `allowedLoreSourceIds` bucket (Task 1).
  2. On FAIL: append to `output/lore-quarantine/_rejected.log` (new file, plain text or JSON lines) with the file path, timestamp, and the specific failure reason from Rhea — never call the NotebookLM push path.
- **Verify:** run once against `output/lore-quarantine/vinnie_keane_farewell_long.md` (already passed the Vinnie test manually) and confirm the PASS branch fires; run once against a deliberately broken fixture (invented spouse) and confirm it lands in `_rejected.log`, not NotebookLM.
- **Status:** [ ] not started

### Task 4: Enforce the model-tiering rule at the dispatch level

- **Files:**
  - `docs/MODEL_HIERARCHY.md` §4 antigravity entry — already updated this session with the routing + goal-substitution notes; confirm this plan's Task 3 orchestration never routes the PASS/FAIL call itself to agy.
- **Steps:**
  1. Document in the Task 3 script/skill header, explicitly: "grading is never delegated to agy — Rhea/Claude only." One-line comment, not a new doc.
- **Verify:** grep the Task 3 implementation for any agy/tmux dispatch inside the grading branch — should return nothing.
- **Status:** [ ] not started

---

## Open questions

- [ ] **Cadence** — Mike described "run the tests again now and then," which is deliberately not a fixed schedule. Blocks: whether Task 3's orchestration is cron-fired or stays a manual/dispatched trigger. Recommend starting manual (dispatched by research-build when there's something worth testing) and only cron it later if the manual cadence proves too infrequent — matches the "don't build ahead of demonstrated need" default.
- [ ] **Failed-lore retention** — this plan defaults fail results to a local log file, never NotebookLM, because ingestion has no hand-review gate and a failed piece by definition contains an error the canon store can't afford. Confirm this default before Task 3 ships — if Mike wants failed lore visible somewhere richer than a log (a review queue, a Drive folder), that changes Task 3's shape.
- [ ] **`--kind lore` vs. a genuinely separate script** — Task 2 assumes extending `notebooklmPush.js` is cleaner than forking a parallel script. If the `--cycle`-required logic turns out to be load-bearing in more places than expected (Task 2 step 1's read), a small dedicated `pushLoreToNotebook.js` wrapping the same `nlm` calls might be safer than branching the edition-critical path. Decide after Task 2's read, not before.

---

## Changelog

- 2026-08-17 — Initial draft (S377, research-build). Not yet executed — plan only, pending Mike's confirmation on the two open questions above.
