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

**Goal:** After a lore-writer piece is generated and graded pass/fail, ingest it into both canon stores with clean naming, tagging, and no duplicates, mirroring exactly how a published edition already gets ingested — pass results become canon in NotebookLM AND searchable in bay-tribune; fail results stay in a local audit trail and never touch either store.

**Architecture:** Extends pipeline.56 (`docs/plans/2026-08-15-lore-writer.md`) past generation into verification and ingest. Reuses infrastructure that already does this for editions instead of building new pipes: `/post-publish` already runs `ingestEdition.js` (→ bay-tribune, Step 1b) and `notebooklmPush.js` (→ NotebookLM, Step 1c) in parallel for every published edition (`.claude/skills/post-publish/SKILL.md`) — a passed lore piece gets the same dual treatment, just triggered from the lore gate instead of the edition cycle. `scripts/notebooklmCanonSourcesValidate.js` + `scripts/notebooklmCanonSources.json` (already an allowlist-based source-inventory validator) gets a new bucket for lore sources so dedup/format hygiene is enforced the same way it already is for published editions. The pass/fail judgment itself stays on the Claude/Rhea side per the existing lore-writer spec ("Nothing moves out of quarantine without Rhea passing and me reading it") — never handed to agy, per the goal-substitution finding in `MODEL_HIERARCHY.md`.

**Terminal:** research-build (design + wiring) / engine-sheet (if any schema/cron change is needed)

**Pointers:**
- Prior work: `scripts/loreWriter.js` (pipeline.56, landed `8c1b4107`, env/model-fixed `71b7cdd6`)
- Related plan: `[[2026-08-15-lore-writer]]`
- Research basis: session transcript S377 (Mike-direct pipeline description + Q&A on RAG target)

**Acceptance criteria:**
1. A passed lore piece lands as a NotebookLM source in the GodWorld notebook (`config/notebooklm.json` → `notebookId`) AND as a bay-tribune Supermemory record, both titled/tagged so they're identifiable as lore, not an edition — matching the dual-ingest editions already get.
2. A failed lore piece never reaches NotebookLM or bay-tribune — it's recorded in a local rejection log instead, with the reason it failed.
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

### Task 2: Make the push/ingest scripts usable for a non-edition (lore) source

Editions already go to BOTH stores in parallel today (`/post-publish` Step 1b `ingestEdition.js` → bay-tribune, Step 1c `notebooklmPush.js` → NotebookLM — confirmed in `.claude/skills/post-publish/SKILL.md`). A passed lore piece should mirror that same dual-ingest, not just the NotebookLM half — otherwise lore is invisible to bay-tribune search (sift, future desk lookups) even though it's real canon.

- **Files:**
  - `scripts/notebooklmPush.js` — modify
  - `scripts/ingestEdition.js` — modify
- **Steps:**
  1. `notebooklmPush.js`: confirm `--cycle <N>` is actually required for a non-audio push (read the `degrade()` calls and `parseArgs` around line 43-52) — if it's only used for audio-overview + Drive-dest naming, add a `--kind lore` flag that skips the cycle requirement and titles the source `Lore: <slug> (Y<n>C<m>)` instead of the edition title format.
  2. `notebooklmPush.js`: confirm `--no-audio` (or equivalent) suppresses the audio-overview branch entirely — lore pieces don't need an audio deep-dive by default.
  3. `ingestEdition.js`: add `lore` to `ALLOWED_TYPES` (currently `edition|interview|supplemental|dispatch|interview-transcript`, line ~17) so a lore file can be ingested into bay-tribune the same way non-edition types already are, `--cycle` supplied from the piece's own `Y<n>C<m>` tag.
- **Verify:** `node scripts/notebooklmPush.js --file output/lore-quarantine/POP-00131-lorenzo-jordan.md --kind lore --no-audio` and `node scripts/ingestEdition.js output/lore-quarantine/POP-00131-lorenzo-jordan.md --type lore --cycle 103 --dry-run` → both accept the file without erroring on type/flag validation. Confirm against a disposable test notebook/container first, not the live GodWorld notebook or live bay-tribune container, until the dry-run path is proven.
- **Status:** [ ] not started

### Task 3: Wire the pass/fail branch

- **Files:**
  - New: a thin orchestration script or a `/lore-ingest` skill step (name TBD at implementation time) that: reads a quarantine file, runs it through the existing Rhea review pattern, and branches.
- **Steps:**
  1. On PASS: call `notebooklmPush.js --file <path> --kind lore --no-audio` AND `ingestEdition.js <path> --type lore --cycle <N>` — both stores, matching the edition pattern exactly. Record the resulting source id back into `notebooklmCanonSources.json`'s new `allowedLoreSourceIds` bucket (Task 1).
  2. On FAIL: append to `output/lore-quarantine/_rejected.log` (new file, plain text or JSON lines) with the file path, timestamp, and the specific failure reason from Rhea — never call either ingest path.
- **Verify:** run once against `output/lore-quarantine/vinnie_keane_farewell_long.md` (already passed the Vinnie test manually) and confirm BOTH the NotebookLM and bay-tribune branches fire; run once against a deliberately broken fixture (invented spouse) and confirm it lands only in `_rejected.log`, never in either store.
- **Status:** [ ] not started

### Task 4: Enforce the model-tiering rule at the dispatch level

- **Files:**
  - `docs/MODEL_HIERARCHY.md` §4 antigravity entry — already updated this session with the routing + goal-substitution notes; confirm this plan's Task 3 orchestration never routes the PASS/FAIL call itself to agy.
- **Steps:**
  1. Document in the Task 3 script/skill header, explicitly: "grading is never delegated to agy — Rhea/Claude only." One-line comment, not a new doc.
- **Verify:** grep the Task 3 implementation for any agy/tmux dispatch inside the grading branch — should return nothing.
- **Status:** [ ] not started

---

## Open questions — RESOLVED (S382, research-build)

- [x] **Cadence** — manual/dispatched, per the plan's own recommendation (matches "don't build ahead of demonstrated need"). Cron later only if manual cadence proves too infrequent.
- [x] **Failed-lore retention** — local log only, never NotebookLM. Default confirmed as stated: NotebookLM has no post-ingestion review step, so the entire safety burden sits on the pre-ingestion gate.
- [x] **`--kind lore` vs. a separate script** — read `scripts/notebooklmPush.js`: `--cycle` is used only for the required-arg check (line 51-52), the title string (line 123), and the audio-branch focus/path naming (lines 143/150/238) — no structural logic depends on it. Extending with `--kind lore` (skip cycle requirement, alternate title format) is safe; no separate script needed.

Plan is unblocked. Dispatching Tasks 1-4 to engine-sheet for execution.

---

## Changelog

- 2026-08-17 — Initial draft (S377, research-build). Not yet executed — plan only, pending Mike's confirmation on the two open questions above.
- 2026-08-17 — Added the bay-tribune leg (Mike caught it): editions already dual-ingest to NotebookLM + bay-tribune via `/post-publish`; lore now mirrors that instead of NotebookLM-only.
- 2026-08-20 — All 3 open questions resolved by research-build (code read + plan's own stated defaults, no live Mike decision needed). Dispatched to engine-sheet.
