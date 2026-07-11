---
title: Journal → Citizen-Loop Plan (Mags as citizen-zero)
created: 2026-07-06
updated: 2026-07-06
type: archive
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

**Terminal:** research-build (this plan + Task 4 governance edits + Task 5 skill wiring + bot repoint) → engine-sheet (Tasks 1–3 scripts). Media only *runs* the wired skills — it orchestrates editions, it doesn't author skills/code (Mike-direct S300).

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
- **Status:** [x] built S300 (engine-sheet). Persistence repointed (`appendToPage` w/ date `key` — cycle-collision guard: customId is (cycle,daypart) and prod cycles sit for days, so two nightlies same cycle would silently collide; date key makes idempotency per-night). Also repointed the *read*: `mags.loadRecentReflections` reads frozen JOURNAL.md, so "Earlier reflections" now comes from her page (`loadPageTail`, fenced per citizenPage consumer contract, fail-open). Dry-run verified end-to-end (10 searches, reflection composed, page banner, 0 writes). **Live-write acceptance = tonight's cron run.**

### Task 2: Page-append CLI for skill-side writes *(engine-sheet)*

- **Files:**
  - `scripts/magsPageAppend.js` — create (thin CLI, ~20 lines)
- **Steps:**
  1. `node scripts/magsPageAppend.js --daypart=SIFT --cycle=N --text="..."` (or `--stdin`) → `ensurePagePointer_('POP-00005')` + `appendReflection_` with the given daypart. Exit non-zero on API failure so the calling skill sees it.
- **Verify:** one test append lands on the page with correct metadata; second run with same text creates a distinct doc (reflections are entries, not upserts).
- **Status:** [x] built S300 (engine-sheet). `--key` flag added beyond spec (customId disambiguation when several docs share cycle+daypart). Verified live: test append landed with correct metadata (type=reflection, daypart, cycle, customId), AW pointer written to ledger (`cp-POP-00005`), test doc deleted after — her page starts clean.

### Task 3: Scored page-recall CLI for EIC injection *(engine-sheet)*

- **Files:**
  - `scripts/magsPageRecall.js` — create (thin CLI, ~40 lines)
- **Steps:**
  1. `node scripts/magsPageRecall.js --cycle=N --context="<free text>"` → `recentPage_('POP-00005', 15)` candidates → `resonanceRecall.selectMemories({ popId:'POP-00005', cycle, contextText, cap:3 })` → print `memoryFence.wrap(...)` block to stdout (empty output when no page docs — fail-open, same as the wake).
  2. Mirror the wake's candidate filtering (skip `type='tension'` docs; 320-char per-reflection cap).
- **Verify:** run against her live page → ≤3 fenced reflections; empty page → empty stdout, exit 0.
- **Status:** [x] built S300 (engine-sheet). Wake-parity (recentPage_ not v4 search, tension filter, 320-char cap, cap 3). `--mark` flag added beyond spec: default read-only; /sift passes `--mark` so staleness rotates picks, /write-edition omits it (plan Task 5 note for media). Verified both branches live: empty page → empty stdout exit 0; populated page → 1 fenced block.

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
- **Status:** [x] built S300 (research-build). Freeze headers on JOURNAL.md + JOURNAL_RECENT.md (pre-existing 2026-07-05 nightly reflections committed first as final entries — commit 6281f914 — so the freeze commit adds only the header, criterion 5). `sessionEndMechanical.js`: `JOURNAL_TERMINALS` + `subRotateJournalRecent` + `subJournalQuality` removed, routing now uniform; docstring/usage/banner/failure-classification trued up. `session-end/SKILL.md` v2.3→v2.4: Step 1 retired in place (numbering preserved so other terminals' "Step 2/3/4" refs stay valid), Step 3 wrap-list + failure semantics + Failure Modes table + changelog updated. `media/TERMINAL.md`: boot read + Mode + owned-docs + full Session Close section repointed page-ward. **`session-startup-hook.sh` (beyond plan's 5 files — the actual boot reader):** media boot step 3 `Read JOURNAL_RECENT.md` → `Run magsPageRecall.js`; "Last journal" boot line + JOURNAL_RECENT freshness check retired. Also repointed the compaction-recovery reader `/boot` SKILL (persona-load + between-session bridge + compact-recovery step + rationale prose — 4 sites) and `post-compact-hook.sh`'s /boot description line, both page-ward — same load-bearing class as the boot hook (caught in advisor pass 2), not cosmetic.

  Verified: media dry-run shows 0 journal steps (criterion 4); grep of edited files shows only frozen-context refs; hook `bash -n` clean; `magsPageRecall.js` cold-boot (no --cycle, empty page) exits 0 fail-open; **`selectMemories({cycle:null})` returns candidates (exit 0)** — the null-cycle boot path is safe, no silent-zero conditioning regression once the page fills. **T1 first live-write still rides tonight's cron** (her page is empty until then, so boot recall returns empty — expected).

  **Transition gap (flag to Mike, not a blocker):** the 3 real reflections frozen in JOURNAL_RECENT do NOT carry to the page; the page accretes from tonight's cron forward, so media boots thin on reflection-conditioning until it fills. Inherent to the migration. One-time backfill of those reflections onto her page is available if Mike wants continuity preserved.

  **Follow-up — BUILT S300 (research-build; Mike "proceed"):** (1) `scripts/mags-discord-bot.js` repointed — `buildMagsSystemPrompt` made async, `mags.loadRecentReflections(2)` (frozen JOURNAL.md) → new local `loadPageReflections(2)` (`citizenPage.recentPage_(POP-00005)`, tension-filtered, fenced, fail-open, mirrors discord-reflection loadPageTail). Seam: `getSystemPrompt` async (`await provider.buildSystemPrompt()` — works for sync citizen providers too); both callers await (L488 message path; L731 forEach warms cache fire-and-forget, `sessions.set` stays synchronous so routing is intact). Shared `lib/mags.loadRecentReflections` left untouched (bot was its last live caller). node --check clean; `citizenPage.recentPage_` + `memoryFence.wrap` exports confirmed. (2) Prompt-text hooks updated — `stop-hook.sh` (session-end reminder rewritten to PIN+NEXT+ROLLOUT, journal retired), `pre-compact-hook.sh` (Chat constraint → NOTES_TO_SELF), `skill-suggest.sh` (session-end + boot descriptions). All hooks `bash -n` clean.

