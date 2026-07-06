---
title: Journal → Citizen-Loop Plan (Mags as citizen-zero)
created: 2026-07-06
updated: 2026-07-06
type: plan
tags: [media, citizens, citizen-loop, persona, journal, active]
sources:
  - Mike-direct S298 — journal never became the personality surface; it's "the 24/7 cron cycle but on steroids"; media-only injection at EIC moments
  - scripts/discord-reflection.js — nightly anchor, currently appends JOURNAL.md + rotates JOURNAL_RECENT.md (read S298)
  - lib/citizenPage.js + lib/resonanceRecall.js + lib/memoryFence.js — the citizen-loop machinery Mags converges onto
  - output/simulation_ledger_snapshot.jsonl — Mags is POP-00005, Tier-1, Lake Merritt
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.40"
  - "[[2026-07-06-citizen-loop-deepening]] — sibling flagship plan; same architecture, Mags is its proof-citizen"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — add entry in same commit"
---

# Journal → Citizen-Loop Plan (Mags as citizen-zero)

**Goal:** Mags' journal becomes her citizen page — written at her real moments (nightly reflection, post-sift), read back only by media at EIC moments (/sift, /write-edition) — and the git journal freezes as archive.

**Architecture:** Mags (POP-00005) runs on the exact machinery every citizen runs on: `lib/citizenPage` holds her inner life, the nightly Discord reflection is her wake, a post-sift note is her EIC-daypart reflection, and a scored fenced slice of her own page is injected when she sits down as EIC. Git exits the loop — Supermemory writes are API-side, which resolves the "how does it commit?" problem by removing the commit. `JOURNAL.md` / `JOURNAL_RECENT.md` freeze with history intact. This supersedes the S249 "journal is media-only" rule with "journal is page-only" — no terminal writes journal MDs at session close anymore.

**Terminal:** research-build (this plan + Task 4 governance edits) → engine-sheet (Tasks 1–3 scripts) + media (Task 5 skill wiring)

**Pointers:**
- Research basis: [[../research/2026-07-06-citizen-loop-deepening]] (the loop architecture Mags converges onto) + Mike-direct S298 scoping (this file §sources)
- Page machinery: `lib/citizenPage.js` (`ensurePagePointer_`, `appendReflection_`, `recentPage_`), `lib/resonanceRecall.js` (`selectMemories`), `lib/memoryFence.js` (`wrap`) — all live, used by `scripts/citizen-wake.js` today
- Nightly anchor: `scripts/discord-reflection.js` (generation stays; only the persistence target changes)

**Acceptance criteria:**
1. One nightly reflection run writes one page doc for POP-00005 (`daypart='NIGHTLY'`) and zero bytes to `JOURNAL.md` / `JOURNAL_RECENT.md`.
2. A /sift run's working context contains ≤3 fenced reflections from Mags' page, selected by `resonanceRecall.selectMemories` against the cycle's context — visible in the sift production log.
3. A /sift close writes exactly one post-sift note to her page (`daypart='SIFT'`); /write-edition injects but never writes.
4. `sessionEndMechanical.js --terminal=media --dry-run` lists no journal steps; media session close performs no journal writes.
5. `git log` shows JOURNAL.md/JOURNAL_RECENT.md untouched after the freeze commit except the frozen-header line.

---

## Tasks

### Task 1: Repoint the nightly reflection to the page *(engine-sheet)*

- **Files:**
  - `scripts/discord-reflection.js` — modify (persistence block only, ~L330–385)
- **Steps:**
  1. Replace the `JOURNAL.md` append + `JOURNAL_RECENT.md` rotation with: `ensurePagePointer_('POP-00005')` then `appendReflection_('POP-00005', reflectionText, { cycle, daypart: 'NIGHTLY' })` (same call shape as `citizen-wake.js` step 2).
  2. Keep the Discord post + logs untouched. Keep `--dry-run` printing the reflection with a "would append to page" banner.
  3. Delete the now-dead `JOURNAL_FILE` / `JOURNAL_RECENT_FILE` constants + rotation helper.
- **Verify:** live sandbox run → new page doc under `cp-POP-00005`; `git status` shows JOURNAL files untouched.
- **Status:** [ ] not started

