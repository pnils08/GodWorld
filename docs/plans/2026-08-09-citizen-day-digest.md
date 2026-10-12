---
title: Citizen Day Digest — daily people-slice for the 8am listening drop Plan
created: 2026-08-09
updated: 2026-08-09
type: plan
tags: [media, citizens, notebooklm, active]
sources:
  - Mike listener directives 2026-08-09 (via NEXT[kimi], commit 4af31b4a): "he is a LISTENER — NotebookLM audio only, no dashboard/reading; civic stories are skipped, keep them out of his feed; content target is citizens-as-people at 'where did Vinnie eat dinner' granularity"
  - Mike design pick 2026-08-09: digest feeds BOTH the written daily brief and the audio overview
  - scripts/buildCitizenWeekDigest.js (commit 990d0ac0) — the weekly sibling, shipped S361
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — row pipeline.53"
  - "[[2026-08-04-newsroom-canon-flow]] — pipeline.45 Saturday compile (weekly digest attaches there)"
  - "[[../research/2026-08-07-notebooklm-audio-overview-direction]] — pipeline.51 audio-direction pattern"
---

# Citizen Day Digest — daily people-slice for the 8am listening drop Plan

**Goal:** Mike's daily 8am NotebookLM news drop carries a citizens-as-people slice — verbatim citizen reflections, conversations, and life texture from the last 24h — in both the written brief and the audio overview.

**Architecture:** Extend `scripts/buildCitizenWeekDigest.js` (read-only, deterministic, verbatim-only) with a `--daily` mode and an exported `buildDigest()`; `scripts/notebooklmDailyNews.js` builds the day digest at run start (non-blocking on failure) and folds it into the bounded newsroom source that both the written-brief query and the audio create already read. The digest text joins the source-pack hash input so a reflections-only change busts the no-op cache instead of skipping the run.