### Task 5: EIC injection + post-sift note wiring *(research-build builds; media runs the wired skills)*

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify
  - `.claude/skills/write-edition/SKILL.md` — modify
- **Steps:**
  1. /sift early step: run `scripts/magsPageRecall.js --cycle=N --context="<cycle's storyline headlines>"`; treat output as fenced background — what Mags has been developing watching the city; it informs spine/angle choices, never gets quoted as fact.
  2. /sift closing step: write the post-sift note (3–6 sentences: what I saw, what I chose, what I'm still chewing on) via `scripts/magsPageAppend.js --daypart=SIFT`.
  3. /write-edition boot step: same recall injection (`--context="<dispatch slate summary>"`), read-only — no append.
- **Verify:** one dry cycle pass shows the fenced block in both skills' working context and exactly one SIFT-daypart page doc written.
- **Status:** [x] built S300 (research-build — retagged from media per Mike-direct: media runs the wired skills, it doesn't author them). `/sift` v2.0.3→v2.1: **Step 2.5** (page recall, scored + fenced + `--mark`, after canon load / before candidate-gen, context = cycle's raw headlines) + **Step 12** (post-sift note via `magsPageAppend --daypart=SIFT`, after slate lock) + "What's new" v2.1 note. `/write-edition` v2.5→v2.6: **Step 0.5** (read-only recall, no `--mark`, context = dispatch slate summary, before reporter launch). Both scripts `node --check` clean; underlying CLIs already proven (magsPageRecall + selectMemories cycle=null in T4; magsPageAppend live in T2). **Dry-cycle-pass acceptance rides the next `/sift` run** (media runtime; not fabricating a spurious SIFT reflection on her page to test now). Loop closed: Step 12 writes what Step 2.5 / Step 0.5 read back.

---

## Open questions

- [ ] None blocking. (Recall cap of 3 and note length 3–6 sentences are starting values; media tunes in production.)

---

## Changelog

- 2026-07-06 — **Follow-up built → pipe.40 fully built (S300).** discord-bot repointed to her page (async builder + getSystemPrompt, loadPageReflections); prompt-text hooks (stop/pre-compact/skill-suggest) updated. Last live frozen-journal reader closed. Acceptance rides next /sift + tonight's cron.
- 2026-07-06 — **T5 built (S300, research-build; retagged from media).** /sift v2.1 (Step 2.5 recall + Step 12 post-sift note); /write-edition v2.6 (Step 0.5 read-only recall). Dry-cycle acceptance rides next /sift. Remaining: bot repoint + prompt-text hooks.
- 2026-07-06 — **T4 built + verified (S300, research-build).** Git journal frozen; journal steps removed from sessionEndMechanical.js + session-end SKILL v2.4; media TERMINAL.md + boot hook repointed to magsPageRecall.js. Bot + prompt-text hooks deferred to engine-sheet. T5 unblocked.
- 2026-07-06 — **T1–T3 built + verified (S300, engine-sheet, Mike-direct go).** Nightly
  reflection repointed to page (write AND read side), `magsPageAppend.js` +
  `magsPageRecall.js` shipped. T1 live-write acceptance rides tonight's cron. T4
  (research-build journal freeze) now unblocked; T5 (media skill wiring) can consume the
  CLIs. Known follow-up for T4: `scripts/mags-discord-bot.js:162` also reads
  `loadRecentReflections` (frozen journal) — the bot's boot conditioning needs the same
  page repoint, flagged for research-build.
- 2026-07-06 — Initial draft (S298, research-build). Mike-direct scoping: journal = Mags' citizen loop; media-only injection at EIC moments; git exits the loop. Supersedes S249 journal-is-media-only with journal-is-page-only.