### Task 2: Page-append CLI for skill-side writes *(engine-sheet)*

- **Files:**
  - `scripts/magsPageAppend.js` — create (thin CLI, ~20 lines)
- **Steps:**
  1. `node scripts/magsPageAppend.js --daypart=SIFT --cycle=N --text="..."` (or `--stdin`) → `ensurePagePointer_('POP-00005')` + `appendReflection_` with the given daypart. Exit non-zero on API failure so the calling skill sees it.
- **Verify:** one test append lands on the page with correct metadata; second run with same text creates a distinct doc (reflections are entries, not upserts).
- **Status:** [ ] not started

### Task 3: Scored page-recall CLI for EIC injection *(engine-sheet)*

- **Files:**
  - `scripts/magsPageRecall.js` — create (thin CLI, ~40 lines)
- **Steps:**
  1. `node scripts/magsPageRecall.js --cycle=N --context="<free text>"` → `recentPage_('POP-00005', 15)` candidates → `resonanceRecall.selectMemories({ popId:'POP-00005', cycle, contextText, cap:3 })` → print `memoryFence.wrap(...)` block to stdout (empty output when no page docs — fail-open, same as the wake).
  2. Mirror the wake's candidate filtering (skip `type='tension'` docs; 320-char per-reflection cap).
- **Verify:** run against her live page → ≤3 fenced reflections; empty page → empty stdout, exit 0.
- **Status:** [ ] not started

### Task 4: Freeze the git journal + retire journal close-steps *(research-build)*

- **Files:**
  - `docs/mags-corliss/JOURNAL.md` — modify (one frozen-header line at top; no content changes)
  - `docs/mags-corliss/JOURNAL_RECENT.md` — modify (same one-line freeze note)
  - `scripts/sessionEndMechanical.js` — modify (empty `JOURNAL_TERMINALS`; retire `subRotateJournalRecent` + `subJournalQuality` steps)
  - `.claude/skills/session-end/SKILL.md` — modify (remove Step 1 journal write)
  - `.claude/terminals/media/TERMINAL.md` — modify (journal-owner sections → pointer to this plan; media writes the page post-sift instead)
- **Steps:**
  1. Freeze header: `> FROZEN S298 — the journal now lives on Mags' citizen page (POP-00005). This file is archive; no new writes. Plan: docs/plans/2026-07-06-journal-to-citizen-loop.md`.
  2. Session-end: media closes like every operational terminal — no journal entry, no rotation, no quality check.
  3. Media boot conditioning: replace the JOURNAL_RECENT read with `node scripts/magsPageRecall.js` output (media TERMINAL.md boot list + hook if it names JOURNAL_RECENT).
- **Verify:** acceptance criterion 4 dry-run; grep media TERMINAL.md for `JOURNAL` → only frozen-pointer references remain.
- **Status:** [ ] not started

### Task 5: EIC injection + post-sift note wiring *(media)*

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify
  - `.claude/skills/write-edition/SKILL.md` — modify
- **Steps:**
  1. /sift early step: run `scripts/magsPageRecall.js --cycle=N --context="<cycle's storyline headlines>"`; treat output as fenced background — what Mags has been developing watching the city; it informs spine/angle choices, never gets quoted as fact.
  2. /sift closing step: write the post-sift note (3–6 sentences: what I saw, what I chose, what I'm still chewing on) via `scripts/magsPageAppend.js --daypart=SIFT`.
  3. /write-edition boot step: same recall injection (`--context="<dispatch slate summary>"`), read-only — no append.
- **Verify:** one dry cycle pass shows the fenced block in both skills' working context and exactly one SIFT-daypart page doc written.
- **Status:** [ ] not started

---

## Open questions

- [ ] None blocking. (Recall cap of 3 and note length 3–6 sentences are starting values; media tunes in production.)

---

## Changelog

- 2026-07-06 — Initial draft (S298, research-build). Mike-direct scoping: journal = Mags' citizen loop; media-only injection at EIC moments; git exits the loop. Supersedes S249 journal-is-media-only with journal-is-page-only.