**Terminal:** kimi builds Tasks 2–4 (scripts/** writable scope). Engine-sheet lands Task 5 (config/audio_direction_daily.md is gated configuration).

**Pointers:**
- Prior work: `scripts/buildCitizenWeekDigest.js` — selection/scoring/composition this plan reuses
- Consumer: `scripts/notebooklmDailyNews.js` — daily 08:00 cron, bounded-source contract (NOT CANON listening artifact)
- Weekly attachment point: [[2026-08-04-newsroom-canon-flow]] (Saturday compile)

**Acceptance criteria:**
1. `node scripts/buildCitizenWeekDigest.js --daily` writes `output/citizen-day-digest.md`: 24h window, ~5 vignettes, verbatim first-person excerpts, nothing generated; running it twice in a row is deterministic modulo live sheet drift.
2. `node scripts/notebooklmDailyNews.js --dry-run` completes with the digest present as a section in the bounded source, and the pack hash input includes the digest text (reflections-only change = fresh run, not a no-op).
3. If the digest build throws, the daily run logs a skip line and proceeds exactly as today (non-blocking contract preserved — main() already exits 0 on failure).
4. `node --check` clean on both touched scripts; exported pure functions (`buildSourcePack`, `buildBoundedNewsSource`) keep their existing call signatures for any current importer.

---

## Tasks

### Task 1: File plan + rollout row + index entry

- **Files:**
  - `docs/plans/2026-08-09-citizen-day-digest.md` — create (this file)
  - `docs/engine/ROLLOUT_PLAN.md` — add row pipeline.53
  - `docs/index.md` — register the plan in the same commit
- **Verify:** `node scripts/docLoopStatus.js --lint` → `ROLLOUT LINT: clean`
- **Status:** [x] done (2026-08-09, kimi) — lint clean; row pipeline.53 + index entry filed.

### Task 2: Daily mode in the citizen digest builder

- **Files:**
  - `scripts/buildCitizenWeekDigest.js` — modify
- **Steps:**
  1. Wrap the auto-run in `if (require.main === module)` and export a `buildDigest(opts)` async (same pattern as `notebooklmDailyNews.js` exports).
  2. Add `--daily` flag: `days=1`, `vignettes=5`, default out `output/citizen-day-digest.md`, header `# Today in Oakland — told by its people`, intro/footer wording adjusted from weekly to daily.
  3. Selection/scoring unchanged except vignette count — the ranking already favors conversations, affect, life events, and low tiers, which is the people-granularity Mike asked for.
  4. Keep the script read-only: no new writes anywhere but the output md.
- **Verify:** `node --check scripts/buildCitizenWeekDigest.js` clean; `node scripts/buildCitizenWeekDigest.js` (no flags) still emits the weekly doc unchanged in shape.
- **Status:** [x] done (2026-08-09, kimi) — `--daily` mode + exported `buildDigest()` with `require.main` guard. Live run: 5 vignettes / 5 reflections / 0 life events in 24h → `output/citizen-day-digest.md`. **Fix folded in:** CONVO partner attribution now pairs reflections by nearest timestamp (exchange runs write both participants seconds apart); the old first-active-bond guess named the wrong person on air (Victor Alize shown "talking with Dimas Wong" while quoting a conversation with Elliot Marbury — verified corrected on re-run).

### Task 3: Fold the digest into notebooklmDailyNews.js

- **Files:**
  - `scripts/notebooklmDailyNews.js` — modify
- **Steps:**
  1. At run start (after world-summary load, before `buildSourcePack`), call `buildDigest({ daily: true })` inside try/catch; on failure log `CITIZEN DAY DIGEST SKIPPED (non-blocking): <msg>` and continue with `digestText = null` (mirrors the audio-direction-guide skip pattern at line ~631).
  2. `buildSourcePack`: include `citizenDigest` in the hash input and, when present, append a `## The people, in their own words — daily citizen digest` section after the world-summary section with the same NOT-CANON framing as the rest of the pack.
  3. `buildBoundedNewsSource`: add the same digest section between "Today's city record" and "Bay Tribune newsroom reports" so the written brief query and audio create both read it (Mike pick 2026-08-09).
  4. Bump `SOURCE_VERSION` 1.5 → 1.6 (source shape changed; the version gates `isCompletedManifest`, so this also flushes stale completed manifests honestly).
- **Verify:** `node --check scripts/notebooklmDailyNews.js` clean; `--dry-run` output shows the digest section in `source-pack.md` and `bounded-newsroom-source.md` under the run dir.
- **Status:** [x] done (2026-08-09, kimi) — digest in hash input + both source builders (bounded-source section only verifiable in non-dry-run path; covered by unit test instead). `SOURCE_VERSION` 1.5→1.6. `scripts/notebooklmDailyNews.test.js` PASS incl. new assertions: digest perturbs pack hash, digest section precedes newsroom reports. Live dry-run: pack dir `output/notebooklm/daily/c102/165c40898744/` — fresh hash vs all prior runs, digest section at source-pack.md:444, manifest carries `citizenDigest`.

### Task 4: Validate live (read-only Sheets)

- **Steps:**
  1. With Mike's approval (script contacts Sheets read-only): `node scripts/buildCitizenWeekDigest.js --daily` → inspect `output/citizen-day-digest.md` for verbatim-only content and sane selection.
  2. `node scripts/notebooklmDailyNews.js --dry-run` → confirm digest section lands in both pack and bounded source; confirm a second `--dry-run` is a no-op only when nothing changed.
- **Verify:** acceptance criteria 1–3.
- **Status:** [x] done (2026-08-09, kimi, Sheets read approved by Mike) — `--daily` live run clean (deterministic selection, verbatim excerpts); `--dry-run` clean; no-op gate preserved (hash only perturbed when content changes).

### Task 5: Propose audio-direction rebalance (engine-sheet lands)

- **Files:**
  - `config/audio_direction_daily.md` — PROPOSED diff only (gated configuration, outside kimi writable scope)
- **Steps:**
  1. Propose thematic-allocation rebalance per Mike's listener directives: Citizens & neighborhoods up (40% → 60%), city record down (40% → 20%), connections 20% unchanged; add a directive line that the daily citizen digest section is the people-spine of the show.
  2. Hand the diff to engine-sheet (or land it here only if Mike explicitly grants config scope).
- **Verify:** engine-sheet confirms landing; next daily audio reflects the allocation.
- **Status:** [ ] proposal written — **owner: engine-sheet (kimi proposed)**. Exact diff at `output/kimi/citizen-day-digest/audio-direction-daily-proposal.md` (city record 40%→20% background-only, citizens 40%→60% spine, digest-first directive).

---

## Open questions

- [x] Digest feeds written brief too, or audio only? — **ANSWERED by Mike 2026-08-09: both.**

## Changelog

- 2026-08-09 (kimi) — Initial draft on Mike's direction ("the daily version to attach to the daily news drop"), per his listener directives carried in NEXT[kimi] at commit 4af31b4a. Design pick (digest feeds written + audio) confirmed same session.
- 2026-08-09 (kimi) — Tasks 1–4 shipped: `--daily` mode + `buildDigest()` export, timestamp-paired CONVO attribution fix, notebooklmDailyNews wiring (hash + both sources, SOURCE_VERSION 1.6, non-blocking skip), unit tests extended + PASS, live dry-run validated. Task 5 config rebalance proposed at `output/kimi/citizen-day-digest/audio-direction-daily-proposal.md` — engine-sheet lands.
