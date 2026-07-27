---
title: Compile-Layer Rebuild Plan (engine.76)
created: 2026-07-26
updated: 2026-07-26
type: plan
tags: [engine, pipeline, compile, active]
sources:
  - docs/engine/archive/ROLLOUT_PLAN.md — engine.76 row
  - docs/engine/archive/ENGINE_REPAIR.md §engine.76 — the S328/S329/S332 narrative this plan replaces as the row's home
  - claude-mem S328 (Mike's original 4-consumer design), S329 (W5 definition), S332 (W5 half 1 ship)
pointers:
  - "[[../engine/archive/ROLLOUT_PLAN]] — parent rollout (engine.76)"
  - "[[../engine/archive/ENGINE_REPAIR]] §engine.76 — prior narrative, kept for trail"
  - "[[2026-07-20-headless-newsroom-pipeline]] — research.25; its Phase 2 daily writer-wakes consume W5's signal partition"
  - "[[../research/2026-07-11-desk-slice-fork]] — pipeline.44; the fork W5 feeds and W4 waits on"
  - "[[SCHEMA]] — doc conventions"
  - "[[../index]] — registered same commit"
---

# Compile-Layer Rebuild Plan (engine.76)

**Goal:** Finish the compile layer — ship the byline candidate + rotation half of W5 so the engine assists WHO writes each piece, then consolidate the two coexisting pipeline stacks once the fork has proven itself.

**Architecture:** The cycle's compile step emits deterministic artifacts, one per consumer (media = `world_summary`, cron = `world_state.json`, civic = initiative packets, audit = JSONs). W1–W3 shipped those four. W5 splits into two halves: half 1 (shipped) partitions the cycle's signal by desk lane as pointers; half 2 (open) adds a per-beat byline candidate drawn from the canonical 31-name staff roster with usage-weighted rotation. W4 (open, gated) retires the old desk-packet stack after the fork proves — as a side skill built alongside, never by repurposing in-use pipeline files.

**Terminal:** Design research-build → build engine-sheet.

**Pointers:**
- Signal-partition writer (W5 half 1, shipped): `scripts/buildWorldSummary.js` v2.1.0 — emits `output/desk_signal_c{N}.json` as a sibling; `world_state` carries a `deskSignal` pointer
- Staff roster: `Bay_Tribune_Oakland` sheet tab, 31 POPID-linked staff; reader is `scripts/engine-auditor/bayTribuneRoster.js`
- Beat map: `.claude/agents/REPORTER_DESK_INDEX.md` + the per-reporter voice files
- Rotation history: `output/byline_shadow_log_c{N}.json` (one per cycle)
- Live WHO-assist seam: `phase07-evening-media/buildContractSeeds.js` → `suggestStoryAngle_` (see Open questions — the v3/v4 seam)
- Fork consumer: `/desk-slice` reads the desk-lane partition

**The locked rule (Mike-direct S329):** the engine assists **WHO writes**, never **WHAT**. Stories and angles stay desk-side. The charge rule holds — pointers, never pre-assembled data.

**Acceptance criteria:**
1. A cycle run emits a per-beat byline candidate for each desk lane, drawn only from the `Bay_Tribune_Oakland` roster, with the candidate's POPID resolved.
2. Across three consecutive cycles the candidate set rotates — a journalist used in cycle N is penalised in N+1, and the count of never-routed staff falls from its current ~14.
3. `byline_shadow_log_c{N}.json` shows a non-zero engine-suggested rate (C101 baseline: 8/8 `engine_silent`, i.e. assignments were pure habit).
4. No story, angle, or subject is emitted by the engine — only a name per beat. A run that emits an angle fails this plan.
5. W4 only: the side skill produces a desk slice end-to-end without any in-use pipeline file being modified, and the old stack still runs unchanged alongside it.

---

## Tasks

### Task 1: Resolve the WHO-assist seam (blocks Task 2)

- **Files:**
  - `phase07-evening-media/buildContractSeeds.js` — read
  - `phase10-persistence/saveV3Seeds.js` — read
- **Steps:**
  1. Trace which code path actually reaches the live v4 deck. research.25 recorded a stale-seam finding: the live WHO-assist is `buildContractSeeds`/`suggestStoryAngle_`, and the Engine B v3 path never reaches the v4 deck.
  2. Write the answer into this plan's Open questions section as resolved, naming the function that owns the candidate write.
- **Verify:** the named function appears in a cycle-run trace, not just in source
- **Status:** [x] DONE S336 — live-trace verified (C102 deck 36/36 hinted); resolution recorded in Open questions

### Task 2: Beat map — roster to desk lane

- **Files:**
  - `scripts/engine-auditor/bayTribuneRoster.js` — read
  - `.claude/agents/REPORTER_DESK_INDEX.md` — read
- **Steps:**
  1. Build the beat map: each of the 31 roster staff → one or more desk lanes, sourced from `REPORTER_DESK_INDEX.md` and the voice files. Editorial-desk seats are excluded from candidacy.
  2. Record which roster names have no beat — those are the never-routed staff the rotation is meant to reach.
- **Verify:** every one of the 31 roster rows is either mapped to a lane or explicitly listed as unmapped, with a reason
- **Status:** [x] DONE S336 — `buildLanePools()` in `bayTribuneRoster.js`: civic 7 / sports 6 / culture 8 / business 1 + 5 beat-agnostic generals + 4 unmapped non-writer seats (Mags, Rhea — masthead; Hartley, Gutierrez — photo) = 31/31 accounted. Never-routed vs C94–C101 logs: 15 writers (Farrah Del Rio, Mint Condition, Tanya Cruz, Simon Leary, Ariana Reyes, Elliot Graye, Angela Reyes, Noah Tan, Sharon Okafor, Mason Ortega, Celeste Tran, Lena Carrow, Dana Reeve, Reed Thompson, Elliot Marbury). Sports seats stay excluded from the city-seed pool but carry `lane:'sports'` for lane candidacy.

### Task 3: Usage-weighted candidate selection

- **Files:**
  - the function named in Task 1 — modify
- **Steps:**
  1. For each desk lane in the signal partition, select a candidate: beat match, weighted down by that journalist's usage count across the `byline_shadow_log_c{N}.json` history.
  2. Least-used breaks ties. Cap the usage penalty — an uncapped penalty produced a full blackout (35/35 blank) at C105 during the S329 rotation work; that regression is the known failure mode here.
  3. Emit the candidate as a name + POPID only. No angle, no subject, no story.
- **Verify:** bench-run three consecutive cycles → candidates rotate, no blank lanes, no angle field emitted
- **Status:** [x] DONE S336 — built in the COMPILE layer, not the deck path: `selectBylineCandidates` + `loadBylineUsage` in `buildWorldSummary.js` v2.2.0 (deskSignal v1.1), emitted as `bylineCandidates` in `desk_signal_c{N}.json`. Score = beat base 2 / general base 1 − recent-use penalty capped at 4 (C105 blackout guard); argmax always emits so lanes never blank; one name per cycle across lanes; ties → least-used, then name. Usage window = last 3 shadow logs, `finalAssignment` only (an overridden hint carries no penalty). Deck-side `suggestStoryAngle_` path untouched — it keeps its own S329–S331 in-deck rotation.

### Task 4: Prove rotation on the bench

- **Files:**
  - none — bench run only
- **Steps:**
  1. Run three consecutive bench cycles.
  2. Read `byline_shadow_log_c{N}.json` for each: confirm engine-suggested rate is non-zero and the candidate set changes cycle to cycle.
- **Verify:** never-routed count falls; zero blank lanes across all three cycles
- **Status:** [x] DONE S336 — bench C102→C104 (live roster, real C99–C101 usage seed, each cycle's candidates fed forward as adopted assignments): 12 distinct names across 3 cycles, zero repeats, zero blank lanes, zero angle fields; 10 of the 15 never-routed writers reached. Live end-to-end: `buildWorldSummary.js 102 --dry-run` emits 4/4 lane candidates with POPIDs, notes clean. Tests: buildWorldSummary.test.js 199/199 (Test 11f = W5h2 block), roster contract suites 54+27 green. Criterion 3 (shadow-log engine-suggested rate) closes at the next real /sift or writer-wake cycle — deck hints already 36/36 at C102.

### Task 5 (W4, GATED): two-stack consolidation side skill

**Gate: the fork must prove first (pipeline.44). Do not start this task before that.**

- **Files:**
  - a new side skill — path to be decided at gate time; explicitly NOT an edit to any in-use pipeline file
- **Steps:**
  1. Build the desk-slice-shaped side skill alongside the existing stack. Fork slices are a different shape from desk packets; do not repurpose the packet builders.
  2. Run both stacks in parallel for at least one cycle.
  3. Retire the old stack whole — only after the side skill fully proves. No partial retirement.
- **Verify:** both stacks produce output for the same cycle; the old stack is byte-unchanged
- **Status:** [ ] blocked — gated on fork proof

---

## Open questions

- [x] **RESOLVED (S336, live-trace verified):** the live candidate write is owned by `buildContractSeeds_` (`phase07-evening-media/buildContractSeeds.js`) → `contractSeedJournalist_` → `suggestStoryAngle_` (`utilities/rosterLookup.js:886`), persisted by `saveV3Seeds_` (`phase10-persistence/saveV3Seeds.js`) to Story_Seed_Deck col P. Live proof: C102 deck rows 36/36 carry SuggestedJournalist. Engine B (`applyStorySeeds_` → `utilities/bylineEngine.js` → `bylineCandidate` on `S.storySeeds`) also runs at Phase 7 in both entry blocks but `saveV3Seeds_` v4.0 persists only `S.contractSeeds` — the v3 deck write is retired, so `bylineCandidate` never reaches any sheet. C102 pre-cap baseline: Simon Leary 20/36 hints (ran before the S331 hint-cap deploy).
- [x] **RESOLVED (S336):** the candidate rides `desk_signal_c{N}.json` itself — a top-level `bylineCandidates` block beside `lanes`, plus a `meta.bylineContract` line. No sibling artifact (FIX-don't-ADD; one artifact per consumer holds). Rationale: the shadow-log usage history is Node-side fs, so the selection can only run in the compile layer — the Apps Script deck-hint path (`suggestStoryAngle_`) cannot read `output/*.json` and stays as-is for the /sift consumer.

---

## Changelog

- 2026-07-26 (S334) — Initial draft. Carries engine.76's open work (W5 half 2, W4); shipped-wave narrative stays in ENGINE_REPAIR §engine.76.
- 2026-07-26 (S336, engine-sheet) — W5 half 2 SHIPPED: Tasks 1–4 done (seam traced, lane pools, usage-weighted candidate emit in deskSignal v1.1, 3-cycle bench proof). Only W4 (fork-gated) remains; detail in task statuses.
